@echo off
set NGROK=C:\Users\HP\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe
echo Lancement du tunnel ngrok sur le port 3000...
start "" "%NGROK%" http 3000
timeout /t 4 >nul
echo Recuperation du lien public...
curl -s http://localhost:4040/api/tunnels
pause
