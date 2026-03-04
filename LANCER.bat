@echo off
echo ========================================
echo    SafeCare - Demarrage du systeme
echo ========================================
echo.

set PGPASSWORD=CCTV@4048588

echo Demarrage du serveur API (port 3001)...
start "SafeCare API" cmd /k "cd /d %~dp0server && npm run dev"
timeout /t 4 >nul

echo Demarrage du frontend React (port 3000)...
start "SafeCare Client" cmd /k "cd /d %~dp0client && npm run dev"
timeout /t 3 >nul

echo Ouverture du navigateur...
start http://localhost:3000

echo.
echo SafeCare est demarre !
echo API  : http://localhost:3001
echo App  : http://localhost:3000
pause
