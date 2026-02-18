// Netlify Function to scrape broadcaster info from wheresthematch.com
// Extracts UK broadcaster information for Champions League, FA Cup, and Carabao Cup

const https = require('https');

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const broadcasterCache = new Map();

function getCachedBroadcasters(cacheKey) {
  const cached = broadcasterCache.get(cacheKey);
  if (!cached) return null;
  
  const now = Date.now();
  if (now > cached.expiry) {
    broadcasterCache.delete(cacheKey);
    return null;
  }
  
  return cached.data;
}

function setCachedBroadcasters(cacheKey, data) {
  broadcasterCache.set(cacheKey, {
    data: data,
    expiry: Date.now() + CACHE_DURATION
  });
}

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseTeamName(text) {
  // Clean up team names - remove common suffixes and normalize
  return text
    .replace(/\s+/g, ' ')
    .replace(/F\.?C\.?$/gi, '')
    .replace(/A\.?F\.?C\.?$/gi, '')
    .replace(/United$/i, '')
    .replace(/City$/i, '')
    .replace(/FK\s+/gi, '')  // Remove FK prefix
    .replace(/KV\s+/gi, '')  // Remove KV prefix
    .trim();
}

function createMatchKey(homeTeam, awayTeam) {
  // Normalize team names for matching
  const normalize = (name) => name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[.-\/]/g, '');  // Also remove slashes
  
  return `${normalize(homeTeam)}-${normalize(awayTeam)}`;
}

function mapBroadcasterName(channelText) {
  // Map UK broadcaster names to consistent format
  if (/TNT\s*Sports/i.test(channelText)) {
    return 'TNT Sports';
  }
  if (/Sky\s*Sports/i.test(channelText)) {
    return 'Sky Sports';
  }
  if (/Prime|Amazon/i.test(channelText)) {
    return 'Prime Video';
  }
  if (/Discovery\+|Discovery\s*Plus/i.test(channelText)) {
    return 'Discovery+';
  }
  if (/ITV/i.test(channelText)) {
    return 'ITV';
  }
  if (/BBC/i.test(channelText)) {
    return 'BBC';
  }
  if (/Channel\s*4/i.test(channelText)) {
    return 'Channel 4';
  }
  return channelText;
}

async function scrapeBroadcasters(competition, date) {
  const competitionUrls = {
    'UEFA Champions League': 'https://www.wheresthematch.com/live-champions-league-football-on-tv/',
    'FA Cup': 'https://www.wheresthematch.com/live-fa-cup-football-on-tv/',
    'Carabao Cup': 'https://www.wheresthematch.com/carabao-cup-on-tv/'
  };
  
  const url = competitionUrls[competition];
  if (!url) {
    return {};
  }
  
  try {
    const html = await fetchHtml(url);
    const broadcasters = {};
    
    // Match table rows containing match information
    // Pattern: <tr> ... team names ... channel images ... </tr>
    const rowPattern = /<tr[^>]*itemscope[^>]*>.*?<\/tr>/gs;
    const rows = html.match(rowPattern) || [];
    
    rows.forEach(row => {
      // Skip advertisement rows
      if (row.includes('WATCH TODAY') || row.includes('SKY DEALS')) {
        return;
      }
      
      // Extract team names from links
      // Pattern: <a title="Team Name on TV" ... > <em>Team Name</em></a>
      const teamMatches = [...row.matchAll(/<a[^>]*title="([^"]+)\s+on\s+TV"[^>]*>\s*<em[^>]*>([^<]+)<\/em>/gi)];
      
      if (teamMatches.length >= 2) {
        const homeTeam = parseTeamName(teamMatches[0][2]);
        const awayTeam = parseTeamName(teamMatches[1][2]);
        
        // Extract broadcaster from channel images
        // Pattern: <img ... alt="TNT Sports 1 logo" title="TNT Sports 1" />
        const channelMatches = [...row.matchAll(/<img[^>]*class="[^"]*channel[^"]*"[^>]*(?:alt="([^"]+)"|title="([^"]+)")[^>]*>/gi)];
        
        if (channelMatches.length > 0) {
          // Get the first channel (primary broadcaster)
          const channelInfo = channelMatches[0];
          const channelText = channelInfo[1] || channelInfo[2] || '';
          const fullChannelName = channelText.replace(/\s*logo$/i, '').trim();
          const broadcaster = mapBroadcasterName(fullChannelName);
          
          const matchKey = createMatchKey(homeTeam, awayTeam);
          broadcasters[matchKey] = {
            homeTeam,
            awayTeam,
            broadcaster,
            channel: fullChannelName  // Store the specific channel name
          };
          console.log(`Scraped: ${homeTeam} vs ${awayTeam} -> key: ${matchKey} -> ${fullChannelName}`);
        }
      }
    });
    
    return broadcasters;
    
  } catch (error) {
    console.error('Scraping error:', error);
    return {};
  }
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  const competition = event.queryStringParameters?.competition || 'Premier League';
  const date = event.queryStringParameters?.date || new Date().toISOString().split('T')[0];
  
  // Check cache
  const cacheKey = `${competition}-${date}`;
  const cached = getCachedBroadcasters(cacheKey);
  
  if (cached) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'HIT'
      },
      body: JSON.stringify({ broadcasters: cached })
    };
  }
  
  // Scrape fresh data
  const broadcasters = await scrapeBroadcasters(competition, date);
  setCachedBroadcasters(cacheKey, broadcasters);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Cache': 'MISS'
    },
    body: JSON.stringify({ broadcasters })
  };
};
