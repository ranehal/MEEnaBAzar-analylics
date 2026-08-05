@echo off
setlocal

echo ==========================================
echo    MEENAtracker - PRO DEVELOPER VIEW
echo ==========================================

:: 1. Launch Backend API
echo Launching FastAPI Backend...
start "MEENAtracker Backend" cmd /k "cd backend && python main.py"

:: 2. Launch Frontend
echo Launching Vite Frontend...
start "MEENAtracker Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ==========================================
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo ==========================================
echo.
set /p SCRAPE="Do you want to run the Scraper now? (y/n): "

if /i "%SCRAPE%"=="y" (
    echo Running Scraper...
    cd backend
    python scraper.py
    pause
)

echo Done. Keep the other windows open to use the site.
pause
