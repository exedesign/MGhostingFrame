// Global state
let selectedVideoFile = null;
let selectedWatermarkFile = null;
let selectedOutputPath = null;
let extractVideoFile = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    initializeTabs();
    initializeEmbedTab();
    initializeExtractTab();
    initializeHistoryTab();
    initializeSettingsTab();
    initializeProcessConsole();
    
    // Load app info
    const appInfo = await window.electronAPI.getAppInfo();
    if (appInfo) {
        document.getElementById('appVersion').textContent = appInfo.version;
        document.getElementById('appPlatform').textContent = `${appInfo.platform} (${appInfo.arch})`;
    }
});

// Tab Management
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            // Update active states
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');

            // Refresh history when switching to history tab
            if (targetTab === 'history') {
                loadHistory();
            }
        });
    });
}

// Embed Tab
function initializeEmbedTab() {
    const videoUploadArea = document.getElementById('videoUploadArea');
    const videoFileInput = document.getElementById('videoFileInput');
    const selectOutputBtn = document.getElementById('selectOutputBtn');
    const startEmbedBtn = document.getElementById('startEmbedBtn');

    // Video upload
    videoUploadArea.addEventListener('click', () => videoFileInput.click());
    videoUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        videoUploadArea.classList.add('dragover');
    });
    videoUploadArea.addEventListener('dragleave', () => {
        videoUploadArea.classList.remove('dragover');
    });
    videoUploadArea.addEventListener('drop', async (e) => {
        e.preventDefault();
        videoUploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await handleVideoSelect(files[0].path);
        }
    });

    videoFileInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            await handleVideoSelect(e.target.files[0].path);
        }
    });

    // Watermark image upload removed - key-based only

    // Method selection removed - key-based only

    // Output selection
    selectOutputBtn.addEventListener('click', async () => {
        const result = await window.electronAPI.selectOutputDirectory();
        if (!result.canceled) {
            selectedOutputPath = result.filePath;
            document.getElementById('outputPathText').textContent = result.filePath;
        }
    });

    // Random keys button removed - auto-generated now

    // Start embed
    startEmbedBtn.addEventListener('click', startEmbedProcess);
}

async function handleVideoSelect(filePath) {
    if (!filePath) return;

    selectedVideoFile = filePath;
    
    // Validate video
    const validation = await window.electronAPI.validateVideo(filePath);

    if (!validation.valid) {
        showToast(`Geçersiz video: ${validation.error}`, 'error');
        selectedVideoFile = null;
        return;
    }

    // Update UI
    document.getElementById('videoInfo').classList.remove('hidden');
    document.getElementById('videoFileName').textContent = validation.name;
    document.getElementById('videoFileSize').textContent = formatFileSize(validation.size);
    
    if (validation.info) {
        document.getElementById('videoResolution').textContent = 
            `${validation.info.width}x${validation.info.height}`;
        document.getElementById('videoDuration').textContent = 
            formatDuration(validation.info.duration);
    } else {
        document.getElementById('videoResolution').textContent = 'N/A';
        document.getElementById('videoDuration').textContent = 'N/A';
    }

    updateEmbedButton();
    showToast('Video başarıyla yüklendi', 'success');
}
// Watermark image selection removed - key-based only

function updateEmbedButton() {
    const startBtn = document.getElementById('startEmbedBtn');
    startBtn.disabled = selectedVideoFile === null;
}

