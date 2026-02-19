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

        console.log('Fetching Svenska Cupen matches for date:', date);

        // For now, return empty array since tvmatchen.nu scraping is complex
        // TODO: Implement proper scraping when Svenska Cupen games are scheduled
        const matches = [];

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
