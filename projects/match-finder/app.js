// Main Application Logic
const api = new FootballAPI();
let currentFilter = 'today';
let autoRefreshInterval = null;
let loadingTimeout = null;

// DOM Elements
const matchList = document.getElementById('matchList');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorText = document.getElementById('errorText');
const apiKeyInput = document.getElementById('apiKey');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const lastUpdateSpan = document.getElementById('lastUpdate');
const filterBtns = document.querySelectorAll('.filter-btn');
const apiNotice = document.querySelector('.api-notice');
const rateLimitInfo = document.getElementById('rateLimitInfo');
const requestsRemaining = document.getElementById('requestsRemaining');
const apiCallCount = document.getElementById('apiCallCount');
const cacheStatus = document.getElementById('cacheStatus');

// Initialize app
function init() {
    // Detect if running on Netlify (production)
    const isProduction = window.location.hostname !== 'localhost' && 
                        window.location.hostname !== '127.0.0.1';
    
    if (isProduction) {
        // Hide API key input on production
        apiNotice.style.display = 'none';
        loadMatches();
        startAutoRefresh();
        updateApiStatusDisplay();
    } else {
        // Local development - need API key
        if (api.hasApiKey()) {
            apiNotice.style.display = 'none';
            updateRateLimitDisplay();
            loadMatches();
            startAutoRefresh();
        } else {
            apiKeyInput.value = '';
            hideLoading();
        }
    }

    // Event listeners
    saveApiKeyBtn.addEventListener('click', handleSaveApiKey);
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadMatches();
        });
    });
}

function handleSaveApiKey() {
    const key = apiKeyInput.value.trim();
    if (!key) {
        showError('Please enter a valid API key');
        return;
    }
    
    api.setApiKey(key);
    apiNotice.style.display = 'none';
    updateRateLimitDisplay();
    loadMatches();
    startAutoRefresh();
}

function updateRateLimitDisplay() {
    if (rateLimitInfo) {
        rateLimitInfo.style.display = 'block';
        if (requestsRemaining) {
            requestsRemaining.textContent = api.getRemainingRequests();
        }
    }
}

async function loadMatches() {
    // Smart loading: Only show spinner if request takes >100ms
    const startTime = Date.now();
    loadingTimeout = setTimeout(() => {
        showLoading();
    }, 100);
    
    hideError();

    // Update rate limit display before loading
    updateRateLimitDisplay();

    try {
        let matches = [];
        
        switch(currentFilter) {
            case 'today':
                // Get all matches for today (includes live + upcoming + finished)
                matches = await api.getTodaysMatches();
                break;
            case 'tomorrow':
                matches = await getTomorrowsMatches();
                break;
            case 'thisweek':
                matches = await getThisWeeksMatches();
                break;
            default:
                // Default to today
                matches = await api.getTodaysMatches();
                break;
        }

        // Cancel loading spinner if it hasn't shown yet
        clearTimeout(loadingTimeout);
        
        displayMatches(matches);
        updateLastUpdateTime();
        updateRateLimitDisplay(); // Update after successful request
        hideLoading();
        
    } catch (error) {
        clearTimeout(loadingTimeout);
        console.error('Error loading matches:', error);
        showError(error.message || 'Failed to load matches. Please check your API key.');
        hideLoading();
    }
}

// Get tomorrow's matches
async function getTomorrowsMatches() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    
    // Fetch football, NFL games, and Svenska Cupen in parallel
    const [footballMatches, nflGames, svenskaCupenMatches] = await Promise.all([
        api.makeRequest(`/fixtures?date=${tomorrowDate}`),
        api.makeRequest(`/nfl/games?date=${tomorrowDate}`),
        api.getSvenskaCupenMatches(tomorrowDate)
    ]);
    
    // Filter for PL, CL, EL, FA Cup, Carabao Cup
    const filteredFootball = (footballMatches.response || []).filter(match => {
        const leagueId = match.league?.id;
        return leagueId === 39 || leagueId === 2 || leagueId === 3 || leagueId === 45 || leagueId === 48;
    });
    
    // Format and combine
    const formattedFootball = filteredFootball.map(m => api.formatMatch(m));
    const formattedNFL = (nflGames.response || []).map(g => api.formatNFLGame(g));
    
    return [...formattedFootball, ...formattedNFL, ...svenskaCupenMatches];
}

