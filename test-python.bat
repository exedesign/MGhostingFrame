@echo off
echo Python Environment Test
echo ========================
echo.

echo [1] Python versiyonu kontrol ediliyor...
python --version
if errorlevel 1 (
    echo HATA: Python bulunamadi! Python 3.8+ yukleyin.
    pause
    exit /b 1
)
echo.

echo [2] Virtual environment kontrol ediliyor...
cd python
if not exist "venv\Scripts\python.exe" (
    echo Virtual environment bulunamadi, olusturuluyor...
    python -m venv venv
)
echo.

echo [3] Virtual environment aktif ediliyor...
call venv\Scripts\activate.bat
echo.

echo [4] Pip guncelleniyor...
python -m pip install --upgrade pip
echo.

echo [5] Bagimliliklari kuruluyor (Bu biraz surebilir)...
pip install -r requirements.txt
echo.

echo [6] Kurulumu test ediliyor...
python -c "import blind_video_watermark; print('blind-video-watermark: OK')"
python -c "import cv2; print('opencv-python: OK')"
python -c "import numpy; print('numpy: OK')"
python -c "import dtcwt; print('dtcwt: OK')"
python -c "import scipy; print('scipy: OK')"
echo.

echo [7] Watermark processor test ediliyor...
python watermark_processor.py
echo.

call venv\Scripts\deactivate.bat
cd ..

echo.
echo ========================================
echo Test tamamlandi!
echo ========================================
pause
