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
    loadEmailSuggestions();
    loadDefaultEmailToForm();
    
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
            
            // Reload email suggestions to include new email
            loadEmailSuggestions();
            
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
    const extractMethodSelector = document.getElementById('extractMethodSelector');
    const manualKeyInput = document.getElementById('manualKeyInput');
    const autoModeRadio = document.getElementById('extractAutoMode');
    const manualModeRadio = document.getElementById('extractManualMode');

    extractVideoUploadArea.addEventListener('click', () => extractVideoInput.click());
    extractVideoInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            extractVideoFile = e.target.files[0].path;
            document.getElementById('extractVideoInfo').classList.remove('hidden');
            document.getElementById('extractVideoName').textContent = e.target.files[0].name;
            extractMethodSelector.style.display = 'block';
            startExtractBtn.disabled = false;
        }
    });

    // Method selection listeners
    autoModeRadio.addEventListener('change', () => {
        if (autoModeRadio.checked) {
            manualKeyInput.classList.add('hidden');
        }
    });

    manualModeRadio.addEventListener('change', () => {
        if (manualModeRadio.checked) {
            manualKeyInput.classList.remove('hidden');
        }
    });

    startExtractBtn.addEventListener('click', startExtractProcess);
}

async function startExtractProcess() {
    const progressContainer = document.getElementById('extractProgressContainer');
    const progressFill = document.getElementById('extractProgressFill');
    const progressText = document.getElementById('extractProgressText');
    const resultBox = document.getElementById('extractResult');
    const resultContent = document.getElementById('extractResultContent');
    const manualMode = document.getElementById('extractManualMode').checked;
    const manualKey = document.getElementById('extractManualKey').value.trim();

    // Validate manual mode
    if (manualMode && !manualKey) {
        showToast('Lütfen bir key girin', 'error');
        return;
    }

    progressContainer.classList.remove('hidden');
    resultBox.classList.add('hidden');
    clearConsole();
    showProcessConsole();
    document.getElementById('startExtractBtn').disabled = true;

    try {
        if (manualMode) {
            progressText.textContent = 'Manuel key ile çıkarma başlatılıyor...';
            progressFill.style.width = '10%';
            addConsoleMessage(`🔑 Manuel key kullanılıyor: ${manualKey}`, 'info');
            
            progressFill.style.width = '50%';

            const result = await window.electronAPI.extractWatermarkManual({
                videoPath: extractVideoFile,
                key: manualKey
            });

            progressFill.style.width = '100%';

            if (result.success) {
                progressText.textContent = '✅ Çıkarma tamamlandı!';
                resultBox.classList.remove('hidden');
                
                addConsoleMessage('✅ Filigran başarıyla çıkarıldı', 'success');
                addConsoleMessage(`Unique Key: ${result.uniqueKey}`, 'success');
                addConsoleMessage(`Keys: [${result.keys.join(', ')}]`, 'info');
                addConsoleMessage(`Sequence: ${result.sequence}`, 'info');
                addConsoleMessage(`⏱️ İşlem Süresi: ${result.duration} saniye`, 'info');
                
                resultContent.innerHTML = `
                    <div class="result-success">
                        <div class="result-header">
                            <span class="result-icon">✅</span>
                            <h3>Filigran Başarıyla Çıkarıldı</h3>
                        </div>
                        <div class="result-details">
                            <div class="result-item">
                                <span class="result-label">🔑 Unique Key:</span>
                                <span class="result-value key-value">${result.uniqueKey}</span>
                            </div>
                            <div class="result-item">
                                <span class="result-label">🔢 Keys:</span>
                                <span class="result-value">${result.keys.join(', ')}</span>
                            </div>
                            <div class="result-item">
                                <span class="result-label">📊 Sequence:</span>
                                <span class="result-value sequence-value">${result.sequence}</span>
                            </div>
                            <div class="result-item">
                                <span class="result-label">⏱️ İşlem Süresi:</span>
                                <span class="result-value">${result.duration} saniye</span>
                            </div>
                        </div>
                    </div>
                `;
                showToast('Filigran başarıyla çıkarıldı!', 'success');
            } else {
                progressText.textContent = '❌ Çıkarma başarısız';
                addConsoleMessage('❌ Filigran çıkarılamadı', 'error');
                addConsoleMessage(result.error, 'error');
                throw new Error(result.error || 'Filigran çıkarılamadı');
            }
        } else {
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
                addConsoleMessage(`⏱️ İşlem Süresi: ${result.duration} saniye`, 'info');
                
                if (result.validated) {
                    addConsoleMessage('✅ Doğrulama başarılı - Keys yeniden üretildi ve eşleşti', 'success');
                } else {
                    addConsoleMessage('⚠️ Uyarı: Keys doğrulaması tam eşleşmedi', 'warning');
                }
                
                const validationBadge = result.validated 
                    ? '<span class="badge badge-success">✅ DOĞRULANDI</span>' 
                    : '<span class="badge badge-warning">⚠️ UYARI</span>';
                
                resultContent.innerHTML = `
                    <div class="result-success">
                        <div class="result-header">
                            <span class="result-icon">🎯</span>
                            <h3>Kullanıcı Bulundu!</h3>
                            ${validationBadge}
                        </div>
                        <div class="result-user-info">
                            <div class="user-avatar">👤</div>
                            <div class="user-details">
                                <h4>${user.userName}</h4>
                                <p>${user.userEmail}</p>
                            </div>
                        </div>
                        <div class="result-details">
                            <div class="result-item">
                                <span class="result-label">🔑 Unique Key:</span>
                                <span class="result-value key-value">${result.uniqueKey}</span>
                            </div>
                            <div class="result-item">
                                <span class="result-label">🔢 Keys:</span>
                                <span class="result-value">${result.keys.join(', ')}</span>
                            </div>
                            <div class="result-item">
                                <span class="result-label">📊 Sequence:</span>
                                <span class="result-value sequence-value">${result.sequence}</span>
                            </div>
                            <div class="result-item">
                                <span class="result-label">📅 Oluşturma:</span>
                                <span class="result-value">${new Date(user.createdAt).toLocaleString('tr-TR')}</span>
                            </div>
                            <div class="result-item">
                                <span class="result-label">⏱️ İşlem Süresi:</span>
                                <span class="result-value">${result.duration} saniye</span>
                            </div>
                            <div class="result-item full-width">
                                <span class="result-label">📁 Orijinal Video:</span>
                                <span class="result-value video-path">${user.videoPath}</span>
                            </div>
                        </div>
                    </div>
                `;
                showToast(`Video ${user.userName} kullanıcısına aittir!`, 'success');
            } else {
                progressText.textContent = '❌ Kullanıcı bulunamadı';
                addConsoleMessage('❌ Hiçbir kayıt eşleşmedi', 'error');
                addConsoleMessage(result.error, 'error');
                throw new Error(result.error || 'Kullanıcı bulunamadı');
            }
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
    
    // User info section
    const userInfo = record.userName || record.userEmail 
        ? `<p><strong>👤 Kullanıcı:</strong> ${record.userName || 'N/A'} ${record.userEmail ? `(${record.userEmail})` : ''}</p>`
        : '';
    
    let details = '';
    if (record.method === 'key-based') {
        details = `
            ${userInfo}
            <p><strong>Anahtarlar:</strong> ${record.keys?.join(', ') || 'N/A'}</p>
            <p><strong>Sekans:</strong> ${record.sequence || 'N/A'}</p>
        `;
    } else {
        details = `
            ${userInfo}
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
    loadDefaultEmail();
    
    document.getElementById('smtpForm').addEventListener('submit', saveSMTPSettings);
    document.getElementById('testSMTPBtn').addEventListener('click', testSMTPEmail);
    document.getElementById('saveDefaultEmailBtn').addEventListener('click', saveDefaultEmail);
    document.getElementById('checkPythonBtn').addEventListener('click', checkPython);
    document.getElementById('checkFFmpegBtn').addEventListener('click', checkFFmpeg);
    document.getElementById('cleanTempBtn').addEventListener('click', cleanTemp);
    document.getElementById('deleteHistoryBtn').addEventListener('click', showDeleteHistoryModal);
    
    // Modal controls
    document.getElementById('cancelDeleteBtn').addEventListener('click', hideDeleteHistoryModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDeleteHistory);
    document.getElementById('verificationInput').addEventListener('input', checkVerificationCode);
    
    // Close modal on overlay click
    document.querySelector('.modal-overlay').addEventListener('click', hideDeleteHistoryModal);
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

async function loadDefaultEmail() {
    const result = await window.electronAPI.getDefaultEmail();
    
    if (result.success && result.email) {
        document.getElementById('defaultEmail').value = result.email;
    }
}

async function saveDefaultEmail() {
    const emailsInput = document.getElementById('defaultEmail').value;
    
    if (!emailsInput || !emailsInput.trim()) {
        showToast('Lütfen en az bir email adresi girin', 'error');
        return;
    }
    
    // Parse comma-separated emails
    const emails = emailsInput.split(',').map(e => e.trim()).filter(e => e);
    
    if (emails.length === 0) {
        showToast('Lütfen geçerli email adresi girin', 'error');
        return;
    }
    
    // Validate each email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
        showToast(`Geçersiz email adresleri: ${invalidEmails.join(', ')}`, 'error');
        return;
    }
    
    // Save comma-separated string
    const result = await window.electronAPI.saveDefaultEmail(emailsInput.trim());
    
    if (result.success) {
        const count = emails.length;
        showToast(`${count} email adresi kaydedildi`, 'success');
        // Update embed form with first email
        document.getElementById('userEmail').value = emails[0];
    } else {
        showToast('Email kaydedilemedi', 'error');
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

// Delete History Modal Functions
let currentVerificationCode = '';

function showDeleteHistoryModal() {
    // Generate random 4-digit code
    currentVerificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Display code
    document.getElementById('verificationCode').textContent = currentVerificationCode;
    
    // Reset input
    document.getElementById('verificationInput').value = '';
    document.getElementById('confirmDeleteBtn').disabled = true;
    
    // Show modal
    document.getElementById('deleteHistoryModal').classList.remove('hidden');
}

function hideDeleteHistoryModal() {
    document.getElementById('deleteHistoryModal').classList.add('hidden');
    currentVerificationCode = '';
}

function checkVerificationCode() {
    const input = document.getElementById('verificationInput').value;
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    if (input === currentVerificationCode) {
        confirmBtn.disabled = false;
    } else {
        confirmBtn.disabled = true;
    }
}

async function confirmDeleteHistory() {
    const input = document.getElementById('verificationInput').value;
    
    if (input !== currentVerificationCode) {
        showToast('Doğrulama kodu hatalı', 'error');
        return;
    }
    
    hideDeleteHistoryModal();
    showToast('Geçmiş siliniyor...', 'info');
    
    try {
        const result = await window.electronAPI.deleteAllHistory();
        
        if (result.success) {
            showToast('Tüm geçmiş başarıyla silindi', 'success');
            
            // Refresh history tab if it's active
            const historyTab = document.getElementById('history-tab');
            if (!historyTab.classList.contains('hidden')) {
                loadHistory();
            }
        } else {
            showToast('Geçmiş silinirken hata oluştu: ' + result.error, 'error');
        }
    } catch (error) {
        showToast('İşlem sırasında hata oluştu', 'error');
        console.error('Delete history error:', error);
    }
}

// Utility Functions
async function loadEmailSuggestions() {
    try {
        const records = await window.electronAPI.getAllRecords();
        
        if (records.success && records.records) {
            // Get unique emails from records
            const emails = new Set();
            records.records.forEach(record => {
                if (record.userEmail && record.userEmail.trim()) {
                    emails.add(record.userEmail.trim());
                }
            });
            
            // Populate datalist
            const datalist = document.getElementById('emailSuggestions');
            datalist.innerHTML = '';
            
            emails.forEach(email => {
                const option = document.createElement('option');
                option.value = email;
                datalist.appendChild(option);
            });
            
            console.log(`Loaded ${emails.size} unique email addresses`);
        }
    } catch (error) {
        console.error('Failed to load email suggestions:', error);
    }
}

async function loadDefaultEmailToForm() {
    try {
        const result = await window.electronAPI.getDefaultEmail();
        
        if (result.success && result.email) {
            // If multiple emails, use the first one
            const emails = result.email.split(',').map(e => e.trim()).filter(e => e);
            const firstEmail = emails.length > 0 ? emails[0] : result.email;
            
            const emailInput = document.getElementById('userEmail');
            if (emailInput && !emailInput.value) {
                emailInput.value = firstEmail;
            }
        }
    } catch (error) {
        console.error('Default email load error:', error);
    }
}

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