// Get this week's matches
async function getThisWeeksMatches() {
    const today = new Date();
    const weekEnd = new Date();
    weekEnd.setDate(today.getDate() + 7);
    
    // Generate array of dates for the next 7 days
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
    }
    
    // Fetch matches for each date in parallel (football, NFL, and Svenska Cupen)
    const allPromises = dates.flatMap(date => [
        api.makeRequest(`/fixtures?date=${date}`),
        api.makeRequest(`/nfl/games?date=${date}`),
        api.getSvenskaCupenMatches(date)
    ]);
    
    const results = await Promise.all(allPromises);
    
    // Separate football, NFL, and Svenska Cupen results
    const allFootballMatches = [];
    const allNflGames = [];
    const allSvenskaCupenMatches = [];
    
    for (let i = 0; i < results.length; i += 3) {
        allFootballMatches.push(...(results[i].response || []));
        allNflGames.push(...(results[i + 1].response || []));
        allSvenskaCupenMatches.push(...(results[i + 2] || []));
    }
    
    // Filter for PL, CL, EL, FA Cup, Carabao Cup
    const filteredFootball = allFootballMatches.filter(match => {
        const leagueId = match.league?.id;
        return leagueId === 39 || leagueId === 2 || leagueId === 3 || leagueId === 45 || leagueId === 48;
    });
    
    // Format and combine
    const formattedFootball = filteredFootball.map(m => api.formatMatch(m));
    const formattedNFL = allNflGames.map(g => api.formatNFLGame(g));
    
    return [...formattedFootball, ...formattedNFL, ...allSvenskaCupenMatches];
}

function displayMatches(matches) {
    if (matches.length === 0) {
        matchList.innerHTML = `
            <div class="error-message">
                <p>No matches found for the selected filter.</p>
            </div>
        `;
        return;
    }

    // Just show all matches grouped by broadcaster/league
    // Live matches will still have red styling on the cards themselves
    const html = createMatchesByBroadcaster(matches);
    
    matchList.innerHTML = html;
    
    // Add click handlers for match cards
    document.querySelectorAll('.match-card').forEach(card => {
        card.addEventListener('click', () => {
            const competition = card.dataset.competition;
            const broadcaster = card.dataset.broadcaster;
            
            // Reconstruct minimal match object with broadcaster info
            const match = { 
                competition: competition,
                broadcaster: broadcaster || null
            };
            openStreamingService(competition, match);
        });
    });
    
    // Add collapse/expand handlers for broadcaster groups
    document.querySelectorAll('.broadcaster-header[data-toggle]').forEach(header => {
        header.addEventListener('click', (e) => {
            // Don't collapse if clicking on the badge link
            if (e.target.tagName === 'A') return;
            
            const targetId = header.dataset.toggle;
            const content = document.getElementById(targetId);
            const icon = header.querySelector('.collapse-icon');
            
            if (content.style.display === 'none') {
                content.style.display = 'grid';
                icon.textContent = '▼';
            } else {
                content.style.display = 'none';
                icon.textContent = '▶';
            }
        });
    });
}

