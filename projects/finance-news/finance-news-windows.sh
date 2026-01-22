#!/bin/bash

# Finance News Fetcher for Windows (via Git Bash/WSL)
# Fetches top finance news from Swedish sources and generates HTML

# Change to script directory
cd "$(dirname "$0")"

# Output file
OUTPUT_FILE="finance-news.html"
CURRENT_DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "=================================================="
echo "  📰 Swedish Finance News Aggregator"
echo "  $CURRENT_DATE"
echo "=================================================="
echo ""

# Colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Temporary directory for downloads
TEMP_DIR=$(mktemp -d -t finance-news-XXXXXX)
TEMP_CONTENT="$TEMP_DIR/content.txt"
trap "rm -rf $TEMP_DIR" EXIT

# Initialize HTML file
cat > "$OUTPUT_FILE" << 'HTMLHEAD'
<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Swedish Finance News</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(120deg, #f6f7f8 0%, #eef1f3 50%, #f6f7f8 100%);
            padding: 20px;
            min-height: 100vh;
            color: #1f2933;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            background: #ffffff;
            padding: 30px;
            border-radius: 16px;
            box-shadow: 0 14px 40px rgba(17, 24, 39, 0.08);
            margin-bottom: 30px;
            text-align: center;
            border: 1px solid #e6eaee;
        }
        .header h1 {
            color: #0f172a;
            font-size: 2.4em;
            margin-bottom: 10px;
            letter-spacing: -0.5px;
        }
        .header .date {
            color: #6b7280;
            font-size: 1.05em;
        }
        .news-section {
            background: #ffffff;
            padding: 24px;
            border-radius: 14px;
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
            margin-bottom: 20px;
            transition: transform 0.2s, box-shadow 0.2s;
            border: 1px solid #e6eaee;
        }
        .news-section:hover {
            transform: translateY(-3px);
            box-shadow: 0 16px 36px rgba(15, 23, 42, 0.12);
        }
        .news-section h2 {
            color: #111827;
            font-size: 1.7em;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #cfd6de;
            letter-spacing: -0.2px;
        }
        .news-section .source-link {
            display: inline-block;
            margin-bottom: 15px;
            color: #2563eb;
            text-decoration: none;
            font-weight: 500;
        }
        .news-section .source-link:hover {
            text-decoration: underline;
        }
        .news-item {
            padding: 12px 0;
            border-bottom: 1px solid #e8ecf0;
            color: #374151;
            line-height: 1.6;
        }
        .news-item:last-child {
            border-bottom: none;
        }
        .news-item:before {
            content: "• ";
            color: #9ca3af;
        }
        .news-item a {
            color: #0f172a;
            text-decoration: none;
            font-weight: 600;
        }
        .news-item a:hover {
            text-decoration: underline;
        }
        .news-indicator {
            display: inline-block;
            margin-left: 8px;
            font-weight: bold;
        }
        .rising {
            color: #22863a;
        }
        .falling {
            color: #cb2431;
        }
        .footer {
            text-align: center;
            color: white;
            margin-top: 30px;
            padding: 20px;
            font-size: 0.9em;
        }
        .refresh-btn {
            background: #111827;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 24px;
            font-size: 1em;
            cursor: pointer;
            margin-top: 10px;
            transition: background 0.2s, transform 0.2s;
        }
        .refresh-btn:hover {
            background: #1f2937;
            transform: translateY(-1px);
        }
        .news-columns {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 20px;
            margin-top: 15px;
        }
        .news-column {
            background: #f9fafb;
            padding: 15px;
            border-radius: 10px;
            border: 1px solid #e6eaee;
        }
        .news-column h4 {
            color: #111827;
            font-size: 1em;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #d5dbe3;
            letter-spacing: -0.1px;
        }
        .news-column .news-item {
            padding: 8px 0;
            font-size: 0.95em;
        }
        .news-column .news-item:before {
            content: "› ";
            color: #9ca3af;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📰 Swedish Finance News</h1>
HTMLHEAD

echo "            <div class=\"date\">$CURRENT_DATE</div>" >> "$OUTPUT_FILE"
echo '            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>' >> "$OUTPUT_FILE"
echo '        </div>' >> "$OUTPUT_FILE"

# Function to fetch and parse news from a URL
fetch_news() {
    local source_name=$1
    local url=$2
    
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}📍 $source_name${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Start HTML section
    echo "        <div class=\"news-section\">" >> "$OUTPUT_FILE"
    echo "            <h2>$source_name</h2>" >> "$OUTPUT_FILE"
    echo "            <a href=\"$url\" target=\"_blank\" class=\"source-link\">🔗 Visit source</a>" >> "$OUTPUT_FILE"
    
    # Fetch the page
    local content=$(curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "$url")
    
    if [ -z "$content" ]; then
        echo "  ⚠️  Failed to fetch content from $source_name"
        echo "            <div class=\"news-item\">Could not fetch content. Please check your internet connection.</div>" >> "$OUTPUT_FILE"
        echo "        </div>" >> "$OUTPUT_FILE"
        echo ""
        return
    fi
    
    # Save content to temp file
    local temp_file="$TEMP_DIR/${source_name// /_}.html"
    echo "$content" > "$temp_file"
    
    # Parse based on source
    > "$TEMP_CONTENT"  # Clear temp content file
    case $source_name in
        "Dagens Industri")
            parse_di "$temp_file"
            ;;
        "Avanza")
            parse_avanza "$temp_file"
            ;;
        "Aftonbladet Ekonomi")
            parse_aftonbladet "$temp_file"
            ;;
        "Sveriges Riksbank")
            fetch_riksbanken_columns
            return
            ;;
    esac
    
    # Add parsed content to HTML
    if [ -s "$TEMP_CONTENT" ]; then
        while IFS= read -r line; do
            # Remove bullet point and add as HTML item
            clean_line="${line#*• }"
            # Check if line contains a URL (format: "Title ||| URL")
            if echo "$clean_line" | grep -q "|||"; then
                title="${clean_line%|||*}"
                title="${title% }"  # Remove trailing space
                url="${clean_line#*|||}"
                url="${url# }"   # Remove leading space
                indicator=$(echo "$clean_line" | grep -o '\[↑\|↓\]' || true)
                echo "            <div class=\"news-item\"><a href=\"$url\" target=\"_blank\">$title</a> <span class=\"news-indicator\">$indicator</span></div>" >> "$OUTPUT_FILE"
            else
                echo "            <div class=\"news-item\">$clean_line</div>" >> "$OUTPUT_FILE"
            fi
        done < "$TEMP_CONTENT"
    else
        echo "            <div class=\"news-item\">No news items found</div>" >> "$OUTPUT_FILE"
    fi
    
    echo "        </div>" >> "$OUTPUT_FILE"
    echo ""
}

