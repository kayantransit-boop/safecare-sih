@echo off
cd /d C:\Users\HP\Desktop\SafeCare

echo ========================================
echo    SafeCare - Publication sur GitHub
echo ========================================
echo.

echo [1] Configuration Git...
git config --global user.email "kayantransit@gmail.com"
git config --global user.name "kayantransit-boop"

echo [2] Ajout des fichiers...
git add -A

echo [3] Commit...
git commit -m "Initial commit - SafeCare SIH"

echo [4] Creation et push sur GitHub...
gh repo create safecare-sih --public --source=. --remote=origin --push

echo.
echo ========================================
echo TERMINE !
gh repo view --json url -q .url
echo ========================================
pause