// Helper to create broadcaster groups
function createMatchesByBroadcaster(matches) {
    const grouped = groupMatchesByBroadcaster(matches);
    let html = '';
    
    for (const [key, groupData] of Object.entries(grouped)) {
        const { competition, matches: competitionMatches } = groupData;
        
        // Create label - just the competition name
        const displayLabel = competition.replace('UEFA ', '');
        
        // Create unique ID for collapsible group
        const groupId = `group-${key.replace(/[^a-zA-Z0-9]/g, '-')}`;
        
        const competitionBadge = `<span class="broadcaster-badge">${displayLabel}</span>`;
        
        // Separate matches by status
        const liveMatches = competitionMatches.filter(m => getStatusClass(m.status) === 'live');
        const upcomingMatches = competitionMatches.filter(m => getStatusClass(m.status) === 'upcoming');
        const finishedMatches = competitionMatches.filter(m => getStatusClass(m.status) === 'finished');
        
        html += `
            <div class="broadcaster-group">
                <div class="broadcaster-header" data-toggle="${groupId}">
                    <span class="collapse-icon">▼</span>
                    ${competitionBadge}
                    <span class="match-count">${competitionMatches.length} ${competitionMatches.length === 1 ? 'match' : 'matches'}</span>
                </div>
                <div id="${groupId}">
                    ${liveMatches.length > 0 ? `
                        <div class="matches-grid">
                            ${liveMatches.map(match => createCompactMatchCard(match)).join('')}
                        </div>
                    ` : ''}
                    ${liveMatches.length > 0 && upcomingMatches.length > 0 ? '<div class="match-divider"></div>' : ''}
                    ${upcomingMatches.length > 0 ? `
                        <div class="matches-grid">
                            ${upcomingMatches.map(match => createCompactMatchCard(match)).join('')}
                        </div>
                    ` : ''}
                    ${upcomingMatches.length > 0 && finishedMatches.length > 0 ? '<div class="match-divider"></div>' : ''}
                    ${finishedMatches.length > 0 ? `
                        <div class="matches-grid">
                            ${finishedMatches.map(match => createCompactMatchCard(match)).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    return html;
}

function groupMatchesByBroadcaster(matches) {
    const groups = {};
    
    // Group by competition only, not by broadcaster
    matches.forEach(match => {
        const key = match.competition || 'Other';
        if (!groups[key]) {
            groups[key] = { 
                competition: match.competition, 
                matches: [] 
            };
        }
        groups[key].matches.push(match);
    });
    
    // Sort groups by competition priority
    const competitionOrder = ['Premier League', 'UEFA Champions League', 'UEFA Europa League', 'FA Cup', 'Carabao Cup', 'Svenska Cupen', 'NFL'];
    const sorted = {};
    
    competitionOrder.forEach(comp => {
        if (groups[comp]) {
            sorted[comp] = groups[comp];
        }
    });
    
    // Add remaining groups
    Object.keys(groups).forEach(key => {
        if (!sorted[key]) {
            sorted[key] = groups[key];
        }
    });
    
    // Sort matches within each group: live first, then upcoming, then finished
    Object.values(sorted).forEach(group => {
        group.matches.sort((a, b) => {
            const statusA = getStatusClass(a.status);
            const statusB = getStatusClass(b.status);
            
            // Priority: live > upcoming > finished
            const priority = { live: 0, upcoming: 1, finished: 2 };
            const diff = priority[statusA] - priority[statusB];
            
            if (diff !== 0) return diff;
            
            // Same status: sort by time
            return new Date(a.datetime) - new Date(b.datetime);
        });
    });
    
    return sorted;
}

function createMatchCard(match) {
    const statusClass = getStatusClass(match.status);
    const statusText = getStatusText(match);
    
    return `
        <div class="match-card ${statusClass}" data-competition="${match.competition}">
            <span class="match-status ${statusClass}">${statusText}</span>
            <div class="competition">${match.competition}</div>
            
            <div class="teams">
                <div class="team">
                    ${match.homeLogo ? `<img src="${match.homeLogo}" alt="${match.homeTeam}" class="team-logo">` : ''}
                    <div class="team-name">${match.homeTeam}</div>
                    ${match.homeScore !== null ? `<div class="score">${match.homeScore}</div>` : ''}
                </div>
                
                <div class="vs">${match.homeScore !== null ? '' : 'vs'}</div>
                
                <div class="team">
                    ${match.awayLogo ? `<img src="${match.awayLogo}" alt="${match.awayTeam}" class="team-logo">` : ''}
                    <div class="team-name">${match.awayTeam}</div>
                    ${match.awayScore !== null ? `<div class="score">${match.awayScore}</div>` : ''}
                </div>
            </div>
            
            <div class="match-time">${formatMatchTime(match)}</div>
            
            ${createStreamingBadges(match.competition)}
        </div>
    `;
}

// Compact version for grouped display
function createCompactMatchCard(match) {
    const statusClass = getStatusClass(match.status);
    const statusText = getStatusText(match);
    const isLive = statusClass === 'live';
    
    return `
        <div class="match-card compact ${statusClass}" data-competition="${match.competition}" data-broadcaster="${match.broadcaster || ''}">
            <div class="compact-header">
                <span class="match-status-mini ${statusClass}">${isLive ? '🔴' : ''}</span>
                <span class="match-time-mini">${formatCompactTime(match)}</span>
                ${match.channel ? `<span class="channel-badge">${match.channel}</span>` : ''}
            </div>
            <div class="compact-teams">
                <div class="compact-team">
                    ${match.homeLogo ? `<img src="${match.homeLogo}" alt="" class="team-logo-mini">` : ''}
                    <span class="team-name-mini">${match.homeTeam}</span>
                    ${match.homeScore !== null ? `<strong class="score-mini">${match.homeScore}</strong>` : ''}
                </div>
                <div class="compact-team">
                    ${match.awayLogo ? `<img src="${match.awayLogo}" alt="" class="team-logo-mini">` : ''}
                    <span class="team-name-mini">${match.awayTeam}</span>
                    ${match.awayScore !== null ? `<strong class="score-mini">${match.awayScore}</strong>` : ''}
                </div>
            </div>
        </div>
    `;
}

function getStatusClass(status) {
    const liveStatuses = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'];
    if (liveStatuses.includes(status)) return 'live';
    if (status === 'FT' || status === 'AET' || status === 'PEN') return 'finished';
    return 'upcoming';
}

function getStatusText(match) {
    if (match.status === 'NS') return 'Not Started';
    if (match.status === 'FT') return 'Full Time';
    if (match.status === '1H') return `${match.elapsed}' - First Half`;
    if (match.status === '2H') return `${match.elapsed}' - Second Half`;
    if (match.status === 'HT') return 'Half Time';
    if (match.status === 'LIVE') return '🔴 LIVE';
    return match.statusLong;
}

function formatMatchTime(match) {
    const date = new Date(match.datetime);
    const now = new Date();
    const diffDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));
    
    const timeStr = date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    
    if (diffDays === 0) return `Today at ${timeStr}`;
    if (diffDays === 1) return `Tomorrow at ${timeStr}`;
    
    const dateStr = date.toLocaleDateString('sv-SE', { 
        month: 'short', 
        day: 'numeric',
        weekday: 'short'
    });
    return `${dateStr} at ${timeStr}`;
}