async function startEmbedProcess() {
    const userEmail = document.getElementById('userEmail').value;
    const userName = document.getElementById('userName').value;
    const strength = parseFloat(document.getElementById('strengthInput').value);
    const step = parseFloat(document.getElementById('stepInput').value);
    const threads = parseInt(document.getElementById('threadsInput').value);
    const fragLength = parseFloat(document.getElementById('fragLengthInput').value);

    // Validate user info
    if (!userName || !userEmail) {
        showToast('Lütfen kullanıcı adı ve email girin!', 'error');
        return;
    }

    if (!userEmail.includes('@')) {
        showToast('Geçerli bir email adresi girin!', 'error');
        return;
    }

    // Generate output path
    if (!selectedOutputPath) {
        const timestamp = Date.now();
        const ext = selectedVideoFile.split('.').pop();
        const inputDir = selectedVideoFile.substring(0, selectedVideoFile.lastIndexOf('\\'));
        const inputFileName = selectedVideoFile.substring(selectedVideoFile.lastIndexOf('\\') + 1, selectedVideoFile.lastIndexOf('.'));
        selectedOutputPath = `${inputDir}\\${inputFileName}_watermarked_${timestamp}.${ext}`;
    }

    // Show progress
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    progressContainer.classList.remove('hidden');
    clearConsole();
    showProcessConsole();
    document.getElementById('startEmbedBtn').disabled = true;

    try {
        progressText.textContent = 'Benzersiz keys oluşturuluyor...';
        progressFill.style.width = '10%';
        addConsoleMessage(`Kullanıcı: ${userName} (${userEmail})`, 'info');
        addConsoleMessage('Otomatik benzersiz keys oluşturuluyor...', 'info');

        progressText.textContent = 'Filigran ekleniyor...';
        progressFill.style.width = '30%';

        const result = await window.electronAPI.embedWatermarkKey({
            videoPath: selectedVideoFile,
            outputPath: selectedOutputPath,
            fragLength,
            userEmail,
            userName,
            strength,
            step,
            threads
        });

        progressFill.style.width = '100%';

        if (result.success) {
            progressText.textContent = `✅ İşlem tamamlandı!`;
            
            addConsoleMessage(`✅ Başarılı!`, 'success');
            addConsoleMessage(`Unique Key: ${result.uniqueKey}`, 'success');
            addConsoleMessage(`Generated Keys: [${result.keys.join(', ')}]`, 'info');
            addConsoleMessage(`Generated Sequence: ${result.sequence}`, 'info');
            addConsoleMessage(`Kullanıcı: ${userName}`, 'info');
            addConsoleMessage(`Çıktı: ${result.outputPath}`, 'info');
            
            showToast(`Filigran eklendi! Key: ${result.uniqueKey}`, 'success');
            
            setTimeout(() => {
                resetEmbedForm();
            }, 3000);
        } else {
            throw new Error(result.error || 'İşlem başarısız');
        }

    } catch (error) {
        progressText.textContent = `❌ Hata: ${error.message}`;
        addConsoleMessage(`❌ Hata: ${error.message}`, 'error');
        showToast(error.message, 'error');
        document.getElementById('startEmbedBtn').disabled = false;
    }
}

function resetEmbedForm() {
    selectedVideoFile = null;
    selectedWatermarkFile = null;
    selectedOutputPath = null;
    
    document.getElementById('videoInfo').classList.add('hidden');
    document.getElementById('progressContainer').classList.add('hidden');
    document.getElementById('outputPathText').textContent = 'Otomatik oluşturulacak';
    document.getElementById('startEmbedBtn').disabled = true;
    
    const progressFill = document.getElementById('progressFill');
    progressFill.style.width = '0%';
}

// Extract Tab
function initializeExtractTab() {
    const extractVideoUploadArea = document.getElementById('extractVideoUploadArea');
    const extractVideoInput = document.getElementById('extractVideoInput');
    const startExtractBtn = document.getElementById('startExtractBtn');

    extractVideoUploadArea.addEventListener('click', () => extractVideoInput.click());
    extractVideoInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            extractVideoFile = e.target.files[0].path;
            document.getElementById('extractVideoInfo').classList.remove('hidden');
            document.getElementById('extractVideoName').textContent = e.target.files[0].name;
            startExtractBtn.disabled = false;
        }
    });

    // Method selection removed - key-based only

    startExtractBtn.addEventListener('click', startExtractProcess);
}

