const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { app } = require('electron');

class ProcessManager {
    constructor() {
        // Check if running in development or production
        const isDev = !app.isPackaged;
        
        // Use virtual environment Python if available
        const venvPython = path.join(__dirname, '../python/venv/Scripts/python.exe');
        
        if (isDev && require('fs').existsSync(venvPython)) {
            this.pythonPath = venvPython;
            console.log('Using virtual environment Python:', venvPython);
        } else {
            this.pythonPath = process.env.PYTHON_EXECUTABLE || 'python';
            console.log('Using system Python:', this.pythonPath);
        }
        
        this.scriptPath = path.join(__dirname, '../python/watermark_processor.py');
        console.log('Python script path:', this.scriptPath);
        
        // Get bundled FFmpeg path
        if (isDev) {
            this.ffmpegPath = 'ffmpeg'; // Use system FFmpeg in dev
        } else {
            const ffmpegBin = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
            this.ffmpegPath = path.join(process.resourcesPath, 'ffmpeg', 'bin', ffmpegBin);
        }
    }

    /**
     * Execute Python script with given command and arguments
     * @param {string} command - Command name
     * @param {object} args - Arguments
     * @param {object} mainWindow - Electron main window for IPC messages
     */
    async executePythonScript(command, args, mainWindow = null) {
        return new Promise((resolve, reject) => {
            const argsJson = JSON.stringify(args);
            const pythonProcess = spawn(this.pythonPath, [this.scriptPath, command, argsJson]);

            let stdout = '';
            let stderr = '';
            let progressData = [];

            pythonProcess.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;

                // Try to parse progress updates
                const lines = output.split('\n').filter(line => line.trim());
                for (const line of lines) {
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.status) {
                            progressData.push(parsed);
                            console.log(`Progress: ${parsed.progress || '?'}% - ${parsed.message}`);
                            
                            // Send to UI via IPC
                            if (mainWindow && !mainWindow.isDestroyed()) {
                                mainWindow.webContents.send('watermark-progress', {
                                    status: parsed.status,
                                    message: parsed.message,
                                    progress: parsed.progress || 0,
                                    timestamp: new Date().toLocaleTimeString('tr-TR')
                                });
                            }
                        }
                    } catch (e) {
                        // Not JSON, regular output
                        const trimmedLine = line.trim();
                        
                        // Only show important lines (skip debug/progress bar info)
                        if (trimmedLine && 
                            !trimmedLine.includes('|') && // Skip progress bar lines
                            mainWindow && !mainWindow.isDestroyed()) {
                            
                            mainWindow.webContents.send('watermark-progress', {
                                status: 'log',
                                message: trimmedLine,
                                progress: 0,
                                timestamp: new Date().toLocaleTimeString('tr-TR')
                            });
                        }
                    }
                }
            });

            pythonProcess.stderr.on('data', (data) => {
                const errOutput = data.toString();
                stderr += errOutput;
                console.error('Python stderr:', errOutput);
                
                // Send error to UI via IPC (but filter out progress bar lines)
                const errLines = errOutput.split('\n').filter(line => line.trim());
                for (const line of errLines) {
                    let cleanLine = line.trim();
                    
                    // Remove ANSI escape codes (e.g., [A, [B, [C, etc.)
                    cleanLine = cleanLine.replace(/\x1b\[[^m]*m/g, '');  // Color codes
                    cleanLine = cleanLine.replace(/\x1b\[.*?[A-Za-z]/g, '');  // Cursor movement (like [A, [B)
                    cleanLine = cleanLine.replace(/[\[\]]/g, '');  // Remove remaining brackets
                    cleanLine = cleanLine.trim();
                    
                    // Skip progress bar lines (contain | and % characters)
                    // These are from tqdm progress bars and shouldn't be shown as errors
                    if (cleanLine.includes('|') && cleanLine.includes('%')) {
                        continue; // Skip progress bar output
                    }
                    
                    // Skip empty lines
                    if (!cleanLine) {
                        continue;
                    }
                    
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('watermark-progress', {
                            status: 'error',
                            message: `[ERROR] ${cleanLine}`,
                            progress: 0,
                            timestamp: new Date().toLocaleTimeString('tr-TR')
                        });
                    }
                }
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error('=== PYTHON ERROR DEBUG ===');
                    console.error('Exit Code:', code);
                    console.error('STDOUT:', stdout);
                    console.error('STDERR:', stderr);
                    console.error('Command:', this.pythonPath, this.scriptPath, command);
                    console.error('========================');
                    reject(new Error(`Python process exited with code ${code}\n\nSTDERR: ${stderr}\n\nSTDOUT: ${stdout}`));
                    return;
                }

                try {
                    // Parse JSON objects from stdout (multiple objects separated by whitespace)
                    const jsonObjects = [];
                    let currentJson = '';
                    let braceCount = 0;
                    
                    for (let char of stdout) {
                        if (char === '{') {
                            braceCount++;
                            currentJson += char;
                        } else if (char === '}') {
                            braceCount--;
                            currentJson += char;
                            
                            // Complete JSON object found
                            if (braceCount === 0 && currentJson.trim()) {
                                try {
                                    const parsed = JSON.parse(currentJson.trim());
                                    jsonObjects.push(parsed);
                                    currentJson = '';
                                } catch (e) {
                                    // Invalid JSON, reset
                                    currentJson = '';
                                }
                            }
                        } else if (braceCount > 0) {
                            currentJson += char;
                        }
                    }
                    
                    // Find the last object with success field (final result)
                    let result = null;
                    for (let i = jsonObjects.length - 1; i >= 0; i--) {
                        if (jsonObjects[i].hasOwnProperty('success')) {
                            result = jsonObjects[i];
                            break;
                        }
                    }
                    
                    if (!result) {
                        reject(new Error(`No valid result found in Python output:\n${stdout}`));
                        return;
                    }
                    
                    resolve(result);
                } catch (error) {
                    reject(new Error(`Failed to parse Python output: ${error.message}\nOutput: ${stdout}`));
                }
            });

            pythonProcess.on('error', (error) => {
                reject(new Error(`Failed to start Python process: ${error.message}`));
            });
        });
    }

    /**
     * Embed key-based watermark
     * @param {object} options - Options
     * @param {object} mainWindow - Electron main window for progress updates
     */
    async embedWatermarkKey({ videoPath, outputPath, keys, sequence, fragLength, strength, step, threads }, mainWindow = null) {
        try {
            const result = await this.executePythonScript('embed-key', {
                video_path: videoPath,
                output_path: outputPath,
                keys: keys,
                sequence: sequence,
                frag_length: fragLength || 1,
                strength: strength || 1.0,
                step: step || 5.0,
                threads: threads || 8
            }, mainWindow);

            return result;
        } catch (error) {
            console.error('Embed key-based watermark error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Extract key-based watermark
     */
    async extractWatermarkKey({ videoPath, keys, fragLength, strength, step, threads }) {
        try {
            const result = await this.executePythonScript('extract-key', {
                video_path: videoPath,
                keys: keys,
                frag_length: fragLength || 1,
                strength: strength || 1.0,
                step: step || 5.0,
                threads: threads || 8
            });

            return result;
        } catch (error) {
            console.error('Extract key-based watermark error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Image-based watermarking removed - System now uses key-based only for better performance and reliability

    /**
     * Check if Python and required packages are installed
     */
    async checkPythonEnvironment() {
        return new Promise((resolve) => {
            const pythonProcess = spawn(this.pythonPath, ['-c', 'import blind_video_watermark; import cv2; print("OK")']);

            let output = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0 && output.includes('OK')) {
                    resolve({ success: true, message: 'Python environment is ready' });
                } else {
                    resolve({ 
                        success: false, 
                        message: 'Python environment check failed. Please install required packages: pip install -r python/requirements.txt' 
                    });
                }
            });

            pythonProcess.on('error', () => {
                resolve({ 
                    success: false, 
                    message: 'Python not found. Please install Python 3.8 or higher' 
                });
            });
        });
    }
}

module.exports = new ProcessManager();
