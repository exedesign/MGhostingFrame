const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Backend modules
const processManager = require('./backend/processManager');
const fileManager = require('./backend/fileManager');
const emailService = require('./backend/emailService');
const keyStorage = require('./backend/keyStorage');

// Load environment variables
require('dotenv').config();

let mainWindow;

// Create main window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'src/assets/icons/icon.png'),
        title: 'MGhosting Video Watermark',
        backgroundColor: '#1e1e1e',
        show: false
    });

    mainWindow.loadFile('src/index.html');

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// App ready
app.whenReady().then(() => {
    // Initialize email service
    emailService.initializeTransporter();
    
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// ===== HELPER FUNCTIONS =====

/**
 * Generate unique keys and sequence from a unique key number
 * This ensures every user gets a unique combination
 * @param {number} uniqueKey - 6-digit unique key (e.g., 454247)
 * @returns {{keys: number[], sequence: string}}
 */
function generateKeysFromUniqueKey(uniqueKey) {
    const seed = uniqueKey;
    const keys = [];
    let currentSeed = seed;
    
    // Generate 4 unique keys (100-999 range)
    for (let i = 0; i < 4; i++) {
        currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
        const key = 100 + (currentSeed % 900);
        keys.push(key);
    }
    
    // Generate sequence (permutation of 0-3)
    currentSeed = seed + 12345;
    const digits = [0, 1, 2, 3];
    const sequence = [];
    
    for (let i = 0; i < 4; i++) {
        currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
        const index = currentSeed % digits.length;
        sequence.push(digits.splice(index, 1)[0]);
    }
    
    return {
        keys,
        sequence: sequence.join('')
    };
}

// ===== IPC HANDLERS =====

// Validate video file
ipcMain.handle('validate-video', async (event, filePath) => {
    return await fileManager.validateVideoFile(filePath);
});

// Select video file
ipcMain.handle('select-video-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Video Files', extensions: ['mp4', 'avi', 'mov', 'mkv'] }
        ]
    });

    if (result.canceled) {
        return { canceled: true };
    }

    const filePath = result.filePaths[0];
    const validation = await fileManager.validateVideoFile(filePath);

    return {
        canceled: false,
        filePath,
        validation
    };
});

// Watermark image selection removed - key-based only

// Select output directory
ipcMain.handle('select-output-directory', async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
        properties: ['createDirectory'],
        defaultPath: 'watermarked_video.mp4',
        filters: [
            { name: 'Video Files', extensions: ['mp4'] }
        ]
    });

    if (result.canceled) {
        return { canceled: true };
    }

    return {
        canceled: false,
        filePath: result.filePath
    };
});