# Parse Dagens Industri
parse_di() {
    local file=$1
    local rss_content=$(curl -s -L -A "Mozilla/5.0" "https://www.di.se/rss")

    if [ -n "$rss_content" ]; then
        echo "$rss_content" | perl -0777 -ne '
            use strict; use warnings;
            my $xml = $_;
            my $count = 0;
            while ($xml =~ m{<item>.*?<title><!\[CDATA\[(.*?)\]\]></title>.*?<link>(.*?)</link>}sg) {
                my ($t, $u) = ($1, $2);
                $t =~ s/&amp;/&/g; $t =~ s/&quot;/"/g; $t =~ s/&#39;/'\''/g;
                $t =~ s/&#x([0-9A-Fa-f]+);/chr(hex($1))/eg; $t =~ s/&#([0-9]+);/chr($1)/eg;
                $t =~ s/\s+/ /g; $t =~ s/^\s+|\s+$//g;
                next unless length($t) > 5 && length($u) > 10;
                print "  • $t ||| $u\n";
                last if ++$count >= 6;
            }
        ' | tee -a "$TEMP_CONTENT"
    fi

    if [ ! -s "$TEMP_CONTENT" ]; then
        echo "  • ℹ️ Besök di.se för aktuella rubriker" | tee -a "$TEMP_CONTENT"
    fi
}