function formatCompactTime(match) {
    const date = new Date(match.datetime);
    const now = new Date();
    const diffMinutes = Math.floor((date - now) / (1000 * 60));
    const diffDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));
    
    const timeStr = date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    
    // Finished matches - show FT instead of time
    const statusClass = getStatusClass(match.status);
    if (statusClass === 'finished') {
        return 'FT';
    }
    
    // Live matches
    if (match.homeScore !== null) {
        return match.status === 'HT' ? 'HT' : match.elapsed ? `${match.elapsed}'` : 'LIVE';
    }
    
    // Starting soon
    if (diffMinutes > 0 && diffMinutes <= 30) {
        return `in ${diffMinutes}m`;
    }
    
    // Today
    if (diffDays === 0) return timeStr;
    
    // Tomorrow
    if (diffDays === 1) return `Tomorrow ${timeStr}`;
    
    // Future
    const dateStr = date.toLocaleDateString('sv-SE', { month: 'numeric', day: 'numeric' });
    return `${dateStr} ${timeStr}`;
}

function createStreamingBadges(competition) {
    const streamingInfo = getStreamingServicesForCompetition(competition);
    
    if (!streamingInfo || streamingInfo.length === 0) {
        return '<div class="streaming-services"><span style="color: #94a3b8; font-size: 0.9em;">Broadcasting info not available</span></div>';
    }
    
    const badges = streamingInfo.map(service => 
        `<span class="service-badge service-${service.toLowerCase().replace(' ', '')}">${service}</span>`
    ).join('');
    
    return `<div class="streaming-services">${badges}</div>`;
}

function getStreamingServicesForCompetition(competition, match = null) {
    // Use broadcaster data from scraping (via match.broadcaster)
    if (match && match.broadcaster) {
        return [match.broadcaster];
    }
    
    // Fallback to defaults while scraper is being fixed
    const fallbacks = {
        'Premier League': ['Viaplay'],
        'UEFA Champions League': ['Viaplay']
    };
    
    return fallbacks[competition] || [];
}

