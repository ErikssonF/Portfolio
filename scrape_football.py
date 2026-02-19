"""
Football TV Schedule Scraper for UK Broadcast Channels

Scrapes the following competitions:
- Carabao Cup (wheresthematch.com)
- FA Cup (wheresthematch.com)  
- Champions League (wheresthematch.com)
- Europa League (wheresthematch.com)
- Conference League (wheresthematch.com)

Note: Svenska Cupen matches are available on tvmatchen.nu but require a different
scraping approach (individual match pages). Currently not implemented.
Channels for Svenska Cupen: Expressen +Allt, TV4 Play
"""

import re
import requests
from html.parser import HTMLParser
from datetime import datetime, timedelta

class FootballScraper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_fixture = False
        self.in_channel_details = False
        self.current_game = {}
        self.games = []
        self.teams = []
        self.date_time = ""
        self.competition_stage = ""
        
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        
        # Check if we're in a fixture row
        if tag == 'tr' and any('itemscope' in str(a) for a in attrs):
            self.in_fixture = True
            self.current_game = {'teams': '', 'date': '', 'time': '', 'stage': '', 'channels': []}
            
        # Get fixture details (team names)
        if self.in_fixture and tag == 'span' and attrs_dict.get('class') == 'fixture':
            self.teams = []
            
        # Get date/time
        if self.in_fixture and tag == 'span' and 'start-details' in str(attrs):
            pass
            
        # Get channel details
        if self.in_fixture and tag == 'td' and 'channel-details' in attrs_dict.get('class', ''):
            self.in_channel_details = True
            
        # Extract channel from img title
        if self.in_channel_details and tag == 'img':
            title = attrs_dict.get('title', '')
            alt = attrs_dict.get('alt', '')
            # Get channel name from title or alt, preferring title
            channel = title if title else alt.replace(' logo', '')
            if channel and channel != 'Football' and 'logo' not in channel:
                self.current_game['channels'].append(channel)
    
    def handle_data(self, data):
        data = data.strip()
        if not data:
            return
            
        # Capture team names
        if self.in_fixture and data and ' v ' not in data and data not in ['Football', 'v']:
            # This might be part of fixture
            pass
    
    def handle_endtag(self, tag):
        if tag == 'td' and self.in_channel_details:
            self.in_channel_details = False
            
        if tag == 'tr' and self.in_fixture:
            if self.current_game.get('channels'):
                self.games.append(self.current_game.copy())
            self.in_fixture = False

def parse_date(date_str):
    """Parse date string and return datetime object or None"""
    try:
        # Remove day prefix like "Today", "Tomorrow", "Tonight", etc.
        date_str = re.sub(r'<[^>]*>', '', date_str)  # Remove HTML tags
        date_str = re.sub(r'(Today|Tomorrow|Tonight|Last Week|This Week)\s*', '', date_str)
        
        # Try to parse dates like "Wed 18th February 2026"
        for fmt in ['%a %dst %B %Y', '%a %dnd %B %Y', '%a %drd %B %Y', '%a %dth %B %Y',
                    '%A %dst %B %Y', '%A %dnd %B %Y', '%A %drd %B %Y', '%A %dth %B %Y']:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except:
                pass
        return None
    except:
        return None

