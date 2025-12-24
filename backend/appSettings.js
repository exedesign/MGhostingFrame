const Store = require('electron-store');

// Settings schema
const schema = {
    smtp: {
        type: 'object',
        properties: {
            host: {
                type: 'string',
                default: 'smtp.gmail.com'
            },
            port: {
                type: 'number',
                default: 587
            },
            secure: {
                type: 'boolean',
                default: false
            },
            user: {
                type: 'string',
                default: ''
            },
            pass: {
                type: 'string',
                default: ''
            }
        }
    },
    testEmail: {
        type: 'string',
        default: ''
    },
    watermark: {
        type: 'object',
        properties: {
            defaultStrength: {
                type: 'number',
                default: 1.0
            },
            defaultStep: {
                type: 'number',
                default: 5.0
            },
            defaultThreads: {
                type: 'number',
                default: 8
            }
        }
    }
};

// Create store
const store = new Store({ schema });

// Export store instance
module.exports = store;
