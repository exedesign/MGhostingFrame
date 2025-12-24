@echo off
echo MGhosting Video Watermark baslatiliyor...
echo.

REM Python virtual environment'i kontrol et
if not exist "python\venv\Scripts\activate.bat" (
    echo HATA: Python virtual environment bulunamadi!
    echo Lutfen once setup.bat dosyasini calistirin.
    pause
    exit /b 1
)

REM Uygulamayi baslat
start "" npm start

echo.
echo Uygulama baslatildi!
echo Pencere otomatik acilacak...
