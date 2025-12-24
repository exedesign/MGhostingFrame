const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FFMPEG_DOWNLOAD_URLS = {
    win32: {
        url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
        filename: 'ffmpeg-win64.zip'
    },
    darwin: {
        url: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
        filename: 'ffmpeg-macos.zip'
    },
    linux: {
        url: 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz',
        filename: 'ffmpeg-linux.tar.xz'
    }
};

const FFMPEG_DIR = path.join(__dirname, '..', 'ffmpeg');

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        console.log(`Downloading from ${url}...`);
        const file = fs.createWriteStream(dest);
        
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Follow redirect
                return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                console.log('Download completed');
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

async function extractFFmpeg(archivePath, platform) {
    console.log('Extracting FFmpeg...');
    
    const extractDir = path.join(FFMPEG_DIR, 'temp');
    
    // Create directories
    if (!fs.existsSync(FFMPEG_DIR)) {
        fs.mkdirSync(FFMPEG_DIR, { recursive: true });
    }
    if (!fs.existsSync(extractDir)) {
        fs.mkdirSync(extractDir, { recursive: true });
    }
    
    try {
        if (platform === 'win32') {
            // Extract ZIP on Windows
            const AdmZip = require('adm-zip');
            const zip = new AdmZip(archivePath);
            zip.extractAllTo(extractDir, true);
            
            // Find bin folder and move to ffmpeg/bin
            const entries = fs.readdirSync(extractDir);
            const ffmpegFolder = entries.find(e => e.startsWith('ffmpeg'));
            
            if (ffmpegFolder) {
                const binSource = path.join(extractDir, ffmpegFolder, 'bin');
                const binDest = path.join(FFMPEG_DIR, 'bin');
                
                if (fs.existsSync(binSource)) {
                    if (fs.existsSync(binDest)) {
                        fs.rmSync(binDest, { recursive: true });
                    }
                    fs.renameSync(binSource, binDest);
                }
            }
        } else if (platform === 'darwin') {
            // Extract ZIP on macOS
            execSync(`unzip -o "${archivePath}" -d "${extractDir}"`);
            
            const binDest = path.join(FFMPEG_DIR, 'bin');
            if (!fs.existsSync(binDest)) {
                fs.mkdirSync(binDest, { recursive: true });
            }
            
            // Move binaries
            const entries = fs.readdirSync(extractDir);
            entries.forEach(file => {
                if (file.startsWith('ffmpeg') || file.startsWith('ffprobe')) {
                    const src = path.join(extractDir, file);
                    const dst = path.join(binDest, file);
                    fs.renameSync(src, dst);
                    fs.chmodSync(dst, 0o755); // Make executable
                }
            });
        } else {
            // Extract tar.xz on Linux
            execSync(`tar -xJf "${archivePath}" -C "${extractDir}"`);
            
            const entries = fs.readdirSync(extractDir);
            const ffmpegFolder = entries.find(e => e.startsWith('ffmpeg'));
            
            if (ffmpegFolder) {
                const binSource = path.join(extractDir, ffmpegFolder);
                const binDest = path.join(FFMPEG_DIR, 'bin');
                
                if (!fs.existsSync(binDest)) {
                    fs.mkdirSync(binDest, { recursive: true });
                }
                
                // Copy ffmpeg and ffprobe
                ['ffmpeg', 'ffprobe'].forEach(file => {
                    const src = path.join(binSource, file);
                    const dst = path.join(binDest, file);
                    if (fs.existsSync(src)) {
                        fs.copyFileSync(src, dst);
                        fs.chmodSync(dst, 0o755); // Make executable
                    }
                });
            }
        }
        
        // Cleanup
        fs.rmSync(extractDir, { recursive: true, force: true });
        fs.unlinkSync(archivePath);
        
        console.log('FFmpeg extracted successfully to:', path.join(FFMPEG_DIR, 'bin'));
        
    } catch (error) {
        console.error('Extraction failed:', error.message);
        throw error;
    }
}

async function setupFFmpeg() {
    const platform = process.platform;
    
    if (!FFMPEG_DOWNLOAD_URLS[platform]) {
        console.error(`Platform ${platform} not supported for automatic FFmpeg download`);
        console.log('Please install FFmpeg manually and add it to your PATH');
        return;
    }
    
    console.log(`Setting up FFmpeg for ${platform}...`);
    
    // Check if already exists
    const binDir = path.join(FFMPEG_DIR, 'bin');
    const ffmpegBin = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    const ffmpegPath = path.join(binDir, ffmpegBin);
    
    if (fs.existsSync(ffmpegPath)) {
        console.log('FFmpeg already exists, skipping download');
        return;
    }
    
    const { url, filename } = FFMPEG_DOWNLOAD_URLS[platform];
    const archivePath = path.join(__dirname, '..', filename);
    
    try {
        // Download
        await downloadFile(url, archivePath);
        
        // Extract
        await extractFFmpeg(archivePath, platform);
        
        console.log('✅ FFmpeg setup completed successfully!');
        
    } catch (error) {
        console.error('❌ FFmpeg setup failed:', error.message);
        console.log('\nManual installation required:');
        console.log('1. Download FFmpeg from: https://ffmpeg.org/download.html');
        console.log('2. Extract and place binaries in: ' + binDir);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    setupFFmpeg().catch(console.error);
}

module.exports = setupFFmpeg;
