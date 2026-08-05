# MEENAtracker - Price Tracking Suite for Meena Bazar Online

## Project Goal
Full-fledged, pro-developer god-view price tracker for [meenabazaronline.com](https://meenabazaronline.com/). High performance, robust, and feature-rich analytics.

## Features
- **Dynamic Categorization:** Precise main and sub-category product fetching.
- **Advanced Analytics:** 
  - History graphs on item click (Max, Min, Avg, Today Change).
  - Comparison of multiple items (colored graphs).
  - Suggestions based on custom mean date range selection.
- **UI/UX:**
  - 10x5 compact grid for pro-level information density.
  - Per-unit price (big bold) vs. actual price (small).
  - Sorting: Name, per-unit price, actual price.
  - Filtering: Multi-select per kg, ltr, piece.
- **Customization:**
  - Favorites (copies to a new category).
  - User-defined custom categories with custom items.
  - Category sidebar with "Select All" toggle.
- **Performance:** Performance-centric, robust scraping and rendering.

## Tech Stack
- **Frontend:** React + TypeScript + Vanilla CSS
- **Backend:** FastAPI (Python)
- **Scraper:** Playwright (Angular-friendly scraping)
- **Database:** SQLite (local persistent storage)

## Project Structure
- `backend/`: API, Scraper, DB models.
- `frontend/`: React components, charts, state management.
- `MEENAtracker.md`: This tracking document.
