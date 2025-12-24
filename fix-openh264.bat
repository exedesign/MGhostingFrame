@echo off
echo MGhosting Video Watermark - Codec Fix Tool
echo =========================================
echo.
echo 1. Closing any running Python or Electron processes...
taskkill /F /IM python.exe /T >nul 2>&1
taskkill /F /IM "MGhosting Video Watermark.exe" /T >nul 2>&1
echo.

echo 2. Running OpenH264 setup...
cd python
if not exist venv (
    echo Virtual environment not found! Please run setup first.
    pause
    exit /b
)
call venv\Scripts\activate

python setup_openh264.py

echo.
echo 3. Done! 
echo If all tests failed, don't worry. 
echo The app will now use a built-in Windows fallback (mp4v).
echo.
echo Press any key to exit...
pause >nul
