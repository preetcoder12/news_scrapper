import requests
import time
import json
import os
from bs4 import BeautifulSoup
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Supabase Setup
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Define Global News Sources and their categories
NEWS_SOURCES = [
    {
        "name": "IndiaToday",
        "base_url": "https://www.indiatoday.in",
        "categories": {
            "home": "/",
            "india": "/india",
            "world": "/world",
            "business": "/business",
            "tech": "/technology"
        }
    },
    {
        "name": "BBC",
        "base_url": "https://www.bbc.com",
        "categories": {
            "home": "/",
            "news": "/news",
            "world": "/news/world",
            "business": "/news/business",
            "tech": "/news/technology"
        }
    },
    {
        "name": "CNN",
        "base_url": "https://edition.cnn.com",
        "categories": {
            "home": "/",
            "world": "/world",
            "politics": "/politics",
            "business": "/business",
            "health": "/health"
        }
    },
    {
        "name": "Reuters",
        "base_url": "https://www.reuters.com",
        "categories": {
            "home": "/",
            "world": "/world",
            "business": "/business",
            "legal": "/legal",
            "tech": "/technology"
        }
    },
    {
        "name": "AlJazeera",
        "base_url": "https://www.aljazeera.com",
        "categories": {
            "home": "/",
            "news": "/news",
            "middle_east": "/middle-east",
            "economy": "/economy",
            "science": "/where/science-and-technology"
        }
    }
]

BASE_OUTPUT_FOLDER = "extracted_data"

def create_folder(path):
    if not os.path.exists(path):
        os.makedirs(path)
    return path

def push_to_supabase(items):
    if not items:
        return
    try:
        # 1. Fetch recent titles to prevent duplicates (last 24 hours)
        recent = supabase.table("global_news").select("title").order("scraped_at", desc=True).limit(200).execute()
        existing_titles = {r['title'] for r in recent.data} if recent.data else set()

        # 2. Filter out items that already exist
        db_items = []
        for item in items:
            if item["title"] in existing_titles:
                continue
            
            db_items.append({
                "source": item["source"],
                "category": item["category"],
                "image_url": item["image_url"],
                "title": item["title"],
                "description": item["description"],
                "source_url": item.get("source_url", item["image_url"])
            })
            existing_titles.add(item["title"]) # Prevent duplicates within the same batch
        
        if db_items:
            response = supabase.table("global_news").insert(db_items).execute()
            print(f"      [+] Synced {len(db_items)} new unique items to Supabase.")
            return response
    except Exception as e:
        print(f"      [!] Supabase Error: {str(e)[:100]}")

def fetch_full_description(url, headers):
    """Deep scrape the article page if description is missing on landing page"""
    try:
        # Avoid heavy scraping, just get the head/meta or first p
        resp = requests.get(url, headers=headers, timeout=8)
        if resp.status_code == 200:
            s = BeautifulSoup(resp.text, 'html.parser')
            # 1. Check og:description (most reliable for summaries)
            og_desc = s.find('meta', property='og:description') or s.find('meta', attrs={'name': 'description'})
            if og_desc and og_desc.get('content') and len(og_desc.get('content')) > 50:
                return og_desc.get('content').strip()
            
            # 2. Fallback to first meaningful paragraph
            for p in s.find_all('p'):
                txt = p.get_text(strip=True)
                if len(txt) > 100: # Typical article intro length
                    return txt[:1000] # Cap at 1k chars
    except:
        pass
    return "No Description"

