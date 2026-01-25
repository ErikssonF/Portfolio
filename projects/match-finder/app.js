// Main Application Logic
const api = new FootballAPI();
let currentFilter = 'today';
let autoRefreshInterval = null;

// DOM Elements
const matchList = document.getElementById('matchList');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorText = document.getElementById('errorText');
const apiKeyInput = document.getElementById('apiKey');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const refreshBtn = document.getElementById('refreshBtn');
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
    refreshBtn.addEventListener('click', () => loadMatches());
    
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
    showLoading();
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
            default:
                // Default to today
                matches = await api.getTodaysMatches();
                break;
        }

        displayMatches(matches);
        updateLastUpdateTime();
        updateRateLimitDisplay(); // Update after successful request
        hideLoading();
        
    } catch (error) {
        console.error('Error loading matches:', error);
        showError(error.message || 'Failed to load matches. Please check your API key.');
        hideLoading();
    }
}

// Check if a match is currently live based on status
function isMatchLive(status) {
    const liveStatuses = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'];
    return liveStatuses.includes(status);
}

// Get matches starting within the next 30 minutes
async function getStartingSoonMatches() {
    const allMatches = await api.getUpcomingMatches();
    const now = new Date();
    const soonThreshold = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    
    return allMatches.filter(match => {
        const matchTime = new Date(match.date);
        return matchTime >= now && matchTime <= soonThreshold;
    });
}

