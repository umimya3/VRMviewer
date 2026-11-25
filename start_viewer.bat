@echo off
cd /d "%~dp0"
set PORT=8077
set URL=http://localhost:%PORT%/index.html
echo ==========================================
echo  VRM Viewer - starting local server
echo  URL: %URL%
echo  To stop: close the server window.
echo ==========================================
where py >nul 2>nul
if %ERRORLEVEL%==0 goto USE_PY
where python >nul 2>nul
if %ERRORLEVEL%==0 goto USE_PYTHON
goto USE_PS

:USE_PY
start "VRM Viewer Server" /min py -m http.server %PORT%
goto OPEN

:USE_PYTHON
start "VRM Viewer Server" /min python -m http.server %PORT%
goto OPEN

:USE_PS
echo Python not found. Using PowerShell server.
start "VRM Viewer Server" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port %PORT%
goto OPEN

:OPEN
timeout /t 2 /nobreak >nul
start "" "%URL%"
echo Browser opened. You can close this window.
timeout /t 3 /nobreak >nul
exit /b
