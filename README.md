# Fredrik's Portfolio

Personal portfolio showcasing web development projects with modern tech stack and automated workflows.

🌐 **[View Live Site](https://your-netlify-url.netlify.app)**

## Projects

### ⚽ Match Finder
Football match finder with streaming service integration for Swedish viewers.

**Features:**
- Real-time scores for Premier League & Champions League
- Broadcasting info (Viaplay, C More, Max, Prime Video)
- Smart filters (Live, Today, Upcoming)
- Rate-limited API integration via Netlify Functions

**Tech Stack:**
- Vanilla JavaScript
- API-Football integration
- Netlify Serverless Functions
- Client-side caching (5-minute)
- Per-IP rate limiting (20 req/day)

**Location:** `projects/match-finder/`

---

### 📰 Finansplock
Auto-updating Swedish finance news aggregator.

**Features:**
- Curated headlines from top finance sources
- Auto-updates every 6 hours via GitHub Actions
- Dark theme optimized for reading
- No manual updates needed

**Sources:**
- Dagens Industri
- Avanza
- Aftonbladet Ekonomi
- Sveriges Riksbank

**Tech Stack:**
- Bash scripting for web scraping
- GitHub Actions (cron schedule)
- Auto-commit workflow
- Pure HTML/CSS (no JavaScript)

**Location:** `projects/finance-news/`

---

## Tech Overview

- **Frontend:** Pure HTML/CSS/JavaScript (no frameworks)
- **Hosting:** Netlify with auto-deploy on push
- **CI/CD:** GitHub Actions for scheduled updates
- **Design:** Dark theme with green accents (#10b981)
- **APIs:** API-Football via secure serverless functions

## Local Development

### Match Finder
```bash
# Get free API key from https://dashboard.api-football.com
# Open projects/match-finder/index.html in browser
# Enter API key when prompted (localhost only)
```

### Finansplock
```bash
# Updates automatically via GitHub Actions
# To manually update:
cd projects/finance-news
bash finance-news-windows.sh
```

## Repository Structure

```
Portfolio/
├── index.html              # Landing page
├── css/styles.css          # Global dark theme styles
├── netlify/
│   ├── functions/
│   │   └── football-api.js # Serverless API proxy
│   └── netlify.toml        # Deployment config
├── projects/
│   ├── match-finder/       # Football match finder app
│   └── finance-news/       # Finance news aggregator
└── .github/
    └── workflows/
        └── update-finance-news.yml  # Auto-update schedule
```

## Auto-Updates

- **Finansplock:** Updates at 00:00, 06:00, 12:00, 18:00 UTC daily
- **Deployment:** Auto-deploys to Netlify on every push to `main`

## License

Personal portfolio - All rights reserved
