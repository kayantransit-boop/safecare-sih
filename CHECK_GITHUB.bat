@echo off
cd /d C:\Users\HP\Desktop\SafeCare
echo === Git status ===
git status
echo.
echo === Git remote ===
git remote -v
echo.
echo === Git log ===
git log --oneline -3
echo.
pause