# Parse Avanza
parse_avanza() {
    local file=$1
    
    echo "  • 📊 Börsen idag – Aktiekurser och marknadsöversikt ||| https://www.avanza.se/borsen-idag.html" | tee -a "$TEMP_CONTENT"
    
    local tele_content=$(curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "https://www.avanza.se/placera/telegram.html")
    local tele_file="$TEMP_DIR/avanza_telegram.html"
    echo "$tele_content" > "$tele_file"

    local telegrams=$(perl -C -0777 -ne '
        use utf8;
        binmode(STDOUT, ":utf8");
        my $json = $_;
        my $block;
        if ($json =~ /\\"telegrams\\":\[(.*?)\],\\"pressReleases\\"/s) {
            $block = $1;
            $block =~ s/\\"/"/g;
            $block =~ s/\\\\/\\/g;
        } elsif ($json =~ /"telegrams":\[(.*?)\],"pressReleases"/s) {
            $block = $1;
        } else {
            next;
        }

        my $count = 0;
        while ($block =~ /"title":"(.*?)".*?"publishedAt":"(\d{4})-(\d{2})-(\d{2})T.*?"slug":"(.*?)"/sg) {
            my ($title, $y, $m, $d, $slug) = ($1, $2, $3, $4, $5);
            $title =~ s/\\u([0-9a-fA-F]{4})/chr(hex($1))/ge;
            $title =~ s/\\"/"/g; $title =~ s/\\n/ /g; $title =~ s/\\u0026/&/g;
            $title =~ s/\s+/ /g; $title =~ s/^\s+|\s+$//g;
            $title = lc($title);
            substr($title, 0, 1) = uc(substr($title, 0, 1));
            my $url = "https://www.placera.se/telegram/$slug";
            print "$title ||| $url\n";
            last if ++$count >= 12;
        }
    ' "$tele_file")

    if [ -n "$telegrams" ]; then
        echo "$telegrams" | head -n 8 | while IFS= read -r line; do echo "  • $line"; done | tee -a "$TEMP_CONTENT"
    fi

    if [ ! -s "$TEMP_CONTENT" ]; then
        echo "  • ℹ️ Besök avanza.se för realtidsdata" | tee -a "$TEMP_CONTENT"
    fi
}

# Parse Aftonbladet Ekonomi
parse_aftonbladet() {
    local file=$1
    local rss_url="https://rss.aftonbladet.se/rss2/small/pages/sections/minekonomi"
    local rss_content=$(curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "$rss_url")
    
    {
        echo "$rss_content" | perl -0777 -ne '
            my $count = 0;
            while (/<item>.*?<title>(.*?)<\/title>.*?<link>(.*?)<\/link>/sg) {
                my ($title, $link) = ($1, $2);
                $title =~ s/<!\[CDATA\[(.*?)\]\]>/$1/sg;
                $title =~ s/&amp;/&/g; $title =~ s/&quot;/"/g; $title =~ s/&#39;/'\''/g;
                $title =~ s/\s+/ /g; $title =~ s/^\s+|\s+$//g;
                next if $title =~ /^\s*$/;
                print "$title ||| $link\n";
                last if ++$count >= 6;
            }
        '
    } | grep -v "^$" | sort -u | head -n 6 | while IFS= read -r line; do echo "  • $line"; done | tee -a "$TEMP_CONTENT"
    
    if [ ! -s "$TEMP_CONTENT" ]; then
        echo "  • ℹ️ Besök aftonbladet.se/ekonomi för senaste ekonominyheterna" | tee -a "$TEMP_CONTENT"
    fi
}

# Fetch Riksbanken news from 5 different columns
fetch_riksbanken_columns() {
    local url_1="https://www.riksbank.se/sv/press-och-publicerat/nyheter-och-pressmeddelanden/nyheter-om-riksbanken/"
    local url_2="https://www.riksbank.se/sv/press-och-publicerat/nyheter-och-pressmeddelanden/nyheter-om-betalningar-och-kontanter/"
    local url_3="https://www.riksbank.se/sv/press-och-publicerat/nyheter-och-pressmeddelanden/nyheter-om-penningpolitik/"
    local url_4="https://www.riksbank.se/sv/press-och-publicerat/nyheter-och-pressmeddelanden/nyheter-om-finansiell-stabilitet/"
    local url_5="https://www.riksbank.se/sv/press-och-publicerat/nyheter-och-pressmeddelanden/nyheter-om-marknader/"
    
    local title_1="Riksbanken"
    local title_2="Betalningar & kontanter"
    local title_3="Penningpolitik"
    local title_4="Finansiell stabilitet"
    local title_5="Marknader"
    
    echo "        <div class=\"news-columns\">" >> "$OUTPUT_FILE"
    
    for i in 1 2 3 4 5; do
        eval "url=\$url_$i"
        eval "title=\$title_$i"
        
        echo "            <div class=\"news-column\">" >> "$OUTPUT_FILE"
        echo "                <h4>$title</h4>" >> "$OUTPUT_FILE"
        
        local temp_page="$TEMP_DIR/rik_col_$i.html"
        local temp_items="$TEMP_DIR/rik_items_$i.txt"
        
        curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "$url" -o "$temp_page" 2>/dev/null
        
        LC_ALL=sv_SE.UTF-8 perl -0777 -CSDA -ne '
            use utf8;
            binmode(STDIN,  ":utf8");
            binmode(STDOUT, ":utf8");
            sub dec { 
                my($s)=@_; 
                $s =~ s/&amp;/&/g; $s =~ s/&quot;/"/g; $s =~ s/&#39;/'\''/g; 
                $s =~ s/&aring;/å/g; $s =~ s/&#229;/å/g; $s =~ s/&#xE5;/å/g;
                $s =~ s/&auml;/ä/g; $s =~ s/&#228;/ä/g; $s =~ s/&#xE4;/ä/g;
                $s =~ s/&ouml;/ö/g; $s =~ s/&#246;/ö/g; $s =~ s/&#xF6;/ö/g;
                $s =~ s/&Aring;/Å/g; $s =~ s/&#197;/Å/g; $s =~ s/&#xC5;/Å/g;
                $s =~ s/&Auml;/Ä/g; $s =~ s/&#196;/Ä/g; $s =~ s/&#xC4;/Ä/g;
                $s =~ s/&Ouml;/Ö/g; $s =~ s/&#214;/Ö/g; $s =~ s/&#xD6;/Ö/g;
                $s =~ s/&rsquo;/'\''/g; $s =~ s/&lsquo;/'\''/g;
                $s =~ s/&rdquo;/"/g; $s =~ s/&ldquo;/"/g;
                $s =~ s/&ndash;/-/g; $s =~ s/&mdash;/—/g;
                $s =~ s/&#x([0-9A-Fa-f]+);/chr(hex($1))/eg; 
                $s =~ s/&#([0-9]+);/chr($1)/eg; 
                return $s; 
            }
            my $html = $_; my $count = 0;
            while ($html =~ m{<a\s+href="(/sv/press-och-publicerat/[^"]+)"[^>]*>\s*<span\s+class="date-and-category">([^<]+)</span>\s*<h2[^>]*>(.*?)</h2>\s*</a>}sg) {
                my ($u, $dc, $h2_content) = ($1, $2, $3);
                $h2_content =~ s/<[^>]+>//g;
                my $t = $h2_content;
                $dc = dec($dc); $t = dec($t);
                $dc =~ s/^\s+|\s+$//g; $t =~ s/^\s+|\s+$//g; $t =~ s/\s+/ /g;
                print "$dc $t ||| https://www.riksbank.se$u\n";
                last if ++$count >= 5;
            }
        ' "$temp_page" > "$temp_items"
        
        if [ -s "$temp_items" ]; then
            while read -r line; do
                item_text="${line%|||*}"
                item_text="${item_text% }"
                item_url="${line#*|||}"
                item_url="${item_url# }"
                item_url="${item_url%$'\n'}"
                
                if [ -n "$item_text" ] && [ -n "$item_url" ]; then
                    echo "                <div class=\"news-item\"><a href=\"$item_url\" target=\"_blank\">$item_text</a></div>" >> "$OUTPUT_FILE"
                fi
            done < "$temp_items"
        else
            echo "                <div class=\"news-item\"><a href=\"$url\" target=\"_blank\">📰 Visa senaste nyheterna</a></div>" >> "$OUTPUT_FILE"
        fi
        
        echo "            </div>" >> "$OUTPUT_FILE"
    done
    
    echo "        </div>" >> "$OUTPUT_FILE"
}

