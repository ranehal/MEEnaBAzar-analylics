# MEENAtracker — frontend dashboard

The MEENAtracker bazaar market terminal. A high-density price-analytics dashboard for
[Meena Bazar Online](https://meenabazaronline.com) built with React 19, TypeScript, Vite and Recharts.

## Data modes

The dashboard auto-detects its data source:

1. **Live API** — if a FastAPI backend is reachable at `http://localhost:8000`
   (`VITE_API_BASE` env var overrides it), products and per-item price history are streamed live.
2. **Static snapshot** — otherwise it falls back to `public/data/meenatracker.json`
   (a self-contained snapshot exported from the SQLite database), so the same build works
   fully static on GitHub Pages with zero backend.

Regenerate the snapshot after a scrape:

```bash
cd backend
python export_db.py
```

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build   # outputs to dist/ with relative asset paths (GitHub Pages ready)
npm run lint    # eslint
npm run preview # serve the built bundle
```

## GitHub Pages

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds `dist/` and publishes it
to the `gh-pages` branch. The site is served at
`https://<user>.github.io/MEEnaBAzar-analylics/`.

## Features

- Live market tape ticker of today's movers
- SteamDB-style price-history graphs (7D / 30D / 90D / 6M / 1Y / ALL, per-unit or pack price,
  all-time-low markers, avg reference line, recent-history table)
- Market movers panel, category-health heatmap, price-alert watchlist (localStorage)
- Sparklines on every card, smart filters, multi-select sorting, favorites
- Compare up to 5 items on one chart
- Density toggle (comfortable / compact / dense)
