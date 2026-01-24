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

    async loadConfig() {
        if (!this.config) {
            const response = await fetch('config.json');
            this.config = await response.json();
        }
        return this.config;
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
            console.log('Using cached data for:', endpoint);
            return cached;
        }

        // Check rate limit (for local development)
        if (!this.useNetlifyFunction && !this.canMakeRequest()) {
            throw new Error(`Daily API limit reached (${this.maxRequests} requests). Resets tomorrow.`);
        }

        let response;
        
        if (this.useNetlifyFunction) {
            // Use Netlify Function (production)
            console.log('Using Netlify Function for:', endpoint);
            response = await fetch(`${this.baseURL}?endpoint=${encodeURIComponent(endpoint)}`);
        } else {
            // Direct API call (local development)
            if (!this.apiKey) {
                throw new Error('API key not set');
            }
            
            console.log('Direct API call for:', endpoint);
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
        
        console.log(`API request made. Remaining today: ${this.getRemainingRequests()}`);
        
        return data;
    }

    // Get today's matches for Premier League and Champions League
    async getTodaysMatches() {
        const today = new Date().toISOString().split('T')[0];
        
        console.log(`Fetching matches for date: ${today}`);
        
        // Remove season parameter - let API return current season automatically
        // Premier League ID: 39, Champions League ID: 2
        const [plMatches, clMatches] = await Promise.all([
            this.makeRequest(`/fixtures?league=39&date=${today}`),
            this.makeRequest(`/fixtures?league=2&date=${today}`)
        ]);

        console.log(`Premier League matches found: ${plMatches.response?.length || 0}`);
        console.log(`Champions League matches found: ${clMatches.response?.length || 0}`);
        console.log('PL Response:', plMatches);
        console.log('CL Response:', clMatches);
        
        return this.combineMatches(plMatches, clMatches);
    }

    // Get live matches
    async getLiveMatches() {
        const [plMatches, clMatches] = await Promise.all([
            this.makeRequest('/fixtures?league=39&live=all'),
            this.makeRequest('/fixtures?league=2&live=all')
        ]);

        return this.combineMatches(plMatches, clMatches);
    }

    // Get upcoming matches (next 7 days)
    async getUpcomingMatches() {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const fromDate = today.toISOString().split('T')[0];
        const toDate = nextWeek.toISOString().split('T')[0];

        console.log(`Fetching upcoming matches from ${fromDate} to ${toDate}`);

        // Remove season parameter - let API return current season automatically
        const [plMatches, clMatches] = await Promise.all([
            this.makeRequest(`/fixtures?league=39&from=${fromDate}&to=${toDate}`),
            this.makeRequest(`/fixtures?league=2&from=${fromDate}&to=${toDate}`)
        ]);

        console.log(`Premier League upcoming: ${plMatches.response?.length || 0}`);
        console.log(`Champions League upcoming: ${clMatches.response?.length || 0}`);

        return this.combineMatches(plMatches, clMatches);
    }

    combineMatches(plResponse, clResponse) {
        const matches = [];
        
        if (plResponse.response) {
            matches.push(...plResponse.response.map(m => this.formatMatch(m)));
        }
        
        if (clResponse.response) {
            matches.push(...clResponse.response.map(m => this.formatMatch(m)));
        }

        // Sort by date
        return matches.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    }

    formatMatch(apiMatch) {
        return {
            id: apiMatch.fixture.id,
            competition: apiMatch.league.name,
            homeTeam: apiMatch.teams.home.name,
            awayTeam: apiMatch.teams.away.name,
            homeLogo: apiMatch.teams.home.logo,
            awayLogo: apiMatch.teams.away.logo,
            homeScore: apiMatch.goals.home,
            awayScore: apiMatch.goals.away,
            status: apiMatch.fixture.status.short,
            statusLong: apiMatch.fixture.status.long,
            datetime: apiMatch.fixture.date,
            venue: apiMatch.fixture.venue.name,
            elapsed: apiMatch.fixture.status.elapsed
        };
    }

    async getStreamingInfo(competition) {
        await this.loadConfig();
        const rights = this.config.broadcastingRights[competition];
        
        if (!rights) {
            return null;
        }

        return {
            services: rights.services,
            urls: rights.urls || rights.url,
            serviceDetails: rights.services.map(name => 
                this.config.streamingServices[name]
            )
        };
    }
}

// Export for use in app.js
window.FootballAPI = FootballAPI;
