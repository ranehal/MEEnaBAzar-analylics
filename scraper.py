import os
import sys

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
os.chdir(backend_dir)

scraper_file = os.path.join(backend_dir, 'scraper.py')
with open(scraper_file, 'r', encoding='utf-8') as f:
    code = f.read()

exec(compile(code, scraper_file, 'exec'))
