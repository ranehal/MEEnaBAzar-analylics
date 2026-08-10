import asyncio
import json
import os
import platform
import random
import re
import subprocess
import sys
import traceback
from playwright.async_api import async_playwright
from datetime import datetime, timezone
from database import async_session, Category, Product, PriceHistory, init_db
from sqlalchemy.future import select

BASE_URL = "https://meenabazaronline.com"

PARALLEL_CATEGORIES = 4

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
]


def ensure_playwright_browser():
    """Verify the Chromium binary exists; auto-install it if missing.

    On Kaggle a disk-full (Errno 28) or missing browser silently breaks
    browser.launch(), which surfaces as a bare asyncio/Connection.run()
    crash. This makes the problem visible and self-healing instead.
    """
    try:
        dry = subprocess.run(
            [sys.executable, "-m", "playwright", "install", "--dry-run", "chromium"],
            capture_output=True, text=True, timeout=120
        )
        out = ((dry.stdout or "") + (dry.stderr or "")).lower()
        if "already installed" in out:
            print("[Preflight] Chromium browser verified OK.")
            return
        print("[Preflight] Chromium browser missing. Installing...")
    except Exception as e:
        print(f"[Preflight] Chromium probe failed ({e}); attempting install anyway.")

    cmd = [sys.executable, "-m", "playwright", "install", "chromium", "--with-deps"]
    if platform.system() != "Linux":
        cmd = [sys.executable, "-m", "playwright", "install", "chromium"]
    for attempt in range(2):
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if r.returncode == 0:
            print("[Preflight] Chromium browser installed.")
            return
        cmd = [sys.executable, "-m", "playwright", "install", "chromium"]
        print(f"[Preflight] Chromium install failed: {(r.stderr or r.stdout or '')[:300]}")
    print("[Preflight] CRITICAL: Chromium install failed. Browser launch will crash.")
    print("[Preflight] Check disk space (df -h /kaggle/working) and network access.")

async def scrape_categories(page):
    """Return hardcoded categories as requested by the user."""
    print("Using hardcoded categories...")
    return [
        {"name": "Fish", "url": "https://meenabazaronline.com/category/fish"},
        {"name": "Meat", "url": "https://meenabazaronline.com/category/meat"},
        {"name": "Fruits", "url": "https://meenabazaronline.com/category/fruits"},
        {"name": "Vegetables", "url": "https://meenabazaronline.com/category/vegetables"},
        {"name": "Dairy", "url": "https://meenabazaronline.com/category/dairy"},
        {"name": "Frozen", "url": "https://meenabazaronline.com/category/frozen"},
        {"name": "Grocery", "url": "https://meenabazaronline.com/category/grocery"},
        {"name": "Personal Care", "url": "https://meenabazaronline.com/category/generalmerchandise"},
        {"name": "House Hold", "url": "https://meenabazaronline.com/category/household"},
        {"name": "Stationery", "url": "https://meenabazaronline.com/category/stationery"},
        {"name": "Apparel & Linen", "url": "https://meenabazaronline.com/category/apparel&linen"},
        {"name": "Pharmacy", "url": "https://meenabazaronline.com/category/pharmacy"},
        {"name": "Kitchen Ware", "url": "https://meenabazaronline.com/category/kitchenware"}
    ]