// Embed watermark (key-based) - AUTO-GENERATE KEYS
ipcMain.handle('embed-watermark-key', async (event, data) => {
    try {
        const { videoPath, outputPath, fragLength, userEmail, userName, strength, step, threads } = data;

        // Validate inputs
        if (!videoPath || !outputPath || !userEmail || !userName) {
            throw new Error('Missing required parameters: videoPath, outputPath, userEmail, userName');
        }

        // Prepare temp directory
        const tempDir = path.join(__dirname, 'temp');
        await fileManager.ensureDirectory(tempDir);

        // 1. Generate unique key (timestamp-based)
        const uniqueKey = await keyStorage.generateUniqueKey();
        console.log(`Generated unique key: ${uniqueKey}`);

        // 2. Generate keys and sequence from uniqueKey
        const { keys, sequence } = generateKeysFromUniqueKey(uniqueKey);
        console.log(`Generated keys: [${keys.join(', ')}]`);
        console.log(`Generated sequence: ${sequence}`);
        console.log(`User: ${userName} (${userEmail})`);

        // 3. Process video
        const result = await processManager.embedWatermarkKey({
            videoPath,
            outputPath,
            keys,
            sequence,
            fragLength: fragLength || 2,
            strength: strength || 1.0,
            step: step || 5.0,
            threads: threads || 8
        }, mainWindow);

        if (result.success) {
            // 4. Save to storage with user mapping
            const record = await keyStorage.saveRecord({
                videoPath,
                outputPath,
                method: 'key-based',
                keys,
                sequence,
                key: uniqueKey,
                fragLength: fragLength || 2,
                userEmail,
                userName,
                videoInfo: result.video_info,
                timestamp: new Date().toISOString()
            });

            // 5. Send email if configured
            if (userEmail && emailService.isConfigured()) {
                await emailService.sendWatermarkEmail({
                    to: userEmail,
                    userName,
                    videoName: path.basename(videoPath),
                    method: 'key-based',
                    keys,
                    sequence,
                    uniqueKey,
                    recordId: record.id
                });
            }

            return {
                success: true,
                outputPath: result.output_path,
                recordId: record.id,
                uniqueKey,
                keys,
                sequence,
                message: `Filigran eklendi! Kullanıcı: ${userName}, Key: ${uniqueKey}`
            };
        } else {
            throw new Error(result.error || 'Watermark embedding failed');
        }

    } catch (error) {
        console.error('Embed watermark key error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Image-based watermarking removed - System now uses key-based only

// Extract watermark (key-based) - AUTO-SEARCH ALL RECORDS
ipcMain.handle('extract-watermark-key', async (event, data) => {
    try {
        const { videoPath, outputFolder } = data;

        console.log('\n=== AUTO EXTRACTION START ===');
        console.log('Video:', videoPath);

        // Get all records from database
        const allRecords = await keyStorage.getAllRecords();
        const keyRecords = allRecords.filter(r => r.keys && r.sequence);

        if (keyRecords.length === 0) {
            console.log('No records found in database!');
            return {
                success: false,
                error: 'Database boş! Henüz hiç video filigranlanmamış.'
            };
        }

        console.log(`Found ${keyRecords.length} records to try...`);

        // Try each record
        for (let i = 0; i < keyRecords.length; i++) {
            const record = keyRecords[i];
            console.log(`\n[${i + 1}/${keyRecords.length}] Testing:`);
            console.log(`  Unique Key: ${record.key}`);
            console.log(`  Keys: [${record.keys.join(', ')}]`);
            console.log(`  Sequence: ${record.sequence}`);
            console.log(`  User: ${record.userName}`);

            try {
                const result = await processManager.extractWatermarkKey({
                    videoPath,
                    keys: record.keys,
                    fragLength: record.fragLength || 2,
                    outputFolder: outputFolder || path.join(__dirname, 'output', `extract_${Date.now()}`)
                });

                // Check if extraction was successful
                if (result.success && result.detected_sequence && !result.detected_sequence.includes('#')) {
                    console.log('\n✅ MATCH FOUND!');
                    console.log(`  Detected Sequence: ${result.detected_sequence}`);
                    console.log(`  Expected Sequence: ${record.sequence}`);

                    // Verify keys regeneration
                    const regenerated = generateKeysFromUniqueKey(record.key);
                    const isValidated = 
                        JSON.stringify(regenerated.keys) === JSON.stringify(record.keys) &&
                        regenerated.sequence === record.sequence;

                    console.log(`  Validation: ${isValidated ? '✅ PASSED' : '⚠️ WARNING'}`);

                    return {
                        success: true,
                        uniqueKey: record.key,
                        keys: record.keys,
                        sequence: result.detected_sequence,
                        userInfo: {
                            userName: record.userName,
                            userEmail: record.userEmail,
                            videoPath: record.videoPath,
                            createdAt: record.createdAt,
                            keyGeneratedAt: record.keyGeneratedAt
                        },
                        validated: isValidated,
                        outputFolder: result.output_folder,
                        message: `Video ${record.userName} kullanıcısına aittir!`
                    };
                }

                console.log('  ❌ No match');

            } catch (extractError) {
                console.log(`  ❌ Extraction failed: ${extractError.message}`);
            }
        }

        // No match found
        console.log('\n❌ NO MATCH FOUND IN ANY RECORD');
        return {
            success: false,
            error: `${keyRecords.length} kayıt denendi, eşleşme bulunamadı. Video farklı bir sistemde mi filigranlandı?`
        };

    } catch (error) {
        console.error('Extract watermark error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Image-based extraction removed - System now uses key-based only

// Get all records
ipcMain.handle('get-all-records', async () => {
    try {
        const records = await keyStorage.getAllRecords();
        return {
            success: true,
            records
        };
    } catch (error) {
        console.error('Get all records error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Get record by ID
ipcMain.handle('get-record-by-id', async (event, recordId) => {
    try {
        const record = await keyStorage.getRecordById(recordId);
        return {
            success: true,
            record
        };
    } catch (error) {
        console.error('Get record by ID error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Export records to JSON
ipcMain.handle('export-records', async () => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            defaultPath: `watermark_records_${Date.now()}.json`,
            filters: [
                { name: 'JSON Files', extensions: ['json'] }
            ]
        });

        if (result.canceled) {
            return { canceled: true };
        }

        const records = await keyStorage.getAllRecords();
        fs.writeFileSync(result.filePath, JSON.stringify(records, null, 2));

        return {
            success: true,
            filePath: result.filePath,
            message: 'Kayıtlar başarıyla dışa aktarıldı'
        };

    } catch (error) {
        console.error('Export records error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Clean temp directory
ipcMain.handle('clean-temp', async () => {
    try {
        const tempDir = path.join(__dirname, 'temp');
        await fileManager.cleanDirectory(tempDir);
        return {
            success: true,
            message: 'Geçici dosyalar temizlendi'
        };
    } catch (error) {
        console.error('Clean temp error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Get app info
ipcMain.handle('get-app-info', async () => {
    return {
        version: app.getVersion(),
        name: app.getName(),
        platform: process.platform,
        arch: process.arch
    };
});

// Get SMTP settings
ipcMain.handle('get-smtp-settings', async () => {
    try {
        const settings = emailService.getSMTPSettings();
        return {
            success: true,
            settings
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});

// Update SMTP settings
ipcMain.handle('update-smtp-settings', async (event, newSettings) => {
    try {
        const result = emailService.updateSMTPSettings(newSettings);
        return result;
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});

// Send test email
ipcMain.handle('send-test-email', async (event, emailAddress) => {
    try {
        const result = await emailService.sendTestEmail(emailAddress);
        return result;
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});

// Get test email address
ipcMain.handle('get-test-email', async () => {
    try {
        const appSettings = require('./backend/appSettings');
        const testEmail = appSettings.get('testEmail');
        return {
            success: true,
            email: testEmail
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});

// Save test email address
ipcMain.handle('save-test-email', async (event, emailAddress) => {
    try {
        const appSettings = require('./backend/appSettings');
        appSettings.set('testEmail', emailAddress);
        return {
            success: true,
            message: 'Test email address saved'
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});

// Generate unique key
ipcMain.handle('generate-unique-key', async () => {
    try {
        const uniqueKey = await keyStorage.generateUniqueKey();
        return {
            success: true,
            key: uniqueKey
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});

// Check if key exists
ipcMain.handle('check-key-exists', async (event, key) => {
    try {
        const exists = await keyStorage.keyExists(key);
        return {
            success: true,
            exists
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});

// Get next available key
ipcMain.handle('get-next-key', async () => {
    try {
        const nextKey = await keyStorage.getNextKey();
        return {
            success: true,
            key: nextKey
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});

// Search by key
ipcMain.handle('search-by-key', async (event, key) => {
    try {
        const records = await keyStorage.searchByKey(key);
        return {
            success: true,
            records
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});
