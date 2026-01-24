# Match Finder

A web application to find football matches and discover which streaming service is broadcasting them.

## Features

- 🔴 **Live Matches**: See ongoing Premier League and Champions League matches
- 📅 **Upcoming Matches**: View schedule for the next 7 days
- 🎯 **Smart Filtering**: Filter by Live, Today, or Upcoming matches
- 📺 **Streaming Integration**: One-click access to Viaplay, C More, Max, or Prime Video
- 🔄 **Auto-Refresh**: Updates every 10 minutes with smart rate limiting
- 💾 **Response Caching**: Reduces API calls by caching data for 5 minutes
- ⚡ **Rate Limit Protection**: Tracks daily usage (100 requests/day limit)
- 🎨 **Dark Theme**: Consistent design with the rest of the portfolio

## Setup

### 1. Get a Free API Key

This app uses [API-Football](https://dashboard.api-football.com) for match data.

**⚠️ Important**: Use the official API-Football dashboard (NOT RapidAPI, which is deprecated).

1. Go to https://dashboard.api-football.com
2. Sign up for a free account
3. Subscribe to the **free tier** (100 requests/day)
4. Copy your API key from the dashboard

### 2. Enter Your API Key

1. Open the Match Finder app
2. Paste your API key in the input field
3. Click "Save Key"
4. The key is stored in your browser's local storage

## Rate Limiting & API Usage

**Free Tier Limits:**
- 100 requests per day
- Resets at midnight UTC

**How we stay within limits:**

1. **Response Caching** (5 minutes)
   - API responses are cached for 5 minutes
   - Subsequent requests within 5 minutes use cached data
   - No API call = no quota used

2. **Request Counter**
   - Tracks how many requests you've made today
   - Displays remaining requests in the UI
   - Resets automatically at midnight

3. **Smart Auto-Refresh**
   - Refreshes every 10 minutes (not 60 seconds)
   - Only refreshes if >10 requests remaining
   - Auto-disables when quota is low

4. **Manual Control**
   - You can always refresh manually
   - Error shown if daily limit is reached

**What happens if you hit the limit:**
- Error message: "Daily API limit reached (100 requests). Resets tomorrow."
- Cached data still works for 5 minutes
- Auto-refresh stops automatically
- Full functionality returns after midnight UTC

**Typical daily usage:**
- Initial load: 2 requests (Premier League + Champions League)
- Each manual refresh: 2 requests (with caching, often 0)
- Auto-refresh (every 10 min): ~12 requests in 8 hours
- **Total**: ~15-30 requests/day (well within limit!)

## Supported Competitions

- ⚽ **Premier League** → Viaplay
- 🏆 **UEFA Champions League** → C More, Viaplay

## Supported Streaming Services

- **Viaplay** (https://viaplay.se)
- **C More** (https://www.cmore.se)
- **Max** (https://www.max.com/se)
- **Prime Video** (https://www.primevideo.com)

## How It Works

1. **Fetch Matches**: The app queries the API-Football API for live and upcoming matches
2. **Cache Response**: Results cached for 5 minutes to reduce API calls
3. **Map Broadcasting Rights**: Matches are matched with Swedish streaming services based on competition
4. **One-Click Access**: Click any match to open the appropriate streaming service

## Broadcasting Rights

The broadcasting rights mapping is configured in `config.json`:

```json
{
  "Premier League": ["Viaplay"],
  "UEFA Champions League": ["C More", "Viaplay"]
}
```

**Note**: Broadcasting rights change periodically. Update `config.json` when rights change.

## Technical Stack

- **Pure JavaScript** (no frameworks)
- **API-Football** (official dashboard) for match data
- **LocalStorage** for API key & usage tracking
- **In-memory caching** for response optimization
- **CSS Grid** for responsive layout
- **Dark theme** consistent with portfolio

## Files

- `index.html` - Main application structure
- `style.css` - Dark theme styling
- `app.js` - Application logic and UI
- `api.js` - API integration with caching & rate limiting
- `config.json` - Broadcasting rights configuration

## Future Enhancements

- [ ] Add more leagues (La Liga, Serie A, Bundesliga)
- [ ] Team-specific favorites
- [ ] Desktop notifications for upcoming matches
- [ ] Calendar export (.ics)
- [ ] Match highlights after games end
- [ ] User-configurable broadcasting rights
- [ ] Persistent cache (IndexedDB)

## License

Part of Fredrik's Portfolio project.