function getBroadcasterUrl(broadcaster, competition) {
    // Map broadcaster and competition to league-specific URLs
    const broadcasterUrls = {
        'Viaplay': {
            'Premier League': 'https://viaplay.se/sport/fotboll/premier-league',
            'UEFA Champions League': 'https://viaplay.se/sport/fotboll/uefa-champions-league'
        },
        'C More': {
            'UEFA Champions League': 'https://www.cmore.se/fotboll/uefa-champions-league',
            'Premier League': 'https://www.cmore.se/sport/fotboll'
        },
        'Prime Video': {
            'Premier League': 'https://www.primevideo.com/region/eu/storefront/sports',
            'UEFA Champions League': 'https://www.primevideo.com/region/eu/storefront/sports'
        },
        'Max': {
            'Premier League': 'https://www.max.com/se/sv/sports',
            'UEFA Champions League': 'https://www.max.com/se/sv/sports'
        },
        'TV4': {
            'UEFA Champions League': 'https://www.tv4play.se/sport',
            'Premier League': 'https://www.tv4play.se/sport'
        },
        'TNT Sports': {
            'UEFA Champions League': 'https://www.discoveryplus.com/gb/show/uefa-champions-league',
            'Premier League': 'https://www.discoveryplus.com/gb/sport',
            'FA Cup': 'https://www.discoveryplus.com/gb/sport',
            'Carabao Cup': 'https://www.discoveryplus.com/gb/sport'
        },
        'Sky Sports': {
            'Premier League': 'https://www.skysports.com/watch/premier-league-live-on-sky',
            'UEFA Champions League': 'https://www.skysports.com/watch',
            'FA Cup': 'https://www.skysports.com/watch/fa-cup',
            'Carabao Cup': 'https://www.skysports.com/watch'
        },
        'Discovery+': {
            'UEFA Champions League': 'https://www.discoveryplus.com/gb/show/uefa-champions-league',
            'Premier League': 'https://www.discoveryplus.com/gb/sport'
        },
        'ITV': {
            'FA Cup': 'https://www.itv.com/watch/sport',
            'UEFA Champions League': 'https://www.itv.com/watch/sport'
        },
        'BBC': {
            'FA Cup': 'https://www.bbc.co.uk/sport/football',
            'Carabao Cup': 'https://www.bbc.co.uk/sport/football'
        },
        'Channel 4': {
            'FA Cup': 'https://www.channel4.com/programmes/live-football',
            'Carabao Cup': 'https://www.channel4.com/programmes/live-football'
        }
    };
    
    // Try to get broadcaster-specific URL
    const url = broadcasterUrls[broadcaster]?.[competition];
    
    if (url) {
        return url;
    }
    
    return null;
}

async function openStreamingService(competition, match = null) {
    try {
        const services = getStreamingServicesForCompetition(competition, match);
        
        if (!services || services.length === 0) {
            alert('No streaming information available for this competition.');
            return;
        }

        // If multiple services, use the first one (could add UI to choose later)
        const broadcaster = services[0];
        const url = getBroadcasterUrl(broadcaster, competition);
        
        if (url) {
            window.open(url, '_blank');
        } else {
            alert('No streaming link available for this competition.');
        }
    } catch (error) {
        console.error('Error opening streaming service:', error);
    }
}

function showLoading() {
    loadingState.style.display = 'block';
    matchList.style.display = 'none';
}

function hideLoading() {
    loadingState.style.display = 'none';
    matchList.style.display = 'grid';
}

function showError(message) {
    errorText.textContent = message;
    errorState.style.display = 'block';
}

function hideError() {
    errorState.style.display = 'none';
}

function updateLastUpdateTime() {
    const now = new Date();
    lastUpdateSpan.textContent = now.toLocaleTimeString('sv-SE', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    updateApiStatusDisplay();
}

function updateApiStatusDisplay() {
    // Update API call counter
    const isProduction = window.location.hostname !== 'localhost' && 
                        window.location.hostname !== '127.0.0.1';
    
    if (isProduction) {
        // Show that we're using cached data most of the time
        apiCallCount.textContent = `Cached responses active`;
        cacheStatus.textContent = `Active (5 min TTL)`;
    } else {
        // Local development - show actual count
        const remaining = api.getRemainingRequests();
        const used = 100 - remaining;
        apiCallCount.textContent = `${used} used / ${remaining} left`;
        cacheStatus.textContent = `Active (5 min TTL)`;
    }
}

function startAutoRefresh() {
    // Refresh every 10 minutes (reduced from 60 seconds to save API calls)
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(() => {
        // Only auto-refresh if we have requests remaining and showing live matches
        if (api.getRemainingRequests() > 10 && (currentFilter === 'live' || currentFilter === 'all')) {
            console.log('Auto-refreshing matches...');
            loadMatches();
        } else if (api.getRemainingRequests() <= 10) {
            console.warn('Low on API requests, auto-refresh disabled');
            clearInterval(autoRefreshInterval);
        }
    }, 10 * 60 * 1000); // 10 minutes instead of 60 seconds
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
