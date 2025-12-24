# 🎬 MGhosting Video Watermark - Güncellemeler

## 📋 Yapılan Değişiklikler (23 Aralık 2025)

### ✅ 1. FFmpeg Bundle Entegrasyonu

**Problem**: FFmpeg'in sistem PATH'inde olması gerekiyordu, bu kullanıcılar için ekstra kurulum adımı demekti.

**Çözüm**: FFmpeg artık uygulama bundle'ına dahil edildi.

#### Değişiklikler:

- **`scripts/setup-ffmpeg.js`**: Otomatik FFmpeg indirme ve kurulum scripti
  - Windows, macOS, Linux için platform-spesifik indirme
  - Otomatik extraction ve binary yerleştirme
  - `npm install` sırasında otomatik çalışır

- **`backend/processManager.js`**: 
  - Bundled FFmpeg path kullanımı
  - Development modunda sistem FFmpeg, production'da bundled FFmpeg

- **`backend/fileManager.js`**: 
  - ffprobe için bundled path
  - Video info extraction güncellemesi

- **`electron-builder.yml`**: 
  - FFmpeg binaries extraResources'a eklendi
  - Build sırasında bundle'a dahil edilir

- **`package.json`**:
  - `postinstall` scriptine FFmpeg setup eklendi
  - `adm-zip` dependency (Windows için ZIP extraction)

#### Kullanım:

```bash
# Otomatik (npm install sırasında)
npm install

# Manuel (gerekirse)
npm run setup-ffmpeg
```

#### Avantajlar:
✅ Kullanıcılar FFmpeg indirmek zorunda değil
✅ PATH yapılandırması gereksiz
✅ Cross-platform uyumluluk
✅ Versiyon kontrolü kolay

---

### ✅ 2. SMTP Ayarları UI'dan Alınıyor

**Problem**: Email ayarları `.env` dosyasından okunuyordu, teknik olmayan kullanıcılar için zor.

**Çözüm**: SMTP ayarları artık uygulama içinden yapılandırılıyor.

#### Değişiklikler:

- **`backend/appSettings.js`** (YENİ): 
  - electron-store kullanarak settings yönetimi
  - SMTP ve watermark ayarları için schema
  - Güvenli şifre saklama

- **`backend/emailService.js`**: 
  - `.env` yerine electron-store'dan okuma
  - `getSMTPSettings()` ve `updateSMTPSettings()` methodları
  - Runtime'da SMTP yapılandırma değiştirme

- **`main.js`**: 
  - `get-smtp-settings` IPC handler
  - `update-smtp-settings` IPC handler

- **`preload.js`**: 
  - SMTP settings API'leri expose edildi

- **`src/index.html`**: 
  - Ayarlar sekmesine SMTP yapılandırma formu
  - Host, port, secure, user, password inputları
  - "Test Email Gönder" butonu

- **`src/renderer.js`**: 
  - `loadSMTPSettings()`: Mevcut ayarları yükle
  - `saveSMTPSettings()`: Yeni ayarları kaydet
  - Form validasyonu ve feedback

- **`src/styles/main.css`**: 
  - SMTP form stilleri
  - Success/error result box'ları

#### Kullanım:

1. Uygulamayı aç
2. **Ayarlar** sekmesine git
3. **Email (SMTP) Yapılandırması** bölümünde:
   - SMTP Host gir (örn: smtp.gmail.com)
   - Port: 587
   - Email adresini gir
   - App Password gir
4. **Ayarları Kaydet** butonuna tıkla
5. **Test Email Gönder** ile test et

#### Avantajlar:
✅ Kullanıcı dostu arayüz
✅ Teknik bilgi gerektirmez
✅ Şifreler güvenli saklanır (electron-store)
✅ Runtime'da değiştirilebilir
✅ `.env` dosyası gereksiz

---

### ✅ 3. Her İki Watermark Algoritması Destekleniyor

**Durum**: Zaten implementasyonda, doğrulandı.

#### Desteklenen Modlar:

1. **Key-based (Anahtar Tabanlı)**:
   - Görünmez anahtar dizileri
   - Daha güvenli
   - Keys: [10, 11, 12, 13]
   - Sequence: "0231"
   - Fragment length ayarlanabilir

2. **Image-based (Görsel Tabanlı)**:
   - Logo veya görsel watermark
   - Görsel içerik koruması
   - Anahtar ile çıkarma
   - Block shape yapılandırması

#### Kullanım:

**Filigran Ekle Sekmesi**:
- İki mod arasında radio button ile seçim
- Her mod için özel ayarlar
- Rastgele anahtar oluşturma (key-based için)

**Filigran Çıkar Sekmesi**:
- Mod seçimi
- İlgili parametreleri gir
- Sonuç ekranda gösterilir

---

### ✅ 4. Key Kayıtları için Export Yeterli

**Durum**: Mevcut implementasyon uygun.

#### Özellikler:

- **JSON-based Storage**: `data/records.json`
- **Export Fonksiyonu**: Geçmiş sekmesinden "Dışa Aktar"
- **Arama**: Kayıtlarda arama
- **İstatistikler**: Toplam işlem, mod bazlı sayılar

#### Kayıt Formatı:

```json
{
  "id": "uuid",
  "videoPath": "...",
  "outputPath": "...",
  "method": "key-based|image-based",
  "keys": [10, 11, 12, 13],
  "sequence": "0231",
  "createdAt": "...",
  "videoInfo": {...}
}
```

