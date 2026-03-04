@echo off
set PSQL="C:\Program Files\PostgreSQL\18\bin\psql.exe"
set LOG=%~dp0diagnostic_log.txt

echo SafeCare Diagnostic - %date% %time% > "%LOG%"
echo. >> "%LOG%"

echo [1] Test PostgreSQL...
%PSQL% -U postgres -c "SELECT version();" >> "%LOG%" 2>&1

echo [2] Creation base de donnees safecare...
%PSQL% -U postgres -c "CREATE DATABASE safecare;" >> "%LOG%" 2>&1

echo [3] Execution schema SQL...
%PSQL% -U postgres -d safecare -f "%~dp0database\init.sql" >> "%LOG%" 2>&1

echo [4] Verification tables...
%PSQL% -U postgres -d safecare -c "\dt" >> "%LOG%" 2>&1

echo Termine !
pause
