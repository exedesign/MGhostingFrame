const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class KeyStorage {
    constructor() {
        this.dbPath = path.join(__dirname, '../data/records.json');
        this.records = [];
        this.initialized = false;
        this.initialize();
    }

    /**
     * Initialize storage
     */
    async initialize() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.dbPath);
            try {
                await fs.access(dataDir);
            } catch {
                await fs.mkdir(dataDir, { recursive: true });
            }

            // Load existing records
            try {
                const data = await fs.readFile(this.dbPath, 'utf8');
                this.records = JSON.parse(data);
            } catch (error) {
                // File doesn't exist, start with empty array
                this.records = [];
                await this.saveToFile();
            }

            this.initialized = true;
            console.log(`KeyStorage initialized with ${this.records.length} records`);

        } catch (error) {
            console.error('Failed to initialize KeyStorage:', error);
            this.initialized = false;
        }
    }

    /**
     * Save records to file
     */
    async saveToFile() {
        try {
            await fs.writeFile(this.dbPath, JSON.stringify(this.records, null, 2), 'utf8');
            return { success: true };
        } catch (error) {
            console.error('Failed to save records:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Save a new record
     */
    async saveRecord(data) {
        if (!this.initialized) {
            await this.initialize();
        }

        const now = new Date();
        const record = {
            id: uuidv4(),
            ...data,
            userEmail: data.userEmail || null,
            userName: data.userName || null,
            keyGeneratedAt: now.toISOString(),
            keyTimestamp: now.getTime(),
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        };

        this.records.push(record);
        await this.saveToFile();

        return record;
    }

    /**
     * Save key-to-user mapping
     * @param {number} key - The unique key embedded in video
     * @param {string} userEmail - User's email address
     * @param {string} userName - User's name
     * @param {array} keys - The keys array used for embedding
     * @param {string} sequence - The sequence used for embedding
     */
    async saveKeyMapping(key, userEmail, userName, keys, sequence) {
        if (!this.initialized) {
            await this.initialize();
        }

        const mapping = {
            key,
            userEmail,
            userName,
            keys,
            sequence,
            createdAt: new Date().toISOString()
        };

        // Store in record
        return mapping;
    }

    /**
     * Get user info by key
     * @param {number} key - The extracted key from video
     */
    async getKeyMapping(key) {
        if (!this.initialized) {
            await this.initialize();
        }

        const record = this.records.find(r => r.key === key && r.method === 'key-based');
        
        if (!record) {
            return null;
        }

        return {
            key: record.key,
            userEmail: record.userEmail,
            userName: record.userName,
            keys: record.keys,
            sequence: record.sequence,
            videoPath: record.videoPath,
            outputPath: record.outputPath,
            createdAt: record.createdAt
        };
    }

    /**
     * Search records by key
     */
    async searchByKey(key) {
        if (!this.initialized) {
            await this.initialize();
        }

        return this.records.filter(r => r.key === key);
    }

    /**
     * Get all keys by user email
     */
    async getKeysByEmail(email) {
        if (!this.initialized) {
            await this.initialize();
        }

        return this.records.filter(r => 
            r.userEmail && r.userEmail.toLowerCase() === email.toLowerCase()
        );
    }

    /**
     * Get all records
     */
    async getAllRecords() {
        if (!this.initialized) {
            await this.initialize();
        }

        return this.records.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
    }

    /**
     * Get record by ID
     */
    async getRecordById(id) {
        if (!this.initialized) {
            await this.initialize();
        }

        const record = this.records.find(r => r.id === id);
        return record || null;
    }

    /**
     * Update record
     */
    async updateRecord(id, updates) {
        if (!this.initialized) {
            await this.initialize();
        }

        const index = this.records.findIndex(r => r.id === id);
        
        if (index === -1) {
            return { success: false, error: 'Record not found' };
        }

        this.records[index] = {
            ...this.records[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await this.saveToFile();

        return { success: true, record: this.records[index] };
    }

    /**
     * Delete record
     */
    async deleteRecord(id) {
        if (!this.initialized) {
            await this.initialize();
        }

        const index = this.records.findIndex(r => r.id === id);
        
        if (index === -1) {
            return { success: false, error: 'Record not found' };
        }

        this.records.splice(index, 1);
        await this.saveToFile();

        return { success: true };
    }

    /**
     * Delete all records
     */
    async deleteAllRecords() {
        if (!this.initialized) {
            await this.initialize();
        }

        this.records = [];
        await this.saveToFile();

        return { success: true };
    }

    /**
     * Search records
     */
    async searchRecords(query) {
        if (!this.initialized) {
            await this.initialize();
        }

        const lowerQuery = query.toLowerCase();

        return this.records.filter(record => {
            return (
                (record.videoPath && record.videoPath.toLowerCase().includes(lowerQuery)) ||
                (record.method && record.method.toLowerCase().includes(lowerQuery)) ||
                (record.sequence && record.sequence.includes(query)) ||
                (record.id && record.id.toLowerCase().includes(lowerQuery))
            );
        });
    }

    /**
     * Get records by method
     */
    async getRecordsByMethod(method) {
        if (!this.initialized) {
            await this.initialize();
        }

        return this.records.filter(r => r.method === method);
    }

    /**
     * Generate unique key (guaranteed to be unique)
     * Uses timestamp + random for maximum uniqueness
     * @returns {number} - A unique key between 100000 and 999999
     */
    async generateUniqueKey() {
        if (!this.initialized) {
            await this.initialize();
        }

        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            // Generate timestamp-based key
            const key = this._generateTimestampKey();

            // Check if key already exists
            const exists = this.records.some(r => r.key === key);

            if (!exists) {
                return key;
            }

            attempts++;
            
            // Small delay to ensure different timestamp
            await new Promise(resolve => setTimeout(resolve, 1));
        }

        // Fallback: Full timestamp modulo
        const timestamp = Date.now();
        const key = (timestamp % 900000) + 100000;
        return key;
    }

    /**
     * Generate timestamp-based key
     * Format: YYMMDDHHmmss combined with milliseconds
     * Example: 2025-12-24 14:35:42.123 -> 512442 (last 6 digits)
     * @private
     * @returns {number}
     */
    _generateTimestampKey() {
        const now = new Date();
        
        // Get date/time components
        const year = now.getFullYear().toString().slice(-2);      // 25
        const month = String(now.getMonth() + 1).padStart(2, '0'); // 12
        const day = String(now.getDate()).padStart(2, '0');        // 24
        const hour = String(now.getHours()).padStart(2, '0');      // 14
        const minute = String(now.getMinutes()).padStart(2, '0');  // 35
        const second = String(now.getSeconds()).padStart(2, '0');  // 42
        const ms = String(now.getMilliseconds()).padStart(3, '0'); // 123
        
        // Combine: YYMMDDHHmmssSSS = 25122414354212
        const fullTimestamp = `${year}${month}${day}${hour}${minute}${second}${ms}`;
        
        // Take last 6 digits + small random offset
        let key = parseInt(fullTimestamp.slice(-6));
        
        // Add random component (0-99) for same-millisecond collision prevention
        const randomOffset = Math.floor(Math.random() * 100);
        key = (key + randomOffset) % 900000;
        
        // Ensure 6-digit range (100000-999999)
        if (key < 100000) {
            key += 100000;
        }
        
        return key;
    }

    /**
     * Get key generation info (approximate)
     * Note: Exact timestamp is stored in keyGeneratedAt field
     * @param {number} key - The key
     * @returns {object} - Estimated generation time info
     */
    getKeyInfo(key) {
        // Get record with this key
        const record = this.records.find(r => r.key === key);
        
        if (record && record.keyGeneratedAt) {
            return {
                key,
                generatedAt: record.keyGeneratedAt,
                timestamp: record.keyTimestamp,
                userEmail: record.userEmail,
                userName: record.userName,
                exact: true
            };
        }
        
        // If no record, key is just a number
        return {
            key,
            message: 'Key metadata not found. Record may not exist.',
            exact: false
        };
    }

    /**
     * Check if key exists
     * @param {number} key - The key to check
     * @returns {boolean}
     */
    async keyExists(key) {
        if (!this.initialized) {
            await this.initialize();
        }

        return this.records.some(r => r.key === key);
    }

    /**
     * Get next available key (auto-increment style)
     * @returns {number}
     */
    async getNextKey() {
        if (!this.initialized) {
            await this.initialize();
        }

        // Find highest existing key
        let maxKey = 0;
        for (const record of this.records) {
            if (record.key && record.key > maxKey) {
                maxKey = record.key;
            }
        }

        // Return next key (starting from 1000 if no records)
        return maxKey > 0 ? maxKey + 1 : 1000;
    }

    /**
     * Get statistics
     */
    async getStatistics() {
        if (!this.initialized) {
            await this.initialize();
        }

        const stats = {
            total: this.records.length,
            keyBased: this.records.filter(r => r.method === 'key-based').length,
            uniqueUsers: new Set(this.records.map(r => r.userEmail).filter(e => e)).size,
            uniqueKeys: new Set(this.records.map(r => r.key).filter(k => k)).size,
            totalSize: 0,
            avgSize: 0
        };

        // Calculate total and average video size
        let sizeCount = 0;
        for (const record of this.records) {
            if (record.videoInfo && record.videoInfo.size_bytes) {
                stats.totalSize += record.videoInfo.size_bytes;
                sizeCount++;
            }
        }

        if (sizeCount > 0) {
            stats.avgSize = stats.totalSize / sizeCount;
        }

        return stats;
    }

    /**
     * Export records to JSON
     */
    async exportRecords(filePath) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            await fs.writeFile(filePath, JSON.stringify(this.records, null, 2), 'utf8');
            return { success: true, message: 'Records exported successfully' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Import records from JSON
     */
    async importRecords(filePath) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const data = await fs.readFile(filePath, 'utf8');
            const importedRecords = JSON.parse(data);

            if (!Array.isArray(importedRecords)) {
                return { success: false, error: 'Invalid records format' };
            }

            // Add imported records (avoid duplicates by ID)
            let addedCount = 0;
            for (const record of importedRecords) {
                if (!this.records.find(r => r.id === record.id)) {
                    this.records.push(record);
                    addedCount++;
                }
            }

            await this.saveToFile();

            return { 
                success: true, 
                message: `Imported ${addedCount} new records`,
                addedCount 
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Clear all records (with confirmation)
     */
    async clearAllRecords() {
        if (!this.initialized) {
            await this.initialize();
        }

        const count = this.records.length;
        this.records = [];
        await this.saveToFile();

        return { 
            success: true, 
            message: `Cleared ${count} records` 
        };
    }

    /**
     * Get database file path
     */
    getDbPath() {
        return this.dbPath;
    }
}

module.exports = new KeyStorage();