def scrape_url(url, competition_name):
    print(f"\n{'='*60}")
    print(f"{competition_name}")
    print(f"{'='*60}")
    
    response = requests.get(url)
    html = response.text
    
    # Find all game entries using regex
    game_pattern = r'<tr[^>]*itemscope[^>]*>.*?</tr>'
    games = re.findall(game_pattern, html, re.DOTALL)
    
    results = []
    for game_html in games:
        # Extract team names
        team_pattern = r'<span class="fixture">.*?<em[^>]*>(.*?)</em>.*?v.*?<em[^>]*>(.*?)</em>'
        team_match = re.search(team_pattern, game_html, re.DOTALL)
        
        # Extract date/time
        date_pattern = r'<span>(?:<span[^>]*>.*?</span>)?(.*?)</span>\s*<span class="time">(.*?)</span>'
        date_match = re.search(date_pattern, game_html)
        
        # Extract stage
        stage_pattern = r'<span class="fixture-stage">(.*?)</span>|<span class="stage"><em[^>]*>(.*?)</em></span>'
        stage_match = re.search(stage_pattern, game_html)
        
        # Extract channels from title attributes
        channel_pattern = r'<td class="channel-details">.*?</td>'
        channel_section = re.search(channel_pattern, game_html, re.DOTALL)
        
        channels = []
        if channel_section:
            # Get all title attributes from img tags in channel section
            title_pattern = r'title="([^"]+)"'
            titles = re.findall(title_pattern, channel_section.group(0))
            # Filter out non-channel titles
            channels = [t for t in titles if t not in ['Football'] and 'logo' not in t.lower()]
        
        if team_match and channels:
            home_team = team_match.group(1).strip()
            away_team = team_match.group(2).strip()
            
            date = date_match.group(1).strip() if date_match else "Unknown"
            time = date_match.group(2).strip() if date_match else "Unknown"
            
            stage = ""
            if stage_match:
                stage = stage_match.group(1) or stage_match.group(2) or ""
                stage = stage.strip()
            
            result = {
                'home': home_team,
                'away': away_team,
                'date': date,
                'time': time,
                'stage': stage,
                'channels': channels,
                'competition': competition_name,
                'date_obj': parse_date(date)
            }
            results.append(result)
    
    # Print results
    if results:
        for idx, game in enumerate(results, 1):
            print(f"\nGame {idx}:")
            print(f"  {game['home']} vs {game['away']}")
            print(f"  Date: {game['date']}")
            print(f"  Time: {game['time']}")
            print(f"  Stage: {game['stage']}")
            print(f"  Channels: {', '.join(game['channels'])}")
    else:
        print("\nNo upcoming games found or past games shown.")
    
    return results

# Scrape all competitions
all_results = []

competitions = [
    ('https://www.wheresthematch.com/carabao-cup-on-tv/', 'CARABAO CUP'),
    ('https://www.wheresthematch.com/live-fa-cup-football-on-tv/', 'FA CUP'),
    ('https://www.wheresthematch.com/live-champions-league-football-on-tv/', 'CHAMPIONS LEAGUE'),
    ('https://www.wheresthematch.com/live-europa-league-football-on-tv/', 'EUROPA LEAGUE'),
    ('https://www.wheresthematch.com/live-europa-conference-league-football-on-tv/', 'CONFERENCE LEAGUE'),
]

competition_counts = {}
for url, name in competitions:
    results = scrape_url(url, name)
    competition_counts[name] = len(results)
    all_results.extend(results)

# Filter games for this week
print(f"\n{'='*60}")
print("THIS WEEK'S GAMES")
print(f"{'='*60}")

today = datetime.now()
week_end = today + timedelta(days=7)

this_week_games = [
    game for game in all_results 
    if game['date_obj'] and today <= game['date_obj'] <= week_end
]

# Sort by date
this_week_games.sort(key=lambda x: x['date_obj'])

if this_week_games:
    for idx, game in enumerate(this_week_games, 1):
        print(f"\nGame {idx}:")
        print(f"  Competition: {game['competition']}")
        print(f"  {game['home']} vs {game['away']}")
        print(f"  Date: {game['date']}")
        print(f"  Time: {game['time']}")
        print(f"  Stage: {game['stage']}")
        print(f"  Channels: {', '.join(game['channels'])}")
else:
    print("\nNo games scheduled for this week.")

print(f"\n{'='*60}")
print("SUMMARY")
print(f"{'='*60}")
for name, count in competition_counts.items():
    print(f"{name}: {count} games")
print(f"\nTHIS WEEK: {len(this_week_games)} games")
