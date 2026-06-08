@echo off
REM ============================================
REM Hands Tracker - Windows Installer
REM Developer: issu321
REM GitHub: https://github.com/issu321
REM Repository: https://github.com/issu321/Hands-Tracker-Python-Flask
REM ============================================

title Hands Tracker - Windows Installer
color 0B

echo ========================================
echo   Hands Tracker - Windows Installer
echo   Developer: issu321
echo ========================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.8 or higher from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

for /f "tokens=2" %%a in ('python --version') do set PYTHON_VERSION=%%a
echo [OK] Python found: %PYTHON_VERSION%

REM Check Python version >= 3.8
python -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python 3.8 or higher is required.
    pause
    exit /b 1
)

REM Check pip
pip --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] pip is not installed.
    echo Please install pip or reinstall Python with pip included.
    pause
    exit /b 1
)
echo [OK] pip found

REM Create virtual environment
set "SCRIPT_DIR=%~dp0"
set "VENV_DIR=%SCRIPT_DIR%venv"

echo.
echo [INFO] Creating virtual environment...
if exist "%VENV_DIR%" (
    echo [INFO] Removing old virtual environment...
    rmdir /s /q "%VENV_DIR%"
)
python -m venv "%VENV_DIR%"
if errorlevel 1 (
    echo [ERROR] Failed to create virtual environment.
    pause
    exit /b 1
)
echo [OK] Virtual environment created

REM Activate virtual environment
echo [INFO] Activating virtual environment...
call "%VENV_DIR%\Scriptsctivate.bat"

REM Upgrade pip
echo [INFO] Upgrading pip...
python -m pip install --upgrade pip

REM Install dependencies
echo [INFO] Installing dependencies...
if exist "%SCRIPT_DIR%requirements.txt" (
    pip install -r "%SCRIPT_DIR%requirements.txt"
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed successfully
) else (
    echo [ERROR] requirements.txt not found!
    pause
    exit /b 1
)

REM Create start.bat
echo [INFO] Creating start.bat...
(
    echo @echo off
    echo title Hands Tracker
color 0B
    echo set "SCRIPT_DIR=%%~dp0"
    echo call "%%SCRIPT_DIR%%venv\Scriptsctivate.bat"
    echo cd /d "%%SCRIPT_DIR%%"
    echo echo Starting Hands Tracker...
    echo echo Open http://localhost:5000 in your browser
    echo python app.py
    echo pause
) > "%SCRIPT_DIR%start.bat"

REM Create desktop shortcut (optional)
echo.
set /p CREATE_SHORTCUT="Create desktop shortcut? (y/n): "
if /i "%CREATE_SHORTCUT%"=="y" (
    echo [INFO] Creating desktop shortcut...
    set "SHORTCUT_PATH=%USERPROFILE%\Desktop\Hands Tracker.lnk"
    powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); $Shortcut.TargetPath = '%SCRIPT_DIR%start.bat'; $Shortcut.WorkingDirectory = '%SCRIPT_DIR%'; $Shortcut.IconLocation = 'cmd.exe,0'; $Shortcut.Save()"
    echo [OK] Desktop shortcut created
)

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo To start the application:
echo   Double-click start.bat
echo.
echo Or manually:
echo   venv\Scriptsctivate.bat
echo   python app.py
echo.
echo Then open http://localhost:5000 in your browser
echo.

REM Auto-start if requested
set /p START_NOW="Start the application now? (y/n): "
if /i "%START_NOW%"=="y" (
    echo [INFO] Starting Hands Tracker...
    cd /d "%SCRIPT_DIR%"
    python app.py
)

pause