def scrape_page(source_name, base_url, category_name, path, target_dir):
    full_url = base_url + path
    print(f"    - Scraping {source_name} [{category_name}]...")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
        }
        response = requests.get(full_url, headers=headers, timeout=20)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        extracted_items = []
        
        # Enhanced keywords for containers and descriptions
        container_keywords = ['card', 'item', 'story', 'article', 'post', 'media', 'news', 'wrapper']
        desc_keywords = ['summary', 'desc', 'excerpt', 'body', 'intro', 'short', 'content', 'text', 'detail']
        
        containers = soup.find_all(['article', 'div', 'li'], class_=lambda x: x and any(c in x.lower() for c in container_keywords))
        
        if not containers:
            containers = soup.find_all('img')

        for container in containers:
            try:
                # 1. Find Image
                img = container.find('img') if container.name != 'img' else container
                if not img: continue
                
                img_url = img.get('src') or img.get('data-src') or img.get('data-original')
                if not img_url or img_url.startswith('data:image'): continue
                
                if img_url.startswith('//'): img_url = "https:" + img_url
                elif img_url.startswith('/'): img_url = base_url + img_url

                # 2. Find Title
                title_elem = container.find(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'span'], class_=lambda x: x and any(c in x.lower() for c in ['title', 'headline'])) if container.name != 'img' else None
                title = ""
                if title_elem:
                    title = title_elem.get_text(strip=True)
                
                if not title or len(title) < 5:
                    title = img.get('alt') or img.get('title') or container.get_text(strip=True)[:150]
                
                if not title or title == "No Title" or len(title) < 10: continue

                # 3. Find Source URL
                link_elem = container.find('a', href=True) if container.name != 'img' else container.find_parent('a', href=True)
                source_url = link_elem['href'] if link_elem else full_url
                if source_url.startswith('/'): source_url = base_url + source_url

                # 4. Find Description (Search with expanded keywords)
                desc_elem = container.find(['p', 'span', 'div'], class_=lambda x: x and any(c in x.lower() for c in desc_keywords))
                if not desc_elem and container.name != 'img':
                    desc_elem = container.find('p')
                
                description = ""
                if desc_elem:
                    description = desc_elem.get_text(strip=True)
                
                # Logic to clean description
                if description == title or len(description) < 20:
                    all_text = container.get_text(" ", strip=True)
                    description = all_text.replace(title, "").strip()
                
                # --- DEEP SCRAPE FALLBACK ---
                # If landing page description is still poor/missing, follow the link!
                if (not description or len(description) < 30 or "No Description" in description) and source_url != full_url:
                    print(f"      [*] Deep Scraping for better description: {title[:30]}...")
                    description = fetch_full_description(source_url, headers)

                if not description or len(description) < 10:
                    description = "No Description"

                extracted_items.append({
                    "source": source_name,
                    "category": category_name,
                    "image_url": img_url,
                    "title": title[:200],
                    "description": description,
                    "source_url": source_url,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                })
                
                if len(extracted_items) >= 30: break 

            except Exception:
                continue
        
        # Save JSON (Local Backup)
        os.makedirs(target_dir, exist_ok=True)
        with open(os.path.join(target_dir, "data.json"), "w", encoding='utf-8') as f:
            json.dump(extracted_items, f, indent=4)
            
        push_to_supabase(extracted_items)
            
        return len(extracted_items)

    except Exception as e:
        print(f"      [!] Error: {str(e)[:100]}")
        return 0

# --- MAIN ENGINE ---
print("🚀 GLOBAL MULTI-NEWS SCRAPER INITIALIZED (SUPABASE SYNC ON)")
print("Targeting: India Today, BBC, CNN, Reuters, Al Jazeera")
print("Cycle Interval: 2 Minutes | Press Ctrl+C to stop.\n")

while True:
    now = datetime.now()
    cycle_id = now.strftime("%d-%b-%Y_%I-%M-%p") 
    
    print(f"📅 STARTING CYCLE: {cycle_id}")
    
    overall_report = {
        "cycle_id": cycle_id,
        "scraped_at": now.strftime("%Y-%m-%d %H:%M:%S"),
        "sources_scraped": []
    }

    for source in NEWS_SOURCES:
        print(f"  🏢 Source: {source['name']}")
        source_report = {"name": source['name'], "categories": []}
        
        for cat_name, path in source['categories'].items():
            target_path = os.path.join(BASE_OUTPUT_FOLDER, cycle_id, source['name'], cat_name)
            create_folder(target_path)
            
            count = scrape_page(source['name'], source['base_url'], cat_name, path, target_path)
            source_report["categories"].append({"name": cat_name, "count": count})
            
            time.sleep(2)
        
        overall_report["sources_scraped"].append(source_report)

    with open(os.path.join(BASE_OUTPUT_FOLDER, cycle_id, "summary.json"), "w") as f:
        json.dump(overall_report, f, indent=4)

    print(f"✅ Cycle {cycle_id} complete. Data synced to Supabase. Waiting 2 minutes...")
    time.sleep(120)
