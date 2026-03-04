@echo off
cd /d C:\Users\HP\Desktop\SafeCare
git add -A
git commit -m "Fix deployment - Render API + Netlify frontend"
git push origin master
echo.
echo Termine !
pause
