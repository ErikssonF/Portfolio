let currentUser = null;
let currentWeek = null;
let matchupsData = null;
let userPicks = {};

// DOM Elements
const usernameSelect = document.getElementById('username');
const weekTitle = document.getElementById('week-title');
const matchupsContainer = document.getElementById('matchups-container');
const submitBtn = document.getElementById('submit-picks');
const statusSpan = document.getElementById('status');
const lastUpdateSpan = document.getElementById('last-update');

// Initialize app
document.addEventListener('DOMContentLoaded', init);

async function init() {
    setupEventListeners();
    await loadUsers();
    await loadMatchups();
}

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.view));
    });
    
    // User selection
    usernameSelect.addEventListener('change', handleUserChange);
    
    // Submit picks
    submitBtn.addEventListener('click', submitPicks);
}

function switchTab(view) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    
    document.querySelector(`[data-view="${view}"]`).classList.add('active');
    document.getElementById(`${view}-view`).classList.add('active');
    
    if (view === 'leaderboard') {
        loadLeaderboard();
    }
}

function handleUserChange() {
    currentUser = usernameSelect.value;
    if (currentUser && Object.keys(userPicks).length > 0) {
        submitBtn.disabled = false;
    } else {
        submitBtn.disabled = true;
    }
}

async function loadUsers() {
    try {
        const users = await getLeagueUsers();
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.display_name || user.username;
            option.textContent = user.display_name || user.username;
            usernameSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load users:', error);
        statusSpan.textContent = 'Error loading users';
    }
}

async function loadMatchups() {
    try {
        statusSpan.textContent = 'Loading matchups...';
        matchupsContainer.innerHTML = '<div class="loading">Loading matchups...</div>';
        
        const data = await getCurrentWeekMatchups();
        currentWeek = data.week;
        matchupsData = data.matchups;
        
        weekTitle.textContent = `Week ${currentWeek}`;
        displayMatchups(matchupsData);
        
        statusSpan.textContent = 'Ready';
        lastUpdateSpan.textContent = `Updated ${new Date().toLocaleTimeString()}`;
    } catch (error) {
        console.error('Failed to load matchups:', error);
        matchupsContainer.innerHTML = '<div class="loading">Error loading matchups</div>';
        statusSpan.textContent = 'Error';
    }
}

function displayMatchups(matchups) {
    if (!matchups || matchups.length === 0) {
        matchupsContainer.innerHTML = '<div class="loading">No matchups available</div>';
        return;
    }
    
    matchupsContainer.innerHTML = '';
    
    matchups.forEach(matchup => {
        const card = createMatchupCard(matchup);
        matchupsContainer.appendChild(card);
    });
}

function createMatchupCard(matchup) {
    const card = document.createElement('div');
    card.className = 'matchup-card';
    
    const team1Avatar = matchup.team1.avatar 
        ? `https://sleepercdn.com/avatars/thumbs/${matchup.team1.avatar}`
        : '';
    const team2Avatar = matchup.team2.avatar 
        ? `https://sleepercdn.com/avatars/thumbs/${matchup.team2.avatar}`
        : '';
    
    card.innerHTML = `
        <div class="matchup-teams">
            <div class="team" data-matchup="${matchup.matchup_id}" data-roster="${matchup.team1.roster_id}">
                ${team1Avatar ? `<img src="${team1Avatar}" alt="${matchup.team1.username}" class="team-avatar">` : '<div class="team-avatar"></div>'}
                <div class="team-info">
                    <div class="team-name">${matchup.team1.username}</div>
                    <div class="team-record">${matchup.team1.points} pts</div>
                </div>
            </div>
            <div class="vs-separator">VS</div>
            <div class="team" data-matchup="${matchup.matchup_id}" data-roster="${matchup.team2.roster_id}">
                ${team2Avatar ? `<img src="${team2Avatar}" alt="${matchup.team2.username}" class="team-avatar">` : '<div class="team-avatar"></div>'}
                <div class="team-info">
                    <div class="team-name">${matchup.team2.username}</div>
                    <div class="team-record">${matchup.team2.points} pts</div>
                </div>
            </div>
        </div>
    `;
    
    // Add click handlers for teams
    card.querySelectorAll('.team').forEach(team => {
        team.addEventListener('click', () => selectTeam(team));
    });
    
    return card;
}

function selectTeam(teamElement) {
    const matchupId = teamElement.dataset.matchup;
    const rosterId = teamElement.dataset.roster;
    
    // Deselect other team in same matchup
    const matchupCard = teamElement.closest('.matchup-card');
    matchupCard.querySelectorAll('.team').forEach(t => t.classList.remove('selected'));
    
    // Select this team
    teamElement.classList.add('selected');
    
    // Store pick
    userPicks[matchupId] = parseInt(rosterId);
    
    // Enable submit if user selected
    if (currentUser && Object.keys(userPicks).length > 0) {
        submitBtn.disabled = false;
    }
}

async function submitPicks() {
    if (!currentUser) {
        alert('Please select your name first');
        return;
    }
    
    if (Object.keys(userPicks).length === 0) {
        alert('Please make at least one pick');
        return;
    }
    
    try {
        statusSpan.textContent = 'Submitting picks...';
        submitBtn.disabled = true;
        
        const response = await fetch('/.netlify/functions/picks-storage?action=save-picks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user: currentUser,
                week: currentWeek,
                picks: userPicks
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save picks');
        }
        
        const result = await response.json();
        statusSpan.textContent = 'Picks submitted!';
        alert('Picks submitted successfully!');
        
        // Clear selections
        document.querySelectorAll('.team.selected').forEach(t => t.classList.remove('selected'));
        userPicks = {};
        
    } catch (error) {
        console.error('Failed to submit picks:', error);
        statusSpan.textContent = 'Submission failed';
        alert('Failed to submit picks. Please try again.');
        submitBtn.disabled = false;
    }
}

async function loadLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    
    try {
        const response = await fetch('/.netlify/functions/picks-storage?action=get-leaderboard');
        
        if (!response.ok) {
            throw new Error('Failed to load leaderboard');
        }
        
        const data = await response.json();
        
        if (Object.keys(data).length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No picks submitted yet</td></tr>';
            return;
        }
        
        // Convert to array and sort by correct picks
        const players = Object.entries(data).map(([name, stats]) => ({
            name,
            ...stats,
            winPct: stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(1) : 0
        })).sort((a, b) => b.correct - a.correct);
        
        tbody.innerHTML = players.map((player, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${player.name}</td>
                <td>${player.correct}</td>
                <td>${player.wrong}</td>
                <td>${player.winPct}%</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        tbody.innerHTML = '<tr><td colspan="5">Error loading leaderboard</td></tr>';
    }
}
