const LEAGUE_ID = '1241399095898152960';
const API_BASE = '/.netlify/functions/sleeper-api';

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function makeRequest(endpoint) {
    const cacheKey = endpoint;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('Using cached data for:', endpoint);
        return cached.data;
    }
    
    try {
        const url = `${API_BASE}?endpoint=${encodeURIComponent(endpoint)}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function getLeagueInfo() {
    return await makeRequest(`league/${LEAGUE_ID}`);
}

async function getLeagueRosters() {
    return await makeRequest(`league/${LEAGUE_ID}/rosters`);
}

async function getLeagueUsers() {
    return await makeRequest(`league/${LEAGUE_ID}/users`);
}

async function getMatchups(week) {
    return await makeRequest(`league/${LEAGUE_ID}/matchups/${week}`);
}

async function getNFLState() {
    return await makeRequest('state/nfl');
}

async function getCurrentWeekMatchups() {
    const nflState = await getNFLState();
    const currentWeek = nflState.week;
    
    const [matchups, rosters, users] = await Promise.all([
        getMatchups(currentWeek),
        getLeagueRosters(),
        getLeagueUsers()
    ]);
    
    // Match rosters with users
    const rostersWithUsers = rosters.map(roster => {
        const user = users.find(u => u.user_id === roster.owner_id);
        return {
            ...roster,
            username: user?.display_name || user?.username || 'Unknown',
            avatar: user?.avatar || null
        };
    });
    
    // Group matchups by matchup_id
    const matchupGroups = {};
    matchups.forEach(matchup => {
        if (!matchup.matchup_id) return;
        if (!matchupGroups[matchup.matchup_id]) {
            matchupGroups[matchup.matchup_id] = [];
        }
        matchupGroups[matchup.matchup_id].push(matchup);
    });
    
    // Create matchup pairs with user info
    const matchupPairs = Object.values(matchupGroups).map(group => {
        if (group.length !== 2) return null;
        
        const team1 = rostersWithUsers.find(r => r.roster_id === group[0].roster_id);
        const team2 = rostersWithUsers.find(r => r.roster_id === group[1].roster_id);
        
        return {
            matchup_id: group[0].matchup_id,
            team1: {
                roster_id: group[0].roster_id,
                username: team1?.username || 'Unknown',
                avatar: team1?.avatar,
                points: group[0].points || 0
            },
            team2: {
                roster_id: group[1].roster_id,
                username: team2?.username || 'Unknown',
                avatar: team2?.avatar,
                points: group[1].points || 0
            }
        };
    }).filter(m => m !== null);
    
    return {
        week: currentWeek,
        matchups: matchupPairs
    };
}
