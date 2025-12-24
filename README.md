# MGhosting Video Watermark

[🇹🇷 Türkçe](#tr) | [🇬🇧 English](#en)

---

<a name="tr"></a>

## 🇹🇷 Türkçe

Profesyonel seviyede görünmez (blind) video watermarking uygulaması. DTCWT (Dual-Tree Complex Wavelet Transform) algoritması kullanarak videolarınıza güvenli bir şekilde filigran ekleyin ve koruyun.

### 🚀 Özellikler

- ✅ **Blind Watermarking**: Görünmez filigran teknolojisi (DTCWT algoritması)
- ✅ **Otomatik Key Üretimi**: Her kullanıcı için benzersiz anahtar sistemi
- ✅ **Ses Koruma**: Filigran eklerken video ses kanalı korunur
- ✅ **İki Mod Desteği**: 
  - Key-based (anahtar tabanlı diziler)
  - Image-based (logo/görsel filigran)
- ✅ **H.264/MP4V Desteği**: Yüksek kaliteli video kodlama
- ✅ **Otomatik Email**: İşlem sonuçları otomatik mail ile gönderilir
- ✅ **Key Yönetimi**: Güvenli anahtar saklama ve export
- ✅ **Drag & Drop**: Kolay dosya yükleme
- ✅ **Progress Tracking**: Gerçek zamanlı işlem takibi
- ✅ **Otomatik Kullanıcı Tespiti**: Extract işleminde otomatik kullanıcı eşleştirme

### 📦 Kurulum

#### Gereksinimler

1. **Node.js** (v18 veya üzeri)
2. **Python** (v3.8 veya üzeri)
3. **FFmpeg** (otomatik kurulur veya sistem PATH'inde)

#### Hızlı Başlangıç

```bash
# 1. Repository'i klonlayın
git clone https://github.com/exedesign/MGhostingFrame.git
cd MGhostingFrame

# 2. Kurulum scriptini çalıştırın (Windows)
setup.bat

# veya manuel kurulum:
npm install
cd python
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# 3. Uygulamayı başlatın
npm start
```

#### Linux/Mac Kurulum

```bash
git clone https://github.com/exedesign/MGhostingFrame.git
cd MGhostingFrame
npm install

cd python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cd ..
npm start
```

### 🔧 FFmpeg Kurulumu

**Otomatik (Önerilen):**
FFmpeg projede bundled olarak gelir (`ffmpeg/bin/` klasöründe). Ek kuruluma gerek yoktur.

**Manuel (İsteğe bağlı):**

#### Windows
1. [FFmpeg İndir](https://ffmpeg.org/download.html)
2. ZIP'i çıkartın (örn: `C:\ffmpeg`)
3. Sistem PATH'ine ekleyin: `C:\ffmpeg\bin`

#### Linux
```bash
sudo apt update
sudo apt install ffmpeg
```

#### macOS
```bash
brew install ffmpeg
```

### 📖 Kullanım

#### Filigran Ekleme (Embed)
1. Uygulamayı açın
2. "Filigran Ekle" sekmesini seçin
3. Video dosyanızı sürükleyip bırakın
4. Kullanıcı adı ve email girin (sistem otomatik anahtar üretir)
5. Fragment uzunluğunu seçin (1, 2, 5 veya 10 saniye)
6. "Filigran Ekle" butonuna tıklayın
7. İşlem tamamlandığında email ile bilgilendirme alın

#### Filigran Çıkarma (Extract)
1. "Filigran Çıkar" sekmesini seçin
2. Filigranlı video dosyasını yükleyin
3. "Kullanıcıyı Bul" butonuna tıklayın
4. Sistem otomatik olarak tüm kayıtları tarayıp eşleşen kullanıcıyı bulur
5. Sonuç ekranda ve email ile gönderilir

### 🎯 Nasıl Çalışır?

1. **Anahtar Üretimi**: Her kullanıcı için timestamp-tabanlı benzersiz anahtar (YYMMDDHHmmssSSS formatı)
2. **Key Generation**: LCG (Linear Congruential Generator) algoritması ile 4 anahtar (100-999) + sequence permutasyonu
3. **Embedding**: DTCWT algoritması ile görünmez filigran video frame'lerine gömülür
4. **Ses Koruma**: FFmpeg ile original ses kanalı watermarked video ile birleştirilir
5. **Extraction**: Tüm kayıtlar taranır, eşleşen kullanıcı otomatik tespit edilir

### 🔑 Key Management

- **Otomatik Üretim**: Her kullanıcı için benzersiz key/sequence otomatik oluşturulur
- **Güvenli Saklama**: Tüm anahtarlar `data/records.json` dosyasında şifrelenir
- **Export**: JSON formatında dışa aktarma
- **Email Yedekleme**: İşlem sonuçları email ile gönderilir
- **Otomatik Eşleştirme**: Extract işleminde kullanıcı otomatik bulunur

### ⚠️ Önemli Notlar

- **Video Boyutu**: Büyük videolar işlem süresini artırır
- **CPU Kullanımı**: Watermarking CPU-intensive bir işlemdir
- **Ses Koruma**: Sistem otomatik olarak ses kanalını korur
- **Format Desteği**: MP4, AVI, MOV (H.264/MP4V codec)
- **Database Yedekleme**: `data/records.json` dosyasını düzenli yedekleyin
- **FFmpeg Gereksinimi**: Ses koruma için FFmpeg gereklidir (otomatik dahildir)

### 🛠️ Build

```bash
# Windows executable
npm run build:win

# Çıktı: dist/MGhosting Video Watermark Setup.exe
```

### 📧 Email Ayarları

Email ayarlarını uygulama içinden yapılandırın:

1. "Ayarlar" sekmesine gidin
2. SMTP bilgilerinizi girin:
   - **Host**: smtp.gmail.com (Gmail için)
   - **Port**: 587
   - **Email**: your-email@gmail.com
   - **Şifre**: Uygulama şifresi (App Password)
3. "Ayarları Kaydet" butonuna tıklayın
4. "Test Email Gönder" ile test edin

**Gmail kullanıyorsanız:**
1. Google Hesabınızda 2FA'yı aktifleştirin
2. [Uygulama Şifreleri](https://myaccount.google.com/apppasswords) oluşturun

### 📁 Proje Yapısı

```
MGhostingFrame/
├── backend/           # Node.js backend servisleri
├── data/              # Database (records.json)
├── ffmpeg/            # Bundled FFmpeg binaries
├── python/            # Python watermarking engine
│   ├── venv/          # Virtual environment
│   └── watermark_processor.py
├── src/               # Frontend (HTML/CSS/JS)
├── main.js            # Electron ana process
├── package.json       # Node.js dependencies
└── setup.bat          # Windows kurulum scripti
```

### 🔬 Teknik Detaylar

- **Algorithm**: DTCWT (Dual-Tree Complex Wavelet Transform)
- **Frontend**: Electron + HTML/CSS/JavaScript
- **Backend**: Node.js + Python
- **Video Processing**: OpenCV + FFmpeg
- **Database**: JSON-based file storage
- **Encryption**: Built-in key encryption
- **Email**: Nodemailer (SMTP)

---

<a name="en"></a>

## 🇬🇧 English

Professional-grade invisible (blind) video watermarking application. Securely watermark and protect your videos using DTCWT (Dual-Tree Complex Wavelet Transform) algorithm.

### 🚀 Features

- ✅ **Blind Watermarking**: Invisible watermark technology (DTCWT algorithm)
- ✅ **Auto Key Generation**: Unique key system for each user
- ✅ **Audio Preservation**: Video audio channel preserved during watermarking
- ✅ **Dual Mode Support**:
  - Key-based (sequence-based keys)
  - Image-based (logo/image watermark)
- ✅ **H.264/MP4V Support**: High-quality video encoding
- ✅ **Auto Email**: Results sent automatically via email
- ✅ **Key Management**: Secure key storage and export
- ✅ **Drag & Drop**: Easy file upload
- ✅ **Progress Tracking**: Real-time processing status
- ✅ **Auto User Detection**: Automatic user matching during extraction

### 📦 Installation

#### Requirements

1. **Node.js** (v18 or higher)
2. **Python** (v3.8 or higher)
3. **FFmpeg** (auto-installed or in system PATH)

#### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/exedesign/MGhostingFrame.git
cd MGhostingFrame

# 2. Run setup script (Windows)
setup.bat

# or manual installation:
npm install
cd python
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# 3. Start the application
npm start
```

#### Linux/Mac Installation

```bash
git clone https://github.com/exedesign/MGhostingFrame.git
cd MGhostingFrame
npm install

cd python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cd ..
npm start
```

### 🔧 FFmpeg Setup

**Automatic (Recommended):**
FFmpeg is bundled with the project (`ffmpeg/bin/` folder). No additional installation required.

**Manual (Optional):**

#### Windows
1. [Download FFmpeg](https://ffmpeg.org/download.html)
2. Extract ZIP (e.g., `C:\ffmpeg`)
3. Add to system PATH: `C:\ffmpeg\bin`

#### Linux
```bash
sudo apt update
sudo apt install ffmpeg
```

#### macOS
```bash
brew install ffmpeg
```

### 📖 Usage

#### Embedding Watermark
1. Open the application
2. Select "Embed Watermark" tab
3. Drag and drop your video file
4. Enter username and email (system auto-generates keys)
5. Select fragment length (1, 2, 5, or 10 seconds)
6. Click "Embed Watermark" button
7. Receive email notification when complete

#### Extracting Watermark
1. Select "Extract Watermark" tab
2. Upload watermarked video file
3. Click "Find User" button
4. System automatically scans all records and finds matching user
5. Results displayed on screen and sent via email

### 🎯 How It Works?

1. **Key Generation**: Unique timestamp-based key for each user (YYMMDDHHmmssSSS format)
2. **Key Generation**: LCG (Linear Congruential Generator) algorithm creates 4 keys (100-999) + sequence permutation
3. **Embedding**: Invisible watermark embedded into video frames using DTCWT algorithm
4. **Audio Preservation**: Original audio channel merged with watermarked video using FFmpeg
5. **Extraction**: All records scanned, matching user automatically detected

### 🔑 Key Management

- **Auto Generation**: Unique key/sequence automatically created for each user
- **Secure Storage**: All keys encrypted in `data/records.json` file
- **Export**: JSON format export
- **Email Backup**: Processing results sent via email
- **Auto Matching**: User automatically found during extraction

### ⚠️ Important Notes

- **Video Size**: Large videos increase processing time
- **CPU Usage**: Watermarking is CPU-intensive
- **Audio Preservation**: System automatically preserves audio channel
- **Format Support**: MP4, AVI, MOV (H.264/MP4V codec)
- **Database Backup**: Regularly backup `data/records.json` file
- **FFmpeg Requirement**: Required for audio preservation (auto-included)

### 🛠️ Build

```bash
# Windows executable
npm run build:win

# Output: dist/MGhosting Video Watermark Setup.exe
```

### 📧 Email Settings

Configure email settings within the application:

1. Go to "Settings" tab
2. Enter your SMTP information:
   - **Host**: smtp.gmail.com (for Gmail)
   - **Port**: 587
   - **Email**: your-email@gmail.com
   - **Password**: App password
3. Click "Save Settings"
4. Test with "Send Test Email"

**For Gmail users:**
1. Enable 2FA on your Google Account
2. Create [App Password](https://myaccount.google.com/apppasswords)

### 📁 Project Structure

```
MGhostingFrame/
├── backend/           # Node.js backend services
├── data/              # Database (records.json)
├── ffmpeg/            # Bundled FFmpeg binaries
├── python/            # Python watermarking engine
│   ├── venv/          # Virtual environment
│   └── watermark_processor.py
├── src/               # Frontend (HTML/CSS/JS)
├── main.js            # Electron main process
├── package.json       # Node.js dependencies
└── setup.bat          # Windows setup script
```

### 🔬 Technical Details

- **Algorithm**: DTCWT (Dual-Tree Complex Wavelet Transform)
- **Frontend**: Electron + HTML/CSS/JavaScript
- **Backend**: Node.js + Python
- **Video Processing**: OpenCV + FFmpeg
- **Database**: JSON-based file storage
- **Encryption**: Built-in key encryption
- **Email**: Nodemailer (SMTP)

### 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first.

### 📄 License

MIT License - See LICENSE file for details.

### 🙏 Credits

- [blind-video-watermark](https://github.com/eluv-io/blind-video-watermark) - Watermarking library (DTCWT algorithm)
- [Electron](https://www.electronjs.org/) - Desktop framework
- [FFmpeg](https://ffmpeg.org/) - Video/audio processing
- [OpenCV](https://opencv.org/) - Computer vision library
- [Node.js](https://nodejs.org/) - JavaScript runtime

### 📞 Contact

For questions and support: 
- GitHub Issues: [https://github.com/exedesign/MGhostingFrame/issues](https://github.com/exedesign/MGhostingFrame/issues)
- Email: support@mghosting.com

### 🌟 Screenshots

![Embed Tab](docs/embed-tab.png)
![Extract Tab](docs/extract-tab.png)
![Settings](docs/settings.png)

---

**Developed with ❤️ by MGhosting Team**
