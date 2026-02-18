// API Integration Module for Football Data
class FootballAPI {
    constructor() {
        // Use Netlify Function instead of direct API calls
        this.useNetlifyFunction = window.location.hostname !== 'localhost' && 
                                   window.location.hostname !== '127.0.0.1';
        
        this.apiKey = localStorage.getItem('footballApiKey') || '';
        this.baseURL = this.useNetlifyFunction 
            ? '/.netlify/functions/football-api'
            : 'https://v3.football.api-sports.io';
        this.config = null;
        
        // Rate limiting (for local development)
        this.requestCount = parseInt(localStorage.getItem('apiRequestCount') || '0');
        this.requestDate = localStorage.getItem('apiRequestDate') || new Date().toDateString();
        this.maxRequests = 100;
        
        // Caching
        this.cache = {};
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        
        this.checkResetRequestCount();
    }

    checkResetRequestCount() {
        const today = new Date().toDateString();
        if (this.requestDate !== today) {
            this.requestCount = 0;
            this.requestDate = today;
            localStorage.setItem('apiRequestCount', '0');
            localStorage.setItem('apiRequestDate', today);
        }
    }

    canMakeRequest() {
        if (this.useNetlifyFunction) return true; // Function handles its own rate limiting
        return this.requestCount < this.maxRequests;
    }

    getRemainingRequests() {
        if (this.useNetlifyFunction) return 20; // Show function's per-IP limit
        return this.maxRequests - this.requestCount;
    }