async function startExtractProcess() {
    const progressContainer = document.getElementById('extractProgressContainer');
    const progressFill = document.getElementById('extractProgressFill');
    const progressText = document.getElementById('extractProgressText');
    const resultBox = document.getElementById('extractResult');
    const resultContent = document.getElementById('extractResultContent');

    progressContainer.classList.remove('hidden');
    resultBox.classList.add('hidden');
    clearConsole();
    showProcessConsole();
    document.getElementById('startExtractBtn').disabled = true;

    try {
        progressText.textContent = 'Otomatik tarama başlatılıyor...';
        progressFill.style.width = '10%';
        addConsoleMessage('🔍 Videoda filigran aranıyor...', 'info');
        addConsoleMessage('Database\'deki tüm kayıtlar deneniyor...', 'info');

        progressFill.style.width = '50%';

        const result = await window.electronAPI.extractWatermarkKey({
            videoPath: extractVideoFile
        });

        progressFill.style.width = '100%';

        if (result.success) {
            progressText.textContent = '✅ Kullanıcı bulundu!';
            resultBox.classList.remove('hidden');
            
            const user = result.userInfo;
            const validIcon = result.validated ? '✅' : '⚠️';
            
            addConsoleMessage(`${validIcon} EŞLEŞME BULUNDU!`, 'success');
            addConsoleMessage(`Unique Key: ${result.uniqueKey}`, 'success');
            addConsoleMessage(`Keys: [${result.keys.join(', ')}]`, 'info');
            addConsoleMessage(`Sequence: ${result.sequence}`, 'info');
            addConsoleMessage(`Kullanıcı: ${user.userName} (${user.userEmail})`, 'success');
            addConsoleMessage(`Oluşturma: ${new Date(user.createdAt).toLocaleString('tr-TR')}`, 'info');
            
            if (result.validated) {
                addConsoleMessage('✅ Doğrulama başarılı - Keys yeniden üretildi ve eşleşti', 'success');
            } else {
                addConsoleMessage('⚠️ Uyarı: Keys doğrulaması tam eşleşmedi', 'warning');
            }
            
            const displayResult = {
                '🎯 Durum': 'KULLANICI BULUNDU',
                '🔑 Unique Key': result.uniqueKey,
                '👤 Kullanıcı Adı': user.userName,
                '📧 Email': user.userEmail,
                '📅 Oluşturma': new Date(user.createdAt).toLocaleString('tr-TR'),
                '🔢 Keys': result.keys,
                '📊 Sequence': result.sequence,
                '✅ Doğrulama': result.validated ? 'BAŞARILI' : 'UYARI',
                '📁 Orijinal Video': user.videoPath
            };
            
            resultContent.textContent = JSON.stringify(displayResult, null, 2);
            showToast(`Video ${user.userName} kullanıcısına aittir!`, 'success');
        } else {
            progressText.textContent = '❌ Kullanıcı bulunamadı';
            addConsoleMessage('❌ Hiçbir kayıt eşleşmedi', 'error');
            addConsoleMessage(result.error, 'error');
            throw new Error(result.error || 'Kullanıcı bulunamadı');
        }

    } catch (error) {
        progressText.textContent = `❌ Hata: ${error.message}`;
        addConsoleMessage(`❌ Hata: ${error.message}`, 'error');
        showToast(error.message, 'error');
    } finally {
        document.getElementById('startExtractBtn').disabled = false;
    }
}

// History Tab
function initializeHistoryTab() {
    document.getElementById('refreshHistoryBtn').addEventListener('click', loadHistory);
    document.getElementById('exportHistoryBtn').addEventListener('click', exportHistory);
    
    const searchInput = document.getElementById('searchHistory');
    searchInput.addEventListener('input', (e) => {
        filterHistory(e.target.value);
    });
}

async function loadHistory() {
    const result = await window.electronAPI.getAllRecords();
    
    if (!result.success) {
        showToast('Geçmiş yüklenemedi', 'error');
        return;
    }

    const records = result.records;
    
    // Update stats
    const stats = {
        total: records.length,
        keyBased: records.filter(r => r.method === 'key-based').length,
        imageBased: records.filter(r => r.method === 'image-based').length
    };
    
    document.getElementById('totalRecords').textContent = stats.total;
    document.getElementById('keyBasedCount').textContent = stats.keyBased;
    document.getElementById('imageBasedCount').textContent = stats.imageBased;

    // Render records
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';

    if (records.length === 0) {
        historyList.innerHTML = '<p class="empty-message">Henüz kayıt bulunmuyor</p>';
        return;
    }

    records.forEach(record => {
        const item = createHistoryItem(record);
        historyList.appendChild(item);
    });
}

function createHistoryItem(record) {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.dataset.recordId = record.id;

    const methodIcon = record.method === 'key-based' ? '🔑' : '🖼️';
    const methodText = record.method === 'key-based' ? 'Anahtar Tabanlı' : 'Görsel Tabanlı';
    
    let details = '';
    if (record.method === 'key-based') {
        details = `
            <p><strong>Anahtarlar:</strong> ${record.keys?.join(', ') || 'N/A'}</p>
            <p><strong>Sekans:</strong> ${record.sequence || 'N/A'}</p>
        `;
    } else {
        details = `
            <p><strong>Anahtar:</strong> ${record.key}</p>
        `;
    }

    div.innerHTML = `
        <div class="history-item-header">
            <span class="history-icon">${methodIcon}</span>
            <div class="history-info">
                <h4>${record.videoPath?.split('\\').pop() || 'Bilinmeyen Video'}</h4>
                <p class="history-meta">${methodText} • ${new Date(record.createdAt).toLocaleString('tr-TR')}</p>
            </div>
        </div>
        <div class="history-details">
            ${details}
            <p><strong>Çıktı:</strong> ${record.outputPath || 'N/A'}</p>
        </div>
    `;

    return div;
}

