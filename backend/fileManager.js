const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const { app } = require('electron');

class FileManager {
    constructor() {
        // Get bundled FFmpeg path
        const isDev = !app.isPackaged;
        if (isDev) {
            this.ffmpegPath = 'ffmpeg';
            this.ffprobePath = 'ffprobe';
        } else {
            const ffmpegBin = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
            const ffprobeBin = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
            this.ffmpegPath = path.join(process.resourcesPath, 'ffmpeg', 'bin', ffmpegBin);
            this.ffprobePath = path.join(process.resourcesPath, 'ffmpeg', 'bin', ffprobeBin);
        }
    }
    /**
     * Validate video file
     */
    async validateVideoFile(filePath) {
        try {
            const stats = await fs.stat(filePath);

            if (!stats.isFile()) {
                return {
                    valid: false,
                    error: 'Selected path is not a file'
                };
            }

            const ext = path.extname(filePath).toLowerCase();
            const validExtensions = ['.mp4', '.avi', '.mov', '.mkv'];

            if (!validExtensions.includes(ext)) {
                return {
                    valid: false,
                    error: `Invalid file extension. Supported: ${validExtensions.join(', ')}`
                };
            }

            // Check if file is readable
            try {
                await fs.access(filePath, fs.constants.R_OK);
            } catch (error) {
                return {
                    valid: false,
                    error: 'File is not readable'
                };
            }

            // Get file info using ffprobe if available
            const videoInfo = await this.getVideoInfo(filePath);

            return {
                valid: true,
                size: stats.size,
                extension: ext,
                name: path.basename(filePath),
                info: videoInfo
            };

        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    /**
     * Get video information using ffprobe
     */
    async getVideoInfo(filePath) {
        return new Promise((resolve) => {
            const ffprobe = spawn(this.ffprobePath, [
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                filePath
            ]);

            let output = '';

            ffprobe.stdout.on('data', (data) => {
                output += data.toString();
            });

            ffprobe.on('close', (code) => {
                if (code === 0) {
                    try {
                        const data = JSON.parse(output);
                        const videoStream = data.streams.find(s => s.codec_type === 'video');

                        if (videoStream) {
                            resolve({
                                width: videoStream.width,
                                height: videoStream.height,
                                codec: videoStream.codec_name,
                                duration: parseFloat(data.format.duration),
                                bitrate: parseInt(data.format.bit_rate),
                                fps: eval(videoStream.r_frame_rate)
                            });
                        } else {
                            resolve(null);
                        }
                    } catch (error) {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            });

            ffprobe.on('error', () => {
                resolve(null);
            });
        });
    }

    /**
     * Ensure directory exists
     */
    async ensureDirectory(dirPath) {
        try {
            await fs.access(dirPath);
        } catch (error) {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    /**
     * Clean directory
     */
    async cleanDirectory(dirPath) {
        try {
            const files = await fs.readdir(dirPath);

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stats = await fs.stat(filePath);

                if (stats.isDirectory()) {
                    await this.cleanDirectory(filePath);
                    await fs.rmdir(filePath);
                } else {
                    await fs.unlink(filePath);
                }
            }

            return { success: true, message: `Cleaned ${files.length} items` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Copy file
     */
    async copyFile(source, destination) {
        try {
            await fs.copyFile(source, destination);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate unique filename
     */
    generateUniqueFilename(originalPath, suffix = '') {
        const ext = path.extname(originalPath);
        const name = path.basename(originalPath, ext);
        const dir = path.dirname(originalPath);
        const timestamp = Date.now();

        return path.join(dir, `${name}${suffix}_${timestamp}${ext}`);
    }

    /**
     * Get file size in human readable format
     */
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Format duration in human readable format
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Check if FFmpeg is installed
     */
    async checkFFmpegInstalled() {
        return new Promise((resolve) => {
            const ffmpeg = spawn(this.ffmpegPath, ['-version']);

            ffmpeg.on('close', (code) => {
                resolve(code === 0);
            });

            ffmpeg.on('error', () => {
                resolve(false);
            });
        });
    }
}

module.exports = new FileManager();