    incrementRequestCount() {
        if (!this.useNetlifyFunction) {
            this.requestCount++;
            localStorage.setItem('apiRequestCount', this.requestCount.toString());
        }
    }

    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('footballApiKey', key);
    }

    hasApiKey() {
        // If using Netlify function, key not needed on client
        if (this.useNetlifyFunction) return true;
        return this.apiKey !== '';
    }

    getCacheInfo() {
        const info = {};
        for (const key in this.cache) {
            const cached = this.cache[key];
            const age = Math.floor((Date.now() - cached.timestamp) / 1000);
            info[key] = {
                isValid: Date.now() - cached.timestamp < this.cacheExpiry,
                age: age
            };
        }
        return info;
    }

    getCacheKey(endpoint) {
        return `cache_${endpoint}`;
    }

    getFromCache(endpoint) {
        const cacheKey = this.getCacheKey(endpoint);
        const cached = this.cache[cacheKey];
        
        if (!cached) return null;
        
        const now = Date.now();
        if (now - cached.timestamp > this.cacheExpiry) {
            delete this.cache[cacheKey];
            return null;
        }
        
        return cached.data;
    }

    setCache(endpoint, data) {
        const cacheKey = this.getCacheKey(endpoint);
        this.cache[cacheKey] = {
            data: data,
            timestamp: Date.now()
        };
    }

    async makeRequest(endpoint) {
        // Check cache first
        const cached = this.getFromCache(endpoint);
        if (cached) {
            return cached;
        }

        // Check rate limit (for local development)
        if (!this.useNetlifyFunction && !this.canMakeRequest()) {
            throw new Error(`Daily API limit reached (${this.maxRequests} requests). Resets tomorrow.`);
        }

        let response;
        
        if (this.useNetlifyFunction) {
            // Use Netlify Function (production)
            response = await fetch(`${this.baseURL}?endpoint=${encodeURIComponent(endpoint)}`);
        } else {
            // Direct API call (local development)
            if (!this.apiKey) {
                throw new Error('API key not set');
            }
            
            response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: {
                    'x-apisports-key': this.apiKey
                }
            });
        }

        if (!response.ok) {
            if (response.status === 429) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Rate limit exceeded. Please try again later.');
            }
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        
        // Handle error responses
        if (data.error) {
            throw new Error(data.message || data.error);
        }
        
        // Increment counter and cache result
        this.incrementRequestCount();
        this.setCache(endpoint, data);
        
        return data;
    }

    // Get today's matches - fetch ALL and filter client-side
    async getTodaysMatches() {
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch football, NFL games, and broadcaster info in parallel
        const [footballMatches, nflGames, plBroadcasters, clBroadcasters] = await Promise.all([
            this.makeRequest(`/fixtures?date=${today}`),
            this.makeRequest(`/nfl/games?date=${today}`),
            this.getBroadcasters('Premier League', today),
            this.getBroadcasters('UEFA Champions League', today)
        ]);
        
        console.log('Broadcaster data from scraping:', { plBroadcasters, clBroadcasters });
        
        // Combine broadcaster data
        const broadcasterMap = { ...plBroadcasters, ...clBroadcasters };
        
        // Filter football for Premier League (39) and Champions League (2)
        const filteredFootball = (footballMatches.response || []).filter(match => {
            const leagueId = match.league?.id;
            return leagueId === 39 || leagueId === 2;
        });
        
        // Format and combine all matches with broadcaster info
        const formattedFootball = filteredFootball.map(m => this.formatMatch(m, broadcasterMap));
        const formattedNFL = (nflGames.response || []).map(g => this.formatNFLGame(g));
        
        return [...formattedFootball, ...formattedNFL];
    }

    async getBroadcasters(competition, date) {
        try {
            const url = this.useNetlifyFunction
                ? `/.netlify/functions/broadcaster-scraper?competition=${encodeURIComponent(competition)}&date=${date}`
                : null;
            
            if (!url) return {};
            
            const response = await fetch(url);
            if (!response.ok) return {};
            
            const data = await response.json();
            return data.broadcasters || {};
        } catch (error) {
            console.error('Error fetching broadcasters:', error);
            return {};
        }
    }

    createMatchKey(homeTeam, awayTeam) {
        // Normalize team names for matching
        const normalize = (name) => name
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[.-]/g, '');
        
        return `${normalize(homeTeam)}-${normalize(awayTeam)}`;
    }

    formatMatch(apiMatch, broadcasterMap = {}) {
        const homeTeam = apiMatch.teams.home.name;
        const awayTeam = apiMatch.teams.away.name;
        const matchKey = this.createMatchKey(homeTeam, awayTeam);
        
        // Get broadcaster from map if available
        const broadcasterInfo = broadcasterMap[matchKey];
        
        console.log('Formatting match:', { homeTeam, awayTeam, matchKey, broadcasterInfo, hasMap: Object.keys(broadcasterMap).length });
        
        return {
            id: apiMatch.fixture.id,
            competition: apiMatch.league.name,
            homeTeam,
            awayTeam,
            homeLogo: apiMatch.teams.home.logo,
            awayLogo: apiMatch.teams.away.logo,
            homeScore: apiMatch.goals.home,
            awayScore: apiMatch.goals.away,
            status: apiMatch.fixture.status.short,
            statusLong: apiMatch.fixture.status.long,
            datetime: apiMatch.fixture.date,
            venue: apiMatch.fixture.venue.name,
            elapsed: apiMatch.fixture.status.elapsed,
            broadcaster: broadcasterInfo?.broadcaster || null
        };
    }


    formatNFLGame(apiGame) {
        // Combine date and time from NFL API (time is in UTC)
        let datetime;
        if (apiGame.game.date?.time) {
            // Combine date + time and add 'Z' to indicate UTC
            datetime = `${apiGame.game.date.date}T${apiGame.game.date.time}:00Z`;
        } else {
            // Fallback if no time available
            datetime = apiGame.game.date?.date || apiGame.game.date;
        }
        
        return {
            id: apiGame.game.id,
            competition: 'NFL',
            homeTeam: apiGame.teams.home.name,
            awayTeam: apiGame.teams.away.name,
            homeLogo: apiGame.teams.home.logo,
            awayLogo: apiGame.teams.away.logo,
            homeScore: apiGame.scores.home.total,
            awayScore: apiGame.scores.away.total,
            status: apiGame.game.status.short,
            statusLong: apiGame.game.status.long,
            datetime: datetime,
            venue: apiGame.game.venue?.name,
            elapsed: null // NFL doesn't have elapsed time in same format
        };
    }
}

// Export for use in app.js
window.FootballAPI = FootballAPI;