# Main execution
echo -e "${BLUE}🔍 Fetching latest finance news...${NC}"
echo ""

fetch_news "Dagens Industri" "https://www.di.se"
fetch_news "Avanza" "https://www.avanza.se/marknadsoversikt.html"
fetch_news "Aftonbladet Ekonomi" "https://www.aftonbladet.se/ekonomi"
fetch_news "Sveriges Riksbank" "https://www.riksbank.se/sv/press-och-publicerat/"

# Close HTML
cat >> "$OUTPUT_FILE" << 'HTMLFOOT'
        <div class="footer">
            <p>Finance News Aggregator • Auto-generated report</p>
            <p>Sources: Dagens Industri, Avanza, Aftonbladet, Sveriges Riksbank</p>
            <p style="font-size: 0.85em; margin-top: 10px; opacity: 0.8;">
                Note: Some sources use JavaScript for content loading. If headlines aren't available, 
                sample data or key metrics are displayed. Visit the source websites for latest updates.
            </p>
        </div>
    </div>
</body>
</html>
HTMLFOOT

echo "=================================================="
echo -e "${GREEN}✅ News fetch complete!${NC}"
echo -e "${BLUE}📄 HTML report saved to: ${OUTPUT_FILE}${NC}"
echo "=================================================="

# Open in default browser (Windows)
if command -v cmd.exe &> /dev/null; then
    # Running in WSL
    cmd.exe /c start "$(wslpath -w "$OUTPUT_FILE")" 2>/dev/null || \
    explorer.exe "$(wslpath -w "$OUTPUT_FILE")" 2>/dev/null
elif [ -f "$PROGRAMFILES/Git/usr/bin/bash.exe" ]; then
    # Running in Git Bash
    start "$OUTPUT_FILE"
else
    echo "Open finance-news.html in your browser"
fi