// Get tomorrow's matches
async function getTomorrowsMatches() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    
    console.log(`Fetching ALL matches for tomorrow: ${tomorrowDate}`);
    
    // Fetch both football and NFL games in parallel
    const [footballMatches, nflGames] = await Promise.all([
        api.makeRequest(`/fixtures?date=${tomorrowDate}`),
        api.makeRequest(`/nfl/games?date=${tomorrowDate}`)
    ]);
    
    console.log(`Total football matches for ${tomorrowDate}: ${footballMatches.response?.length || 0}`);
    console.log(`Total NFL games for ${tomorrowDate}: ${nflGames.response?.length || 0}`);
    
    // Filter for PL & CL
    const filteredFootball = (footballMatches.response || []).filter(match => {
        const leagueId = match.league?.id;
        return leagueId === 39 || leagueId === 2;
    });
    
    const plCount = filteredFootball.filter(m => m.league?.id === 39).length;
    const clCount = filteredFootball.filter(m => m.league?.id === 2).length;
    
    console.log(`Tomorrow filtered - Premier League: ${plCount}, Champions League: ${clCount}`);
    
    // Format and combine
    const formattedFootball = filteredFootball.map(m => api.formatMatch(m));
    const formattedNFL = (nflGames.response || []).map(g => api.formatNFLGame(g));
    
    return [...formattedFootball, ...formattedNFL];
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

    // Separate live and upcoming matches
    const liveMatches = matches.filter(m => {
        const statusClass = getStatusClass(m.status);
        return statusClass === 'live';
    });
    
    const upcomingMatches = matches.filter(m => {
        const statusClass = getStatusClass(m.status);
        return statusClass === 'upcoming';
    });
    
    const finishedMatches = matches.filter(m => {
        const statusClass = getStatusClass(m.status);
        return statusClass === 'finished';
    });

    let html = '';

    // Show LIVE section first
    if (liveMatches.length > 0) {
        html += `
            <div class="match-section">
                <div class="section-header live-header">
                    <span class="section-icon">🔴</span>
                    <h2 class="section-title">Live Now</h2>
                    <span class="match-count">${liveMatches.length} ${liveMatches.length === 1 ? 'match' : 'matches'}</span>
                </div>
                ${createMatchesByBroadcaster(liveMatches)}
            </div>
        `;
    }

    // Show UPCOMING section
    if (upcomingMatches.length > 0) {
        const sectionTitle = currentFilter === 'today' ? 'Upcoming Today' : 
                           currentFilter === 'tomorrow' ? 'Tomorrow' :
                           currentFilter === 'this-week' ? 'This Week' : 'Upcoming';
        
        html += `
            <div class="match-section">
                <div class="section-header">
                    <span class="section-icon">📅</span>
                    <h2 class="section-title">${sectionTitle}</h2>
                    <span class="match-count">${upcomingMatches.length} ${upcomingMatches.length === 1 ? 'match' : 'matches'}</span>
                </div>
                ${createMatchesByBroadcaster(upcomingMatches)}
            </div>
        `;
    }

    // Show FINISHED section (if any)
    if (finishedMatches.length > 0) {
        html += `
            <div class="match-section">
                <div class="section-header">
                    <span class="section-icon">✅</span>
                    <h2 class="section-title">Finished</h2>
                    <span class="match-count">${finishedMatches.length} ${finishedMatches.length === 1 ? 'match' : 'matches'}</span>
                </div>
                ${createMatchesByBroadcaster(finishedMatches)}
            </div>
        `;
    }
    
    matchList.innerHTML = html;
    
    // Add click handlers for match cards
    document.querySelectorAll('.match-card').forEach(card => {
        card.addEventListener('click', () => {
            const competition = card.dataset.competition;
            openStreamingService(competition);
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
        const { broadcaster, competition, matches: broadcasterMatches } = groupData;
        
        // Get the league-specific URL for this broadcaster + competition combo
        const broadcasterUrl = getBroadcasterUrl(broadcaster, competition);
        
        // Create label with broadcaster and competition
        const label = competition 
            ? `${broadcaster} - ${competition.replace('UEFA ', '')}`
            : broadcaster;
        
        // Create unique ID for collapsible group
        const groupId = `group-${key.replace(/[^a-zA-Z0-9]/g, '-')}`;
        
        // Don't make Viaplay PL a link or add color
        const isViaplayPL = broadcaster === 'Viaplay' && competition === 'Premier League';
        
        // Change "Not Available" to "NFL"
        const displayLabel = label === 'Not Available' ? 'NFL' : label;
        
        const broadcasterBadge = broadcasterUrl && !isViaplayPL
            ? `<a href="${broadcasterUrl}" target="_blank" class="broadcaster-badge service-${broadcaster.toLowerCase().replace(/\s+/g, '')}">${displayLabel}</a>`
            : `<span class="broadcaster-badge ${isViaplayPL ? '' : 'service-' + broadcaster.toLowerCase().replace(/\s+/g, '')}">${displayLabel}</span>`;
        
        html += `
            <div class="broadcaster-group">
                <div class="broadcaster-header" data-toggle="${groupId}">
                    <span class="collapse-icon">▼</span>
                    ${broadcasterBadge}
                    <span class="match-count">${broadcasterMatches.length} ${broadcasterMatches.length === 1 ? 'match' : 'matches'}</span>
                </div>
                <div class="matches-grid" id="${groupId}">
                    ${broadcasterMatches.map(match => createCompactMatchCard(match)).join('')}
                </div>
            </div>
        `;
    }
    
    return html;
}

function groupMatchesByBroadcaster(matches) {
    const groups = {};
    
    matches.forEach(match => {
        const services = getStreamingServicesForCompetition(match.competition);
        
        if (!services || services.length === 0) {
            // No broadcaster info
            const key = 'Not Available';
            if (!groups[key]) groups[key] = { broadcaster: 'Not Available', competition: null, matches: [] };
            groups[key].matches.push(match);
        } else {
            // Add to each broadcaster's group, separated by competition
            services.forEach(service => {
                const key = `${service}|${match.competition}`;
                if (!groups[key]) {
                    groups[key] = { 
                        broadcaster: service, 
                        competition: match.competition, 
                        matches: [] 
                    };
                }
                groups[key].matches.push(match);
            });
        }
    });
    
    // Sort groups: Viaplay first, then C More, then others
    const order = ['Viaplay', 'C More', 'Max', 'Prime Video'];
    const sorted = {};
    
    // Sort by broadcaster priority, then by competition
    order.forEach(service => {
        Object.keys(groups)
            .filter(key => groups[key].broadcaster === service)
            .sort((a, b) => {
                // Premier League before Champions League
                if (groups[a].competition === 'Premier League') return -1;
                if (groups[b].competition === 'Premier League') return 1;
                return 0;
            })
            .forEach(key => {
                sorted[key] = groups[key];
            });
    });
    
    // Add remaining groups
    Object.keys(groups).forEach(key => {
        if (!sorted[key]) {
            sorted[key] = groups[key];
        }
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
        <div class="match-card compact ${statusClass}" data-competition="${match.competition}">
            <div class="compact-header">
                <span class="match-status-mini ${statusClass}">${isLive ? '🔴' : ''}</span>
                <span class="match-time-mini">${formatCompactTime(match)}</span>
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
    if (diffDays === 1) return `Tom ${timeStr}`;
    
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

function getStreamingServicesForCompetition(competition) {
    // This is a simplified mapping - in production, this would come from config.json
    const mapping = {
        'Premier League': ['Viaplay'],
        'UEFA Champions League': ['C More', 'Viaplay'],
        'NFL': [] // No Swedish broadcaster
    };
    
    return mapping[competition] || [];
}

function getBroadcasterUrl(broadcaster, competition) {
    // Map broadcaster and competition to league-specific URLs
    const urls = {
        'Viaplay': {
            'Premier League': 'https://viaplay.se/sport/fotboll/premier-league',
            'UEFA Champions League': 'https://viaplay.se/sport/fotboll/champions-league'
        },
        'C More': {
            'UEFA Champions League': 'https://www.cmore.se/sport/fotboll/champions-league'
        },
        'Max': {
            'baseUrl': 'https://www.max.com/se'
        },
        'Prime Video': {
            'baseUrl': 'https://www.primevideo.com'
        }
    };
    
    console.log(`getBroadcasterUrl called: broadcaster="${broadcaster}", competition="${competition}"`);
    const result = urls[broadcaster]?.[competition] || urls[broadcaster]?.baseUrl || null;
    console.log(`Returning URL: ${result}`);
    
    // Return league-specific URL or fallback to base URL
    return result;
}

async function openStreamingService(competition) {
    try {
        const services = getStreamingServicesForCompetition(competition);
        
        if (!services || services.length === 0) {
            alert('No streaming information available for this competition.');
            return;
        }

        // If multiple services, use the first one (could add UI to choose later)
        const broadcaster = services[0];
        const url = getBroadcasterUrl(broadcaster, competition);
        
        if (url) {
            console.log(`Opening ${broadcaster} for ${competition}: ${url}`);
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
