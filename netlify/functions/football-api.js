// Netlify Function to proxy API-Football requests
// This keeps your API key secure on the server

const fetch = require('node-fetch');

// Rate limiting: Track requests per IP
const requestCounts = new Map();
const RATE_LIMIT_PER_IP = 100; // Temporarily increased for testing (was 20)
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const responseCache = new Map();

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  // Clean request counts
  for (const [ip, data] of requestCounts.entries()) {
    if (data.resetTime < now) {
      requestCounts.delete(ip);
    }
  }
  
  // Clean cache
  for (const [key, data] of responseCache.entries()) {
    if (data.expiry < now) {
      responseCache.delete(key);
    }
  }
}, 60 * 60 * 1000);

function getClientIP(event) {
  return event.headers['x-forwarded-for']?.split(',')[0] || 
         event.headers['client-ip'] || 
         'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = requestCounts.get(ip);
  
  if (!userRequests) {
    requestCounts.set(ip, {
      count: 1,
      resetTime: now + 24 * 60 * 60 * 1000
    });
    return true;
  }
  
  if (now > userRequests.resetTime) {
    // Reset counter
    requestCounts.set(ip, {
      count: 1,
      resetTime: now + 24 * 60 * 60 * 1000
    });
    return true;
  }
  
  if (userRequests.count >= RATE_LIMIT_PER_IP) {
    return false;
  }
  
  userRequests.count++;
  return true;
}

function getCachedResponse(cacheKey) {
  const cached = responseCache.get(cacheKey);
  if (!cached) return null;
  
  const now = Date.now();
  if (now > cached.expiry) {
    responseCache.delete(cacheKey);
    return null;
  }
  
  return cached.data;
}

function setCachedResponse(cacheKey, data) {
  responseCache.set(cacheKey, {
    data: data,
    expiry: Date.now() + CACHE_DURATION
  });
}

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  const clientIP = getClientIP(event);
  
  // Check rate limit
  if (!checkRateLimit(clientIP)) {
    return {
      statusCode: 429,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Rate limit exceeded',
        message: `You have reached your daily limit of ${RATE_LIMIT_PER_IP} requests. Try again tomorrow.`
      })
    };
  }
  
  // Get endpoint from query parameter
  const endpoint = event.queryStringParameters?.endpoint;
  
  if (!endpoint) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing endpoint parameter' })
    };
  }
  
  // Check cache first
  const cacheKey = endpoint;
  const cachedResponse = getCachedResponse(cacheKey);
  
  if (cachedResponse) {
    console.log(`Serving cached response for: ${endpoint}`);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'HIT'
      },
      body: JSON.stringify(cachedResponse)
    };
  }
  
  // Get API key from environment variable
  const apiKey = process.env.FOOTBALL_API_KEY;
  
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }
  
  try {
    // Determine which API to use based on endpoint
    let apiUrl;
    if (endpoint.includes('/nfl/') || endpoint.includes('american-football')) {
      apiUrl = `https://v1.american-football.api-sports.io${endpoint.replace('/nfl', '')}`;
    } else {
      apiUrl = `https://v3.football.api-sports.io${endpoint}`;
    }
    
    console.log(`Fetching from API: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'x-apisports-key': apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the response
    setCachedResponse(cacheKey, data);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS'
      },
      body: JSON.stringify(data)
    };
    
  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch data',
        message: error.message 
      })
    };
  }
};
