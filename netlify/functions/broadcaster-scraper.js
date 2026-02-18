// Netlify Function to scrape broadcaster info from tvmatchen.nu
// Uses simple regex parsing similar to finance-news approach

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
  // Clean up team names
  return text
    .replace(/\s+/g, ' ')
    .replace(/F\.?C\.?/gi, 'FC')
    .replace(/A\.?F\.?C\.?/gi, 'AFC')
    .trim();
}

function createMatchKey(homeTeam, awayTeam) {
  // Normalize team names for matching
  const normalize = (name) => name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[.-]/g, '');
  
  return `${normalize(homeTeam)}-${normalize(awayTeam)}`;
}

async function scrapeBroadcasters(competition, date) {
  const competitionUrls = {
    'Premier League': 'https://www.tvmatchen.nu/fotboll/premier-league',
    'UEFA Champions League': 'https://www.tvmatchen.nu/fotboll/champions-league'
  };
  
  const url = competitionUrls[competition];
  if (!url) {
    return {};
  }
  
  try {
    const html = await fetchHtml(url);
    const broadcasters = {};
    
    // Look for patterns like:
    // <team>Wolves</team> ... <team>Arsenal</team> ... <channel>Prime Video</channel>
    // Or variations with Viaplay, C More, etc.
    
    // Match blocks that contain team info and broadcaster
    const matchBlocks = html.match(/<article[^>]*>.*?<\/article>/gs) || 
                       html.match(/<div[^>]*class="[^"]*match[^"]*"[^>]*>.*?<\/div>/gs) ||
                       [];
    
    matchBlocks.forEach(block => {
      // Extract team names (various patterns)
      const homeMatch = block.match(/<span[^>]*class="[^"]*(?:home|team-1)[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                       block.match(/data-home(?:-team)?="([^"]+)"/i);
      const awayMatch = block.match(/<span[^>]*class="[^"]*(?:away|team-2)[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                       block.match(/data-away(?:-team)?="([^"]+)"/i);
      
      // Extract broadcaster
      const broadcasterMatch = block.match(/<span[^>]*class="[^"]*(?:channel|broadcaster)[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                              block.match(/Viaplay|Prime\s*Video|C\s*More|Amazon/i);
      
      if (homeMatch && awayMatch) {
        const homeTeam = parseTeamName(homeMatch[1]);
        const awayTeam = parseTeamName(awayMatch[1]);
        let broadcaster = 'Viaplay'; // Default
        
        if (broadcasterMatch) {
          const bText = broadcasterMatch[1] || broadcasterMatch[0];
          if (/Prime|Amazon/i.test(bText)) {
            broadcaster = 'Prime Video';
          } else if (/C\s*More/i.test(bText)) {
            broadcaster = 'C More';
          }
        }
        
        const matchKey = createMatchKey(homeTeam, awayTeam);
        broadcasters[matchKey] = {
          homeTeam,
          awayTeam,
          broadcaster
        };
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
