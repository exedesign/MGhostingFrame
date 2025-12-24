#!/usr/bin/env node
/**
 * Download OpenH264 DLL for OpenCV video encoding
 * This resolves "Failed to load OpenH264 library" errors
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const seekBzip = require('seek-bzip');

const OPENH264_VERSION = '2.1.1';
const OPENH264_URL = `http://ciscobinary.openh264.org/openh264-${OPENH264_VERSION}-win64.dll.bz2`;
const OUTPUT_DIR = path.join(__dirname, '..', 'opencv_dlls');
// OpenCV 4.x often expects the 1.8.0 filename even for newer versions
const OUTPUT_FILE = path.join(OUTPUT_DIR, `openh264-1.8.0-win64.dll`);

console.log('🎥 Setting up OpenH264 codec for OpenCV...');

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Created directory: ${OUTPUT_DIR}`);
}

// Check if already exists
if (fs.existsSync(OUTPUT_FILE)) {
    console.log('✅ OpenH264 DLL already exists');
    setupEnvironment();
    process.exit(0);
}

// Download file
console.log(`📥 Downloading OpenH264 from: ${OPENH264_URL}`);
console.log('⏳ This may take a moment...');

const bzFile = OUTPUT_FILE + '.bz2';

downloadFile(OPENH264_URL, bzFile)
    .then(() => {
        console.log('✅ Download complete');
        console.log('📦 Extracting...');
        
        try {
            // Try JavaScript bz2 decompression first
            try {
                const compressedData = fs.readFileSync(bzFile);
                const decompressedData = seekBzip.decode(compressedData);
                fs.writeFileSync(OUTPUT_FILE, decompressedData);
                fs.unlinkSync(bzFile);
                console.log('✅ Extraction complete (JavaScript)');
            } catch (jsError) {
                console.log('⚠️  JavaScript decompression failed, trying system tools...');
                
                // Try to decompress with bzip2 if available
                try {
                    execSync(`bzip2 -d "${bzFile}"`, { stdio: 'inherit' });
                    console.log('✅ Extraction complete (bzip2)');
                } catch (e) {
                    // If bzip2 not available, try 7z or WinRAR
                    console.log('⚠️  bzip2 not found, trying alternative methods...');
                    
                    // Check if 7z is available
                    try {
                        execSync(`7z x "${bzFile}" -o"${OUTPUT_DIR}" -y`, { stdio: 'inherit' });
                        fs.unlinkSync(bzFile);
                        console.log('✅ Extraction complete with 7z');
                    } catch (e2) {
                        console.error('❌ Could not extract .bz2 file');
                        console.error('Please manually extract:', bzFile);
                        console.error('To:', OUTPUT_DIR);
                        process.exit(1);
                    }
                }
            }
            
            if (fs.existsSync(OUTPUT_FILE)) {
                console.log('✅ OpenH264 DLL installed successfully');
                setupEnvironment();
            } else {
                console.error('❌ DLL file not found after extraction');
                process.exit(1);
            }
            
        } catch (error) {
            console.error('❌ Error during extraction:', error.message);
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('❌ Download failed:', error.message);
        console.error('\n📝 Manual installation:');
        console.error(`1. Download: ${OPENH264_URL}`);
        console.error(`2. Extract to: ${OUTPUT_DIR}`);
        process.exit(1);
    });

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const protocol = url.startsWith('https') ? https : http;
        
        const request = (url) => {
            protocol.get(url, response => {
                // Handle redirects
                if (response.statusCode === 302 || response.statusCode === 301) {
                    file.close();
                    fs.unlinkSync(dest);
                    return request(response.headers.location);
                }
                
                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlinkSync(dest);
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                    return;
                }
                
                const totalBytes = parseInt(response.headers['content-length'], 10);
                let downloadedBytes = 0;
                let lastPercent = 0;
                
                response.on('data', chunk => {
                    downloadedBytes += chunk.length;
                    const percent = Math.floor((downloadedBytes / totalBytes) * 100);
                    
                    if (percent > lastPercent && percent % 10 === 0) {
                        process.stdout.write(`\r📊 Progress: ${percent}%`);
                        lastPercent = percent;
                    }
                });
                
                response.pipe(file);
                
                file.on('finish', () => {
                    file.close();
                    console.log('\r📊 Progress: 100%');
                    resolve();
                });
            }).on('error', err => {
                file.close();
                fs.unlinkSync(dest);
                reject(err);
            });
        };
        
        request(url);
        
        file.on('error', err => {
            file.close();
            fs.unlinkSync(dest);
            reject(err);
        });
    });
}

function setupEnvironment() {
    console.log('\n📋 Setup complete!');
    console.log('\n💡 To use OpenH264 with OpenCV:');
    console.log(`   Add to PATH: ${OUTPUT_DIR}`);
    console.log('   Or copy DLL to Python site-packages/cv2');
    
    // Try to find Python cv2 path
    try {
        const pythonCmd = process.platform === 'win32' ? 
            'python\\venv\\Scripts\\python.exe' : 
            'python/venv/bin/python';
        
        const pythonPath = path.join(__dirname, '..', pythonCmd);
        
        if (fs.existsSync(pythonPath)) {
            const cv2Path = execSync(`"${pythonPath}" -c "import cv2; print(cv2.__file__)"`, 
                { encoding: 'utf-8' }).trim();
            
            if (cv2Path) {
                const cv2Dir = path.dirname(cv2Path);
                const targetPath = path.join(cv2Dir, path.basename(OUTPUT_FILE));
                
                console.log(`\n🔄 Copying DLL to OpenCV directory...`);
                fs.copyFileSync(OUTPUT_FILE, targetPath);
                console.log(`✅ Copied to: ${targetPath}`);
            }
        }
    } catch (e) {
        console.log('\n⚠️  Could not auto-copy to cv2 directory');
        console.log('   Please ensure OpenH264 DLL is in PATH or cv2 folder');
    }
}
