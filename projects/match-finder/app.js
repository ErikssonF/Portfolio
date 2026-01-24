// Main Application Logic
const api = new FootballAPI();
let currentFilter = 'all';
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

// Initialize app
function init() {
    // Detect if running on Netlify (production)
    const isProduction = window.location.hostname !== 'localhost' && 
                        window.location.hostname !== '127.0.0.1';
    
    if (isProduction) {
        // Hide API key input on production - using Netlify Function
        apiNotice.innerHTML = `
            <p style="color: #10b981;">✅ Ready to use! Each visitor gets 20 requests per day.</p>
            <p style="font-size: 0.9em; margin-top: 10px; color: #94a3b8;">
                Data refreshes every 5 minutes automatically. Shared with friends!
            </p>
        `;
        loadMatches();
        startAutoRefresh();
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
            case 'live':
                matches = await api.getLiveMatches();
                break;
            case 'today':
                matches = await api.getTodaysMatches();
                break;
            case 'upcoming':
                matches = await api.getUpcomingMatches();
                break;
            case 'all':
            default:
                const [live, upcoming] = await Promise.all([
                    api.getLiveMatches(),
                    api.getUpcomingMatches()
                ]);
                matches = [...live, ...upcoming];
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

function displayMatches(matches) {
    if (matches.length === 0) {
        matchList.innerHTML = `
            <div class="error-message">
                <p>No matches found for the selected filter.</p>
            </div>
        `;
        return;
    }

    matchList.innerHTML = matches.map(match => createMatchCard(match)).join('');
    
    // Add click handlers
    document.querySelectorAll('.match-card').forEach(card => {
        card.addEventListener('click', () => {
            const competition = card.dataset.competition;
            openStreamingService(competition);
        });
    });
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
        'UEFA Champions League': ['C More', 'Viaplay']
    };
    
    return mapping[competition] || [];
}

async function openStreamingService(competition) {
    try {
        const streamingInfo = await api.getStreamingInfo(competition);
        
        if (!streamingInfo) {
            alert('No streaming information available for this competition.');
            return;
        }

        // If multiple services, show options
        if (streamingInfo.services.length > 1) {
            const service = streamingInfo.services[0]; // Default to first
            const serviceData = streamingInfo.serviceDetails[0];
            window.open(serviceData.baseUrl, '_blank');
        } else {
            // Single service, open directly
            const serviceData = streamingInfo.serviceDetails[0];
            window.open(serviceData.baseUrl, '_blank');
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
    lastUpdateSpan.textContent = now.toLocaleTimeString('sv-SE');
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
