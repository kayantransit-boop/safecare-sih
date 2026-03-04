@echo off
echo ========================================
echo    SafeCare - Installation
echo ========================================
echo.
echo Installation des dependances du serveur...
cd /d %~dp0server
call npm install
echo.
echo Installation des dependances du client...
cd /d %~dp0client
call npm install
echo.
echo ========================================
echo Installation terminee !
echo Lancez LANCER.bat pour demarrer SafeCare
echo ========================================
pause