async def scrape_products_in_category(page, category_url):
    print(f"\n[Scraping Category] {category_url}")
    try:
        await page.goto(category_url, wait_until="domcontentloaded", timeout=60000)
        
        # Handle Delivery Area Modal if it appears
        try:
            # Check if the modal input exists
            location_input = await page.wait_for_selector('.ant-select-selection-search-input', timeout=5000)
            if location_input:
                print(" -> Delivery Area Modal detected. Selecting location...")
                await location_input.click()
                await location_input.fill('khilgaon')
                await asyncio.sleep(2)
                await page.keyboard.press('Enter')
                await asyncio.sleep(2)
                # Click the first dropdown item if Enter didn't work
                options = await page.query_selector_all('.ant-select-item-option')
                if options:
                    await options[0].click()
                await asyncio.sleep(3)
        except Exception:
            pass # No modal appeared
            
        await page.wait_for_selector('app-thumb', timeout=30000) # Increased timeout for slow APIs
    except Exception as e:
        print(f"No products found or timeout in {category_url}: {e}")
        return []
    
    last_height = await page.evaluate("document.body.scrollHeight")
    scroll_attempts = 0
    max_scrolls = 200 # Up to 200 scrolls for very large categories (5k+ items)
    empty_scrolls = 0

    while scroll_attempts < max_scrolls:
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await asyncio.sleep(2.5) # Wait for API response and DOM render
        
        new_height = await page.evaluate("document.body.scrollHeight")
        if new_height == last_height:
            empty_scrolls += 1
            if empty_scrolls >= 3: # If height didn't change for 3 consecutive attempts, assume end of list
                break
        else:
            empty_scrolls = 0 # Reset if we successfully loaded more
            
        last_height = new_height
        scroll_attempts += 1

    product_elements = await page.query_selector_all('app-thumb')
    products = []
    
    for element in product_elements:
        try:
            name_el = await element.query_selector('.content a.font-medium')
            name = await name_el.inner_text() if name_el else "N/A"
            name = name.strip()
            
            unit_el = await element.query_selector('.content a.text-xs')
            unit = await unit_el.inner_text() if unit_el else "N/A"
            unit = unit.strip()
            
            price_el = await element.query_selector('.price span')
            price_text = await price_el.inner_text() if price_el else "0"
            actual_price = float(re.sub(r'[^\d.]', '', price_text))
            
            img_el = await element.query_selector('img')
            image_url = await img_el.get_attribute('src') if img_el else ""
            
            # Unit Price Calculation (per kg / per liter)
            unit_price = actual_price
            unit_type = "piece"
            unit_lower = unit.lower()
            
            if 'kg' in unit_lower:
                match = re.search(r'(\d+\.?\d*)\s*kg', unit_lower)
                weight = float(match.group(1)) if match else 1.0
                unit_price = actual_price / weight
                unit_type = "kg"
            elif 'gm' in unit_lower or 'g' in unit_lower.split() or bool(re.search(r'\d+g', unit_lower)):
                match = re.search(r'(\d+\.?\d*)\s*g', unit_lower)
                weight = float(match.group(1)) if match else 500.0
                unit_price = (actual_price / weight) * 1000
                unit_type = "kg"
            elif 'ltr' in unit_lower or 'l' in unit_lower.split() or bool(re.search(r'\d+l', unit_lower)):
                match = re.search(r'(\d+\.?\d*)\s*(ltr|l)', unit_lower)
                volume = float(match.group(1)) if match else 1.0
                unit_price = actual_price / volume
                unit_type = "ltr"
            elif 'ml' in unit_lower:
                match = re.search(r'(\d+\.?\d*)\s*ml', unit_lower)
                volume = float(match.group(1)) if match else 500.0
                unit_price = (actual_price / volume) * 1000
                unit_type = "ltr"
            
            unit_price = round(unit_price, 2)
            external_id = f"{name}_{unit}".replace(" ", "_").lower()

            print(f" -> Scraped: {name} | Pack: {unit} | Actual Price: TK {actual_price} | Per {unit_type}: TK {unit_price}")

            products.append({
                "external_id": external_id,
                "name": name,
                "unit": unit,
                "actual_price": actual_price,
                "unit_price": unit_price,
                "unit_type": unit_type,
                "image_url": image_url,
                "scraped_at": datetime.now(timezone.utc)
            })
        except Exception as e:
            print(f" [!] Error parsing a product: {e}")
            
    return products

async def save_to_db(category_data, products_data):
    """Save scraped data to the database."""
    async with async_session() as session:
        result = await session.execute(select(Category).filter_by(name=category_data['name']))
        db_category = result.scalars().first()
        
        if not db_category:
            db_category = Category(name=category_data['name'], url=category_data['url'])
            session.add(db_category)
            await session.commit()
            await session.refresh(db_category)
            
        for p_data in products_data:
            result = await session.execute(select(Product).filter_by(external_id=p_data['external_id']))
            db_product = result.scalars().first()
            
            if not db_product:
                db_product = Product(
                    external_id=p_data['external_id'],
                    name=p_data['name'],
                    unit=p_data['unit'],
                    unit_type=p_data['unit_type'],
                    image_url=p_data['image_url'],
                    category_id=db_category.id
                )
                session.add(db_product)
                await session.commit()
                await session.refresh(db_product)
                
            history = PriceHistory(
                product_id=db_product.id,
                actual_price=p_data['actual_price'],
                unit_price=p_data['unit_price'],
                scraped_at=p_data['scraped_at']
            )
            session.add(history)
            
        await session.commit()

async def main():
    await init_db()
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        # One page per concurrent category (bounded, not too aggressive on the site)
        pages = [
            await browser.new_page(
                user_agent=random.choice(USER_AGENTS),
                extra_http_headers={'Accept-Language': 'en-US,en;q=0.9'}
            )
            for _ in range(PARALLEL_CATEGORIES)
        ]

        categories = await scrape_categories(pages[0])

        # Scrape all hardcoded categories in parallel
        sem = asyncio.Semaphore(PARALLEL_CATEGORIES)
        total_products = 0
        cats_with_products = 0

        async def scrape_one(idx, cat):
            nonlocal total_products, cats_with_products
            async with sem:
                try:
                    page = pages[idx % len(pages)]
                    all_products = await scrape_products_in_category(page, cat['url'])
                    if all_products:
                        await save_to_db(cat, all_products)
                    total_products += len(all_products)
                    if all_products:
                        cats_with_products += 1
                    print(f"\n[Summary] Scraped {len(all_products)} products from {cat['name']}")
                except Exception as cat_err:
                    print(f"[Category Error] {cat['name']}: {cat_err}")

        await asyncio.gather(*[scrape_one(idx, cat) for idx, cat in enumerate(categories)])

        print(f"\n=== MEENA BAZAR SCRAPE COMPLETE ===")
        print(f"Total Categories: {len(categories)} ({cats_with_products} active with products)")
        print(f"Total Products Scraped: {total_products}")

        for page in pages:
            await page.close()
        await browser.close()

if __name__ == "__main__":
    ensure_playwright_browser()
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Interrupted by user.")
    except SystemExit:
        raise
    except Exception:
        full_tb = traceback.format_exc()
        print("FATAL ERROR (full traceback saved to scraper_error.log):")
        print(full_tb)
        try:
            log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scraper_error.log")
            with open(log_path, "w", encoding="utf-8") as f:
                f.write(f"{datetime.now(timezone.utc).isoformat()}\n{full_tb}")
            print(f"Traceback written to {log_path}")
        except Exception:
            pass
        sys.exit(1)