function filterHistory(query) {
    const items = document.querySelectorAll('.history-item');
    const lowerQuery = query.toLowerCase();

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(lowerQuery)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

async function exportHistory() {
    const result = await window.electronAPI.exportRecords();
    
    if (result.success) {
        showToast('Geçmiş başarıyla dışa aktarıldı', 'success');
    } else if (!result.canceled) {
        showToast('Dışa aktarma başarısız', 'error');
    }
}

// Settings Tab
function initializeSettingsTab() {
    loadSMTPSettings();
    loadTestEmail();
    
    document.getElementById('smtpForm').addEventListener('submit', saveSMTPSettings);
    document.getElementById('testSMTPBtn').addEventListener('click', testSMTPEmail);
    document.getElementById('checkPythonBtn').addEventListener('click', checkPython);
    document.getElementById('checkFFmpegBtn').addEventListener('click', checkFFmpeg);
    document.getElementById('cleanTempBtn').addEventListener('click', cleanTemp);
}

async function loadSMTPSettings() {
    const result = await window.electronAPI.getSMTPSettings();
    
    if (result.success && result.settings) {
        const settings = result.settings;
        document.getElementById('smtpHost').value = settings.host || '';
        document.getElementById('smtpPort').value = settings.port || 587;
        document.getElementById('smtpSecure').checked = settings.secure || false;
        document.getElementById('smtpUser').value = settings.user || '';
        
        if (settings.hasPassword) {
            document.getElementById('smtpPass').placeholder = '••••••••• (Kayıtlı)';
        }
    }
}

async function loadTestEmail() {
    const result = await window.electronAPI.getTestEmail();
    
    if (result.success && result.email) {
        document.getElementById('testEmailAddress').value = result.email;
    }
}

async function saveSMTPSettings(e) {
    e.preventDefault();
    
    const settings = {
        host: document.getElementById('smtpHost').value,
        port: parseInt(document.getElementById('smtpPort').value),
        secure: document.getElementById('smtpSecure').checked,
        user: document.getElementById('smtpUser').value,
        pass: document.getElementById('smtpPass').value
    };
    
    // Don't send empty password (keep existing)
    if (!settings.pass) {
        delete settings.pass;
    }
    
    // Save test email address if provided
    const testEmail = document.getElementById('testEmailAddress').value;
    if (testEmail) {
        await window.electronAPI.saveTestEmail(testEmail);
    }
    
    const statusBox = document.getElementById('smtpStatus');
    statusBox.classList.remove('hidden');
    statusBox.textContent = 'Kaydediliyor...';
    
    const result = await window.electronAPI.updateSMTPSettings(settings);
    
    if (result.success) {
        statusBox.className = 'result-box success';
        statusBox.textContent = '✅ ' + result.message;
        showToast('SMTP ayarları başarıyla kaydedildi', 'success');
    } else {
        statusBox.className = 'result-box error';
        statusBox.textContent = '❌ Hata: ' + result.error;
        showToast('SMTP ayarları kaydedilemedi', 'error');
    }
    
    setTimeout(() => {
        statusBox.classList.add('hidden');
    }, 5000);
}

async function testSMTPEmail() {
    // First check if SMTP is configured
    const smtpUser = document.getElementById('smtpUser').value;
    if (!smtpUser) {
        showToast('Lütfen önce SMTP ayarlarını yapılandırın', 'error');
        return;
    }
    
    // Get test email address
    let testEmail = document.getElementById('testEmailAddress').value;
    
    if (!testEmail) {
        showToast('Lütfen test email adresi girin', 'error');
        return;
    }
    
    // Save test email for future use
    await window.electronAPI.saveTestEmail(testEmail);
    
    // Show loading state
    const statusBox = document.getElementById('smtpStatus');
    statusBox.classList.remove('hidden');
    statusBox.className = 'result-box';
    statusBox.textContent = '📧 Test emaili gönderiliyor...';
    
    // Send test email
    const result = await window.electronAPI.sendTestEmail(testEmail);
    
    if (result.success) {
        statusBox.className = 'result-box success';
        statusBox.textContent = '✅ ' + result.message;
        showToast(`Test emaili ${testEmail} adresine gönderildi`, 'success');
    } else {
        statusBox.className = 'result-box error';
        statusBox.textContent = '❌ Hata: ' + result.error;
        showToast('Test emaili gönderilemedi: ' + result.error, 'error');
    }
    
    setTimeout(() => {
        statusBox.classList.add('hidden');
    }, 8000);
}

async function testEmail() {
    const email = document.getElementById('userEmail').value;
    if (!email) {
        showToast('Lütfen email adresi girin', 'error');
        return;
    }

    showToast('Email testi gönderiliyor...', 'info');
    // TODO: Implement test email functionality
    showToast('Email test fonksiyonu henüz implementasyonda', 'info');
}

async function checkPython() {
    const resultBox = document.getElementById('pythonCheckResult');
    resultBox.classList.remove('hidden');
    resultBox.textContent = 'Kontrol ediliyor...';

    // TODO: Implement Python check
    setTimeout(() => {
        resultBox.textContent = '✅ Python ortamı kontrol edilecek (implementasyon bekleniyor)';
    }, 500);
}

async function checkFFmpeg() {
    const resultBox = document.getElementById('ffmpegCheckResult');
    resultBox.classList.remove('hidden');
    resultBox.textContent = 'Kontrol ediliyor...';

    // TODO: Implement FFmpeg check
    setTimeout(() => {
        resultBox.textContent = '✅ FFmpeg kontrol edilecek (implementasyon bekleniyor)';
    }, 500);
}

async function cleanTemp() {
    const result = await window.electronAPI.cleanTemp();
    
    if (result.success) {
        showToast('Geçici dosyalar temizlendi', 'success');
    } else {
        showToast('Temizleme başarısız', 'error');
    }
}

// Utility Functions
function formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    toast.className = `toast ${type}`;
    toastMessage.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}
