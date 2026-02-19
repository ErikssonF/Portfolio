// Netlify Function to provide Svenska Cupen match data
// All Svenska Cupen matches are broadcast on Expressen +Allt
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

        // Svenska Cupen Round 1 matches (Feb 20-24, 2026)
        const allMatches = [
            {
                id: 'svenska-cupen-1',
                competition: 'Svenska Cupen',
                homeTeam: 'Hammarby',
                awayTeam: 'IK Brage',
                homeLogo: null,
                awayLogo: null,
                homeScore: null,
                awayScore: null,
                status: 'NS',
                statusLong: 'Not Started',
                datetime: '2026-02-20T19:00:00Z',
                venue: null,
                elapsed: null,
                broadcaster: 'Expressen +Allt',
                channel: 'Expressen +Allt'
            },
            {
                id: 'svenska-cupen-2',
                competition: 'Svenska Cupen',
                homeTeam: 'IFK Göteborg',
                awayTeam: 'Östersunds FK',
                homeLogo: null,
                awayLogo: null,
                homeScore: null,
                awayScore: null,
                status: 'NS',
                statusLong: 'Not Started',
                datetime: '2026-02-21T13:00:00Z',
                venue: null,
                elapsed: null,
                broadcaster: 'Expressen +Allt',
                channel: 'Expressen +Allt'
            },
            {
                id: 'svenska-cupen-3',
                competition: 'Svenska Cupen',
                homeTeam: 'Djurgården',
                awayTeam: 'Falkenbergs FF',
                homeLogo: null,
                awayLogo: null,
                homeScore: null,
                awayScore: null,
                status: 'NS',
                statusLong: 'Not Started',
                datetime: '2026-02-21T15:00:00Z',
                venue: null,
                elapsed: null,
                broadcaster: 'Expressen +Allt',
                channel: 'Expressen +Allt'
            },
            {
                id: 'svenska-cupen-4',
                competition: 'Svenska Cupen',
                homeTeam: 'AIK',
                awayTeam: 'Västerås SK',
                homeLogo: null,
                awayLogo: null,
                homeScore: null,
                awayScore: null,
                status: 'NS',
                statusLong: 'Not Started',
                datetime: '2026-02-22T13:00:00Z',
                venue: null,
                elapsed: null,
                broadcaster: 'Expressen +Allt',
                channel: 'Expressen +Allt'
            },
            {
                id: 'svenska-cupen-5',
                competition: 'Svenska Cupen',
                homeTeam: 'Malmö FF',
                awayTeam: 'Varbergs BoIS',
                homeLogo: null,
                awayLogo: null,
                homeScore: null,
                awayScore: null,
                status: 'NS',
                statusLong: 'Not Started',
                datetime: '2026-02-22T17:00:00Z',
                venue: null,
                elapsed: null,
                broadcaster: 'Expressen +Allt',
                channel: 'Expressen +Allt'
            }
        ];

        // Filter matches by date
        const matches = allMatches.filter(match => {
            const matchDate = match.datetime.split('T')[0];
            return matchDate === date;
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ matches })
        };

    } catch (error) {
        console.error('Error in Svenska Cupen scraper:', error);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ matches: [] })
        };
    }
};
