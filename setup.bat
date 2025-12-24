@echo off
echo ========================================
echo MGhosting Video Watermark - Kurulum
echo ========================================
echo.

echo [1/4] Node.js bagimliliklari kuruluyor...
call npm install
if errorlevel 1 (
    echo HATA: npm install basarisiz!
    pause
    exit /b 1
)
echo.

echo [2/4] Python virtual environment olusturuluyor...
cd python
python -m venv venv
if errorlevel 1 (
    echo HATA: Python venv olusturulamadi!
    pause
    exit /b 1
)
echo.

echo [3/4] Python bagimliliklari kuruluyor...
call venv\Scripts\activate.bat
pip uninstall opencv-python -y
pip install -r requirements.txt
if errorlevel 1 (
    echo HATA: Python paketleri kurulamadi!
    pause
    exit /b 1
)

echo OpenH264 codec kuruluyor (Python)...
python setup_openh264.py

call venv\Scripts\deactivate.bat
cd ..
echo.

echo [4/4] FFmpeg ve OpenH264 kontrol ediliyor...
if exist "ffmpeg\bin\ffmpeg.exe" (
    echo FFmpeg hazir!
) else (
    echo FFmpeg indiriliyor...
    call npm run setup-ffmpeg
)

echo OpenH264 codec kuruluyor...
node scripts\setup-openh264.js
echo.

echo ========================================
echo KURULUM TAMAMLANDI!
echo ========================================
echo.
echo Uygulamayi baslatmak icin:
echo   npm start
echo.
echo Gelistirme modu icin:
echo   npm run dev
echo.
pause
