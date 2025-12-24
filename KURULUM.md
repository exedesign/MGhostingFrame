# MGhosting Video Watermark - Kurulum Rehberi

## 🚀 Hızlı Başlangıç

### 1. Gerekli Araçları Kurun

#### Node.js Kurulumu
1. [Node.js İndir](https://nodejs.org/) (LTS sürümü önerilir)
2. Kurulumu test edin:
```bash
node --version
npm --version
```

#### Python Kurulumu
1. [Python İndir](https://www.python.org/downloads/) (3.8 veya üzeri)
2. **ÖNEMLİ**: Kurulum sırasında "Add Python to PATH" seçeneğini işaretleyin
3. Kurulumu test edin:
```bash
python --version
pip --version
```

#### FFmpeg Kurulumu

**Otomatik (Önerilen):**

FFmpeg, `npm install` komutu sırasında otomatik olarak indirilir ve projeye dahil edilir. Ekstra bir işlem yapmanıza gerek yoktur!

**Manuel Kurulum (Sadece geliştirme için gerekirse):**

Sistem PATH'ine FFmpeg eklemek isterseniz:
1. [FFmpeg İndir](https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip)
2. ZIP dosyasını çıkartın (örn: `C:\ffmpeg`)
3. Sistem PATH'ine ekleyin:
   - Windows Arama'da "env" yazın
   - "Sistem ortam değişkenlerini düzenle" seçin
   - "Ortam Değişkenleri" butonuna tıklayın
   - "Path" değişkenini seçin ve "Düzenle"
   - "Yeni" butonuna tıklayın
   - FFmpeg bin klasörünü ekleyin: `C:\ffmpeg\bin`
   - Tüm pencereleri "Tamam" ile kapatın
4. **Terminali yeniden başlatın** ve test edin:
```bash
ffmpeg -version
```

### 2. Proje Kurulumu

#### Node.js Bağımlılıklarını Kurun
```bash
cd MGhostingFrame
npm install
```

#### Python Virtual Environment Oluşturun
```bash
cd python

# Virtual environment oluştur
python -m venv venv

# Aktif et (Windows)
venv\Scripts\activate

# Aktif et (Linux/Mac)
source venv/bin/activate

# Bağımlılıkları kur
pip install -r requirements.txt
```

**Not**: Python bağımlılıklarının kurulumu birkaç dakika sürebilir (özellikle OpenCV).

### 3. Email Yapılandırması (Opsiyonel)

**Email ayarlarını uygulama içinden yapın:**

1. Uygulamayı başlatın: `npm start`
2. "Ayarlar" sekmesine gidin
3. "Email (SMTP) Yapılandırması" bölümünde:
   - SMTP Host: `smtp.gmail.com` (Gmail için)
   - Port: `587`
   - Email adresinizi girin
   - Uygulama şifrenizi girin
4. "Ayarları Kaydet" butonuna tıklayın
5. "Test Email Gönder" ile test edin

#### Gmail için App Password Oluşturma:

1. [Google Hesap Güvenliği](https://myaccount.google.com/security) sayfasına gidin
2. "İki Adımlı Doğrulama"yı aktifleştirin
3. [Uygulama Şifreleri](https://myaccount.google.com/apppasswords) sayfasından yeni şifre oluşturun
4. Oluşturulan 16 karakterlik şifreyi uygulamadaki SMTP ayarlarına girin

### 4. Uygulamayı Başlatın

```bash
npm start
```

Geliştirme modu için (DevTools açık):
```bash
npm run dev
```

## 🔧 Sorun Giderme

### Python Hatası: "blind-video-watermark not found"
```bash
cd python
venv\Scripts\activate
pip install blind-video-watermark
```

### OpenH264 Codec Hatası: "Incorrect library version loaded"

OpenCV 4.10+ sürümleri Windows'ta OpenH264 **2.1.1** veya **2.3.1** sürümünü bekler, ancak dosya adı olarak hala `openh264-1.8.0-win64.dll` arayabilir. Bu durum "Incorrect library version" hatasına yol açar.

**Çözüm 1 (Önerilen):**
Uygulama artık Windows'ta otomatik olarak `mp4v` codec'ine geçiş yapacak şekilde yamalanmıştır. Bu codec Windows'ta yerleşik olarak bulunur ve ek DLL gerektirmez.

**Çözüm 2 (Manuel DLL Güncelleme):**
Eğer mutlaka H264 kullanmak istiyorsanız:
1. [OpenH264 2.1.1](http://ciscobinary.openh264.org/openh264-2.1.1-win64.dll.bz2) sürümünü indirin.
2. Dosyayı çıkartın ve adını `openh264-1.8.0-win64.dll` olarak değiştirin.
3. Bu dosyayı `python/venv/Lib/site-packages/cv2/` klasörüne kopyalayın.

**Çözüm 3 (Otomatik Fix):**
```bash
python python/setup_openh264.py
```
(Bu script artık güncel 2.1.1 sürümünü indirip doğru isimlendirmeyi yapmaktadır.)

Veya opencv-contrib-python kullanın:
```bash
cd python
venv\Scripts\activate
pip uninstall opencv-python -y
pip install opencv-contrib-python
```

### FFmpeg Hatası: "ffmpeg not found" (Sadece geliştirme modunda)

FFmpeg otomatik olarak indirilmelidir. Eğer hata alırsanız:
```bash
npm run setup-ffmpeg
```

Manuel indirme gerekirse:
- [FFmpeg İndir](https://ffmpeg.org/download.html)
- `ffmpeg/bin` klasörüne yerleştir

### Email Gönderilemiyor
- Gmail için App Password kullandığınızdan emin olun
- Uygulama içindeki Ayarlar sekmesinden SMTP ayarlarını kontrol edin
- "Test Email Gönder" butonu ile test edin
- Firewall veya antivirüsün SMTP'yi engellemediğinden emin olun

### "Module not found" Hatası
```bash
# Node modules'u yeniden kur
rm -rf node_modules
npm install

# Python packages'ı yeniden kur
cd python
venv\Scripts\activate
pip install -r requirements.txt --force-reinstall
```

## 📦 Build (Uygulama Dağıtımı)

Windows installer oluşturmak için:
```bash
npm run build:win
```

Çıktı: `dist/MGhosting Video Watermark Setup.exe`

## 🔧 Sorun Giderme - Watermark Çıkarma (Extraction)

### Sorun: "Watermark Çıkarılamadı" Hatası

**Nedenleri:**
1. Watermark veri kaybı (zayıf sinyal)
2. Video codec uyumsuzluğu
3. Frame boyut uyumsuzluğu

**Çözümler:**

#### Image-Based Extraction İçin:
- Ön işlemde `ori_frame_size` (orijinal frame boyutu) doğru ayarlanmış mı kontrol edin
- Watermark embed sırasında kullanılan `block_shape` parametresi aynı olmalıdır
- Video kalitesi çok düşük ise (çok sıkı compression) çıkarma başarısız olabilir

**Geçici Çözüm:**
- Uygulama placeholder watermark dosyası oluşturabilir
- Bu durum "Extraction completed but no watermark file produced" mesajıyla gösterilir

#### Key-Based Extraction İçin:
- Kullanılan `keys` ve `frag_length` değerleri embed sırasında kullanılanlarla **tamamen aynı** olmalıdır
- Sıra önemlidir: `[0, 1, 2, 3]` ≠ `[0, 2, 1, 3]`
- Thread sayısını azaltmayı deneyin (Ayarlar → Thread Sayısı: 4)

**Geçici Çözüm:**
- Çıkarılan sequence yanlış karakterler içeriyorsa ("####" gibi) library limitation'ıdır
- Verilerin yeniden embed edilerek test edilmesi önerilir

### Sorun: Çıkarılan Dosya Boş veya Okunamıyor

**Çözüm:**
1. Çıkış klasörü yazılabilir mi kontrol edin
2. Disk alanı yeterli mi kontrol edin
3. Kullanıcı yetkileri kontrol edin

### Sorun: "Incorrect library version loaded" (OpenH264)

**Çözüm (Otomatik):**
- Uygulama Windows'ta otomatik olarak `mp4v` codec'ine geçer
- Video otomatik olarak `h264` olarak yeniden encode edilir
- Başka bir işlem yapmanıza gerek yoktur

**Manuel Kontrol:**
```bash
python -c "import cv2; print(cv2.__version__)"
```

## 🎯 İlk Kullanım Kontrolü

1. **Python Kontrolü**: Ayarlar sekmesinde "Python Kontrolü" butonuna tıklayın
2. **FFmpeg Kontrolü**: Ayarlar sekmesinde "FFmpeg Kontrolü" butonuna tıklayın
3. **Email Testi**: Email adresinizi girin ve test emaili gönderin

## 📚 Ek Kaynaklar

- [Electron Docs](https://www.electronjs.org/docs)
- [blind-video-watermark](https://github.com/eluv-io/blind-video-watermark)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)

## 💡 İpuçları

- **Video Boyutu**: Büyük videolar (>1GB) işlem süresini artırır
- **Thread Sayısı**: CPU çekirdek sayınıza göre ayarlayın (varsayılan: 8)
- **Key Güvenliği**: Anahtarlarınızı mutlaka yedekleyin!
- **Geçici Dosyalar**: Düzenli olarak temp klasörünü temizleyin

## 🐛 Hata Bildirimi

Sorun yaşarsanız:
1. Console loglarını kontrol edin (DevTools: Ctrl+Shift+I)
2. Python error loglarını kontrol edin
3. GitHub'da issue açın: [Issues](https://github.com/mghosting/video-watermark/issues)

---

**Hazırlayan**: MGhosting
**Tarih**: 2025