// Console Management
function initializeProcessConsole() {
    const processConsole = document.getElementById('processConsole');
    const toggleConsoleBtn = document.getElementById('toggleConsoleBtn');
    
    // Check if console elements exist
    if (!processConsole || !toggleConsoleBtn) {
        console.warn('Process console elements not found in DOM');
        return;
    }
    
    // Toggle console
    toggleConsoleBtn.addEventListener('click', () => {
        processConsole.classList.add('hidden');
    });
    
    // Listen for watermark progress messages from main process
    if (window.electronAPI && window.electronAPI.onWatermarkProgress) {
        window.electronAPI.onWatermarkProgress((data) => {
            addConsoleMessage(data);
        });
    }
}

function showProcessConsole() {
    const processConsole = document.getElementById('processConsole');
    if (processConsole) {
        processConsole.classList.remove('hidden');
    } else {
        console.warn('Process console element not found');
    }
}

function clearConsole() {
    const consoleContent = document.getElementById('consoleContent');
    if (consoleContent) {
        consoleContent.innerHTML = '<div class="console-message info">Konsol temizlendi...</div>';
    }
}

function addConsoleMessage(data) {
    const consoleContent = document.getElementById('consoleContent');
    
    if (!consoleContent) {
        console.warn('Console content element not found');
        return;
    }
    
    const messageDiv = document.createElement('div');
    
    // Determine message type
    let messageType = data.status || 'log';
    if (data.message && data.message.toLowerCase().includes('error')) {
        messageType = 'error';
    } else if (data.message && data.message.toLowerCase().includes('success')) {
        messageType = 'success';
    } else if (data.message && data.message.toLowerCase().includes('warning')) {
        messageType = 'warning';
    }
    
    messageDiv.className = `console-message ${messageType}`;
    messageDiv.textContent = `[${data.timestamp || new Date().toLocaleTimeString('tr-TR')}] ${data.message || ''}`;
    
    consoleContent.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    consoleContent.scrollTop = consoleContent.scrollHeight;
    
    // Keep only last 100 messages
    const messages = consoleContent.querySelectorAll('.console-message');
    if (messages.length > 100) {
        messages[0].remove();
    }
}