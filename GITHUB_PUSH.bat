@echo off
cd /d C:\Users\HP\Desktop\SafeCare

echo Mise a jour GitHub...
git add -A
git commit -m "Production ready - Render deployment"
git push origin master

echo.
echo Termine !
pause