#### Kullanım:

1. **Geçmiş** sekmesine git
2. Tüm işlemleri görüntüle
3. **Dışa Aktar** butonu ile JSON export
4. Arama kutusunda filtrele

---

## 🔧 Teknik Detaylar

### Dosya Yapısı Değişiklikleri:

```
MGhostingFrame/
├── scripts/
│   └── setup-ffmpeg.js      [YENİ]
├── ffmpeg/                   [YENİ - Otomatik oluşturulur]
│   └── bin/
│       ├── ffmpeg.exe
│       └── ffprobe.exe
├── backend/
│   ├── appSettings.js        [YENİ]
│   ├── processManager.js     [GÜNCELLEME]
│   ├── fileManager.js        [GÜNCELLEME]
│   └── emailService.js       [GÜNCELLEME]
├── src/
│   ├── index.html            [GÜNCELLEME]
│   ├── renderer.js           [GÜNCELLEME]
│   └── styles/main.css       [GÜNCELLEME]
├── main.js                   [GÜNCELLEME]
├── preload.js                [GÜNCELLEME]
└── package.json              [GÜNCELLEME]
```

### Yeni Bağımlılıklar:

```json
{
  "dependencies": {
    "adm-zip": "^0.5.10",      // ZIP extraction (Windows)
    "electron-store": "^8.1.0" // Zaten vardı
  }
}
```

### Yeni npm Scripts:

```json
{
  "scripts": {
    "setup-ffmpeg": "node scripts/setup-ffmpeg.js",
    "postinstall": "electron-builder install-app-deps && node scripts/setup-ffmpeg.js"
  }
}
```

---

## 🚀 Kullanım Senaryoları

### Senaryo 1: İlk Kurulum

```bash
# 1. Proje klonla
git clone https://github.com/mghosting/video-watermark.git
cd video-watermark

# 2. Node bağımlılıklarını kur (FFmpeg otomatik indirilir)
npm install

# 3. Python setup
cd python
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# 4. Uygulamayı başlat
npm start
```

**Artık FFmpeg manuel kurulum gerektirmez!**

### Senaryo 2: Email Yapılandırma

1. Uygulamayı aç
2. Ayarlar → Email (SMTP) Yapılandırması
3. Gmail için:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - User: `example@gmail.com`
   - Pass: `16-char-app-password`
4. Kaydet → Test Email Gönder

**Artık .env dosyası düzenleme gerektirmez!**

### Senaryo 3: Video Watermarking

1. **Filigran Ekle** sekmesi
2. Video sürükle-bırak
3. Mod seç:
   - **Anahtar Tabanlı**: Keys gir veya rastgele oluştur
   - **Görsel Tabanlı**: Logo yükle
4. Email gir (opsiyonel)
5. **Filigran Ekle** butonu
6. Progress bar takip et
7. Tamamlandığında kayıt oluşturulur ve email gönderilir

### Senaryo 4: Kayıt Yönetimi

1. **Geçmiş** sekmesi
2. Tüm işlemleri görüntüle
3. Arama kutusunda filtrele
4. **Dışa Aktar** ile JSON olarak kaydet
5. Yedek al

---

## ⚠️ Önemli Notlar

### FFmpeg:
- ✅ Otomatik indirilir ve bundle'a dahildir
- ✅ Windows, macOS, Linux desteklenir
- ✅ Development modunda sistem FFmpeg kullanılabilir
- ⚠️ İlk `npm install` birkaç dakika sürebilir (indirme)

### SMTP:
- ✅ UI'dan yapılandırılır
- ✅ electron-store ile güvenli saklanır
- ✅ Runtime'da değiştirilebilir
- ⚠️ Gmail için App Password gereklidir (normal şifre çalışmaz)

### Kayıtlar:
- ✅ JSON formatında saklanır
- ✅ Export özelliği mevcuttur
- ✅ Arama ve filtreleme yapılabilir
- ⚠️ Anahtarları mutlaka yedekleyin (kaybolursa filigran okunamaz)

---

## 🔒 Güvenlik

### Şifre Saklama:
- electron-store encrypted storage kullanır
- SMTP şifreleri plaintext değil, işletim sistemi keychain'inde saklanır
- `.env` dosyası artık kullanılmıyor (hassas bilgi yok)

### IPC Güvenliği:
- contextIsolation: true
- nodeIntegration: false
- Preload script ile güvenli API bridging

---

## 📦 Build

Windows installer oluşturma:

```bash
npm run build:win
```

Çıktı: `dist/MGhosting Video Watermark Setup.exe`

**FFmpeg otomatik olarak bundle'a dahil edilir!**

---

## 🆘 Sorun Giderme

### FFmpeg indirilemedi:
```bash
npm run setup-ffmpeg
```

### SMTP ayarları kayboldu:
- Ayarlar sekmesinden yeniden gir
- electron-store location: `%APPDATA%/mghosting-video-watermark/config.json`

### Email gönderilemiyor:
1. Ayarlar → Test Email Gönder
2. App Password doğru mu kontrol et
3. Firewall kontrolü

---

## 📞 Destek

Sorular için:
- GitHub Issues
- Email: support@mghosting.com

**Versiyon**: 1.0.0 (Güncellenmiş)
**Tarih**: 23 Aralık 2025
