// Netlify Function to scrape Svenska Cupen matches from tvmatchen.nu
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const date = event.queryStringParameters?.date;
        if (!date) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Date parameter required' })
            };
        }

        // Fetch Svenska Cupen fixtures page
        const fixturesUrl = 'https://www.tvmatchen.nu/sport/fotboll/svenska-cupen-fotboll-tv/';
        const response = await fetch(fixturesUrl);
        const html = await response.text();

        // Extract match URLs from the fixtures page
        const matchUrlPattern = /<a[^>]+href="(\/match\/[^"]+)"[^>]*>/g;
        const matchUrls = [];
        let match;
        
        while ((match = matchUrlPattern.exec(html)) !== null) {
            const url = `https://www.tvmatchen.nu${match[1]}`;
            if (!matchUrls.includes(url)) {
                matchUrls.push(url);
            }
        }

        // Fetch individual match pages to get details and channels
        const matchPromises = matchUrls.slice(0, 20).map(async (url) => {
            try {
                const matchResponse = await fetch(url);
                const matchHtml = await matchResponse.text();

                // Extract teams
                const homeTeamMatch = matchHtml.match(/<h2[^>]*class="[^"]*rt-match-header__team-name[^"]*"[^>]*>([^<]+)<\/h2>/);
                const awayTeamMatch = matchHtml.match(/<h2[^>]*class="[^"]*rt-match-header__team-name[^"]*"[^>]*>[^<]+<\/h2>[^]*?<h2[^>]*class="[^"]*rt-match-header__team-name[^"]*"[^>]*>([^<]+)<\/h2>/);
                
                // Extract date/time
                const dateTimeMatch = matchHtml.match(/<time[^>]+datetime="([^"]+)"/);
                
                // Extract channels
                const channelPattern = /<div class="rt-match-channel-list__channel-text">([^<]+)<\/div>/g;
                const channels = [];
                let channelMatch;
                while ((channelMatch = channelPattern.exec(matchHtml)) !== null) {
                    channels.push(channelMatch[1].trim());
                }

                if (!homeTeamMatch || !awayTeamMatch || !dateTimeMatch) {
                    return null;
                }

                const matchDateTime = new Date(dateTimeMatch[1]);
                const matchDate = matchDateTime.toISOString().split('T')[0];

                // Only return matches for the requested date
                if (matchDate !== date) {
                    return null;
                }

                return {
                    id: url.split('/').pop(),
                    competition: 'Svenska Cupen',
                    homeTeam: homeTeamMatch[1].trim(),
                    awayTeam: awayTeamMatch[1].trim(),
                    homeLogo: null,
                    awayLogo: null,
                    homeScore: null,
                    awayScore: null,
                    status: 'NS',
                    statusLong: 'Not Started',
                    datetime: dateTimeMatch[1],
                    venue: null,
                    elapsed: null,
                    broadcaster: channels.length > 0 ? channels[0] : null,
                    channel: channels.join(', ') || null
                };
            } catch (error) {
                console.error(`Error fetching match ${url}:`, error);
                return null;
            }
        });

        const matches = (await Promise.all(matchPromises)).filter(m => m !== null);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ matches })
        };

    } catch (error) {
        console.error('Error scraping Svenska Cupen:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to scrape Svenska Cupen data', matches: [] })
        };
    }
};
