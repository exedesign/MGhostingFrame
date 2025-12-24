# 🎬 MGhosting Video Watermark - Proje Yapısı

## 📁 Dosya Ağacı

```
MGhostingFrame/
│
├── 📦 package.json              # Node.js bağımlılıkları ve scriptler
├── 📜 main.js                   # Electron ana süreç
├── 📜 preload.js                # Güvenli IPC köprüsü
├── ⚙️ electron-builder.yml      # Build yapılandırması
├── 📝 .env                      # Ortam değişkenleri (GİT'e eklenmez)
├── 📝 .env.example              # Örnek env dosyası
├── 📝 .gitignore                # Git ignore kuralları
├── 📖 README.md                 # Proje açıklaması
├── 📖 KURULUM.md                # Detaylı kurulum rehberi
├── 📄 LICENSE                   # MIT lisansı
│
├── 🎨 src/                      # Frontend (Renderer Process)
│   ├── index.html               # Ana HTML sayfa
│   ├── renderer.js              # UI mantığı ve event handler'lar
│   ├── styles/
│   │   └── main.css             # Tüm stil tanımlamaları
│   └── assets/
│       └── icons/               # Uygulama ikonları
│
├── ⚙️ backend/                  # Backend Servisleri
│   ├── processManager.js        # Python süreç yönetimi
│   ├── fileManager.js           # Dosya validasyon ve yönetimi
│   ├── emailService.js          # Nodemailer entegrasyonu
│   └── keyStorage.js            # JSON-based kayıt veritabanı
│
├── 🐍 python/                   # Python Watermarking
│   ├── watermark_processor.py   # Ana Python scripti
│   ├── requirements.txt         # Python bağımlılıkları
│   └── venv/                    # Virtual environment (oluşturulacak)
│
├── 📂 data/                     # Uygulama verileri
│   └── records.json             # İşlem kayıtları
│
├── 🗂️ temp/                     # Geçici dosyalar
│   └── (otomatik temizlenir)
│
├── 📦 output/                   # İşlenmiş videolar
│   └── (kullanıcı tarafından yönetilir)
│
└── 🏗️ dist/                     # Build çıktıları
    └── (npm run build sonrası)
```

## 🔧 Temel Bileşenler

### 1. **Electron Main Process** (`main.js`)
- Uygulama yaşam döngüsü yönetimi
- BrowserWindow oluşturma
- IPC handler'lar (dialog, watermark, kayıt yönetimi)
- Güvenlik yapılandırması

### 2. **Preload Script** (`preload.js`)
- contextBridge ile güvenli API exposing
- Renderer process ile main process arası köprü

### 3. **Frontend** (`src/`)
- Modern, responsive UI
- Tab-based navigasyon (Ekle, Çıkar, Geçmiş, Ayarlar)
- Drag & drop video upload
- Real-time progress tracking
- Dark theme

### 4. **Backend Servisleri** (`backend/`)
- **processManager**: Python child process yönetimi, stdout/stderr parsing
- **fileManager**: Video validasyon, FFprobe entegrasyonu, dosya operasyonları
- **emailService**: SMTP email gönderimi, HTML template'ler
- **keyStorage**: JSON-based CRUD operasyonları, arama ve export

### 5. **Python Processor** (`python/`)
- Blind-video-watermark wrapper
- Key-based ve image-based watermarking
- JSON I/O ile Node.js entegrasyonu
- Progress reporting

## 📊 Veri Akışı

### Embed (Filigran Ekleme)
```
Kullanıcı
  ↓ (video seç)
renderer.js
  ↓ (electronAPI.embedWatermarkKey/Image)
preload.js
  ↓ (IPC invoke)
main.js
  ↓ (handler)
processManager.js
  ↓ (spawn Python)
watermark_processor.py
  ↓ (blind-video-watermark)
Video İşleme
  ↓ (JSON response)
processManager → main → preload → renderer
  ↓ (kaydet)
keyStorage.js (records.json)
  ↓ (email gönder)
emailService.js
```

### Extract (Filigran Çıkarma)
```
Kullanıcı
  ↓ (watermarked video + keys)
renderer.js → preload → main → processManager
  ↓
watermark_processor.py (extract)
  ↓
Detected Sequence/Watermark
  ↓
Sonuç UI'da gösterilir
```

## 🚀 Başlatma Komutları

```bash
# Geliştirme modu
npm start

# DevTools açık geliştirme
npm run dev

# Windows build
npm run build:win

# Bağımlılık kurulumu
npm install
pip install -r python/requirements.txt
```

## 🔒 Güvenlik Önlemleri

1. **Context Isolation**: Renderer process izole
2. **Node Integration**: Devre dışı
3. **Preload Script**: Sadece güvenli API'ler expose edilir
4. **Input Sanitization**: Python args JSON ile sanitize
5. **Env Variables**: Hassas bilgiler .env'de

## 📦 Önemli Bağımlılıklar

### Node.js
- `electron`: Desktop framework
- `nodemailer`: Email gönderimi
- `uuid`: Unique ID oluşturma
- `lowdb`: JSON database
- `dotenv`: Environment variables

### Python
- `blind-video-watermark`: Watermarking algoritması
- `opencv-python`: Video işleme
- `numpy`: Array operasyonları
- `dtcwt`: Wavelet transform
- `tqdm`: Progress bar
- `scipy`: Bilimsel hesaplamalar

### Sistem
- FFmpeg: Video encoding/decoding
- Python 3.8+: Runtime
- Node.js 18+: Runtime

## 🎯 Kullanım Senaryoları

### 1. Key-based Watermarking
- Kullanıcı video seçer
- Anahtarlar ve sekans girilir (veya rastgele oluşturulur)
- Python işler → Çıktı video + kayıt
- Email ile anahtarlar gönderilir

### 2. Image-based Watermarking
- Kullanıcı video ve logo seçer
- Anahtar girilir
- Python işler → Görsel filigran gömülür
- Kayıt ve email

### 3. Extraction
- Filigranlı video ve anahtarlar girilir
- Python analiz eder
- Detected sequence veya watermark image gösterilir

## 🗄️ Veritabanı Şeması (records.json)

```json
{
  "id": "uuid",
  "videoPath": "string",
  "outputPath": "string",
  "method": "key-based|image-based",
  "keys": [10, 11, 12, 13],
  "sequence": "0231",
  "fragLength": 1,
  "watermarkPath": "string",
  "key": 0,
  "videoInfo": {
    "width": 1920,
    "height": 1080,
    "duration": 120.5,
    "size_bytes": 52428800
  },
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

## 🐛 Debug Notları

- **DevTools**: Ctrl+Shift+I veya `npm run dev`
- **Python Logs**: Console'da görünür (stdout/stderr)
- **IPC Errors**: main.js ve preload.js logları
- **File Paths**: Windows için backslash (`\`) kullan

## 📞 Destek

Sorular veya sorunlar için:
- GitHub Issues
- Email: support@mghosting.com

---

**Versiyon**: 1.0.0
**Son Güncelleme**: 23 Aralık 2025
