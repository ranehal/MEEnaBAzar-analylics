# 🛒 MEENAtracker — High-Density Supermarket Price Tracker

> **Pro-Developer "God-View" Telemetry, Unit-Price Analytics & Headless Playwright Ingestion Suite for Meena Bazar Online.**

[![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Playwright](https://img.shields.io/badge/Scraper-Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)
[![SQLite3](https://img.shields.io/badge/Database-SQLite3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

---

## 📌 Executive Summary

**MEENAtracker** is a high-density, "god-view" grocery price tracker and market analytics platform engineered specifically for [Meena Bazar Online](https://meenabazaronline.com), one of Bangladesh's retail supermarket chains.

Built using **Playwright** to navigate Meena Bazar's Angular SPA client rendering, **FastAPI** as a backend service, and **React + TypeScript** for a 10x5 compact grid dashboard, MEENAtracker provides deep per-unit price analytics (`৳/kg`, `৳/ltr`, `৳/pc`), multi-item chart comparisons, and customizable user categories.

---

## 🚀 Key Features

- **🌐 Playwright Headless Angular Crawler**: Seamlessly executes client-side JavaScript to extract Angular SPA product listings without triggering anti-bot protections.
- **🖥️ 10x5 High-Density "God-View" Grid**: Optimized UI/UX delivering maximum information density, displaying bold per-unit prices (`৳/kg`) alongside actual unit prices.
- **📈 Multi-Item Chart Comparison**: Overlay multiple product price trends on a single color-coded chart with custom mean date range selection.
- **⭐ Custom Categories & Favorites**: Create user-defined category views and star favorite items saved locally.
- **🔍 Granular Sorting & Filtering**: Multi-select filters for `kg`, `ltr`, `piece`, combined with sorting by per-unit price, actual price, or item name.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Scraper_Layer ["⚡ Ingestion Engine (backend/)"]
        PW[Playwright Headless Crawler] -->|Render Angular SPA| MeenaBazar[meenabazaronline.com]
        PW -->|Extract Product & Price Telemetry| DB[(SQLite Database)]
    end

    subgraph Backend_API ["🖥️ FastAPI Service (backend/)"]
        DB -->|Query Endpoints| API[FastAPI REST Server]
        API -->|Price History & Categories| ReactUI[React + TypeScript SPA]
    end

    subgraph Frontend_UI ["📊 High-Density Dashboard (frontend/)"]
        ReactUI --> Grid[10x5 High-Density Grid]
        ReactUI --> Comparison[Multi-Item Overlay Charts]
        ReactUI --> CustomCats[Custom Favorites & Categories]
    end
```

---

## 📁 Repository Structure

```
MEENAtracker/
├── MEENAtracker.md           # Core tracking specification & documentation
├── run_all.bat               # Windows batch launcher (Backend, Scraper & Frontend)
├── backend/                  # FastAPI Backend & Scraper Engine
│   ├── main.py               # FastAPI REST endpoints
│   ├── scraper.py            # Playwright headless browser crawler
│   ├── models.py             # Database models & Pydantic schemas
│   └── database.py           # SQLite connection & transaction management
└── frontend/                 # React + TypeScript Frontend Application
    ├── src/
    │   ├── components/       # Grid cards, chart overlays, filter toolbars
    │   ├── App.tsx           # Main Dashboard application entry
    │   └── styles/           # High-density custom CSS variables
    ├── package.json          # Node.js dependencies
    └── tsconfig.json         # TypeScript compiler configuration
```

---

## 🛠️ Usage & Local Setup

### 1. Automated Windows Launcher
Run [`run_all.bat`](file:///C:/PROJECTS/MEENAtracker/run_all.bat) to launch the backend server, database, and frontend UI concurrently:
```cmd
run_all.bat
```

### 2. Manual CLI Setup

#### Backend & Scraper:
```bash
cd backend
pip install -r requirements.txt
playwright install chromium
python scraper.py    # Execute Playwright crawler
uvicorn main:app --reload --port 8000
```

#### Frontend Dashboard:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your web browser.

---

## 📜 License

Distributed under the MIT License. Data rights belong to Meena Bazar. Built for personal tracking and analytical research.
