const fetch = require('node-fetch');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'ErikssonF';
const REPO_NAME = 'Portfolio';
const BRANCH = 'main';

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const action = event.queryStringParameters?.action;

        if (event.httpMethod === 'POST' && action === 'save-picks') {
            return await savePicks(event, headers);
        } else if (event.httpMethod === 'GET' && action === 'get-picks') {
            return await getPicks(event, headers);
        } else if (event.httpMethod === 'GET' && action === 'get-leaderboard') {
            return await getLeaderboard(headers);
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid action' })
        };
    } catch (error) {
        console.error('Storage Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

async function savePicks(event, headers) {
    const { user, week, picks } = JSON.parse(event.body);
    const filePath = `data/nfl-pickem/week-${week}.json`;

    // Get current file content
    let currentData = {};
    try {
        const existingFile = await getFileFromGitHub(filePath);
        currentData = JSON.parse(Buffer.from(existingFile.content, 'base64').toString());
    } catch (error) {
        console.log('No existing file, creating new one');
    }

    // Update with new picks
    currentData[user] = {
        picks: picks,
        timestamp: new Date().toISOString()
    };

    // Save to GitHub
    await saveFileToGitHub(filePath, currentData);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Picks saved!' })
    };
}

async function getPicks(event, headers) {
    const week = event.queryStringParameters?.week;
    const filePath = `data/nfl-pickem/week-${week}.json`;

    try {
        const file = await getFileFromGitHub(filePath);
        const data = JSON.parse(Buffer.from(file.content, 'base64').toString());
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({})
        };
    }
}

async function getLeaderboard(headers) {
    // Get all pick files
    const weekFiles = await listPickFiles();
    
    const leaderboard = {};

    for (const file of weekFiles) {
        // Extract week number from filename (e.g., "week-1.json" -> 1)
        const weekMatch = file.name.match(/week-(\d+)\.json/);
        if (!weekMatch) continue;
        const week = parseInt(weekMatch[1]);
        
        const weekData = JSON.parse(Buffer.from(file.content, 'base64').toString());
        
        // Get actual results from Sleeper for this week
        const actualResults = await getWeekResults(week);
        
        // Score each user's picks
        for (const [user, data] of Object.entries(weekData)) {
            if (!leaderboard[user]) {
                leaderboard[user] = { correct: 0, wrong: 0, total: 0 };
            }
            
            // Compare picks against actual results
            for (const [matchupId, pickedRosterId] of Object.entries(data.picks || {})) {
                const actualWinner = actualResults[matchupId];
                
                if (actualWinner) {
                    leaderboard[user].total++;
                    if (actualWinner === pickedRosterId) {
                        leaderboard[user].correct++;
                    } else {
                        leaderboard[user].wrong++;
                    }
                }
            }
        }
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(leaderboard)
    };
}

async function getWeekResults(week) {
    const endpoint = `league/${LEAGUE_ID}/matchups/${week}`;
    const sleeperUrl = `https://api.sleeper.app/v1/${endpoint}`;
    
    try {
        const response = await fetch(sleeperUrl);
        const matchups = await response.json();
        
        // Group by matchup_id and determine winners
        const winners = {};
        const matchupGroups = {};
        
        matchups.forEach(matchup => {
            if (!matchup.matchup_id) return;
            if (!matchupGroups[matchup.matchup_id]) {
                matchupGroups[matchup.matchup_id] = [];
            }
            matchupGroups[matchup.matchup_id].push(matchup);
        });
        
        // Determine winner for each matchup (higher points wins)
        for (const [matchupId, teams] of Object.entries(matchupGroups)) {
            if (teams.length !== 2) continue;
            
            const team1 = teams[0];
            const team2 = teams[1];
            
            // Only score completed matchups (both teams have points)
            if (team1.points > 0 || team2.points > 0) {
                winners[matchupId] = team1.points > team2.points ? team1.roster_id : team2.roster_id;
            }
        }
        
        return winners;
    } catch (error) {
        console.error('Failed to get week results:', error);
        return {};
    }
}

const LEAGUE_ID = '1241399095898152960';

async function getFileFromGitHub(path) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${BRANCH}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
    }

    return await response.json();
}

async function saveFileToGitHub(path, content) {
    const contentBase64 = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');
    
    // Get current file SHA if it exists
    let sha;
    try {
        const existing = await getFileFromGitHub(path);
        sha = existing.sha;
    } catch (error) {
        // File doesn't exist, that's fine
    }

    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: `Update picks for ${path}`,
            content: contentBase64,
            branch: BRANCH,
            ...(sha && { sha })
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to save to GitHub: ${error}`);
    }

    return await response.json();
}

async function listPickFiles() {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/nfl-pickem?ref=${BRANCH}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) return [];
        
        const files = await response.json();
        
        // Get content for each file
        const fileContents = await Promise.all(
            files.map(file => getFileFromGitHub(file.path))
        );
        
        return fileContents;
    } catch (error) {
        return [];
    }
}
