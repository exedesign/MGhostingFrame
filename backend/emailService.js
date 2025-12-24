const nodemailer = require('nodemailer');
const path = require('path');
const appSettings = require('./appSettings');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initialized = false;
    }

    /**
     * Initialize email transporter
     */
    initializeTransporter() {
        try {
            const smtpSettings = appSettings.get('smtp');
            
            console.log('=== EMAIL SERVICE DEBUG ===');
            console.log('SMTP Settings:', JSON.stringify({
                host: smtpSettings?.host,
                port: smtpSettings?.port,
                secure: smtpSettings?.secure,
                user: smtpSettings?.user,
                hasPassword: !!smtpSettings?.pass
            }));
            
            const config = {
                host: smtpSettings.host || 'smtp.gmail.com',
                port: smtpSettings.port || 587,
                secure: smtpSettings.secure || false,
                auth: {
                    user: smtpSettings.user,
                    pass: smtpSettings.pass
                }
            };

            if (!config.auth.user || !config.auth.pass) {
                console.warn('Email credentials not configured. Email service disabled.');
                console.log('=========================');
                this.initialized = false;
                return;
            }

            this.transporter = nodemailer.createTransport(config);
            this.initialized = true;

            // Verify connection
            this.transporter.verify((error, success) => {
                if (error) {
                    console.error('Email service verification failed:', error);
                    this.initialized = false;
                } else {
                    console.log('✅ Email service ready and verified');
                }
                console.log('=========================');
            });

        } catch (error) {
            console.error('Failed to initialize email service:', error);
            console.log('=========================');
            this.initialized = false;
        }
    }

    /**
     * Check if email service is configured and ready
     * @returns {boolean}
     */
    isConfigured() {
        return this.initialized && this.transporter !== null;
    }

    /**
     * Send watermark completion email
     */
    async sendWatermarkEmail({ to, userName, videoName, method, keys, sequence, uniqueKey, watermarkPath, key, recordId }) {
        if (!this.initialized) {
            return {
                success: false,
                error: 'Email service not configured'
            };
        }

        try {
            let htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">MGhosting Video Watermark</h1>
                    </div>
                    
                    <div style="padding: 30px; background: #f7f7f7;">
                        <h2 style="color: #333;">✅ Watermark İşlemi Tamamlandı</h2>
                        
                        <p style="color: #666; font-size: 16px;">
                            Video dosyanıza başarıyla filigran eklendi.
                        </p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #667eea; margin-top: 0;">📹 Video Bilgileri</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px; color: #666;"><strong>Video Adı:</strong></td>
                                    <td style="padding: 8px; color: #333;">${videoName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; color: #666;"><strong>Yöntem:</strong></td>
                                    <td style="padding: 8px; color: #333;">${method === 'key-based' ? 'Anahtar Tabanlı' : 'Görsel Tabanlı'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; color: #666;"><strong>İşlem Zamanı:</strong></td>
                                    <td style="padding: 8px; color: #333;">${new Date().toLocaleString('tr-TR')}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; color: #666;"><strong>Kayıt ID:</strong></td>
                                    <td style="padding: 8px; color: #333; font-family: monospace;">${recordId}</td>
                                </tr>
                            </table>
                        </div>
            `;

            if (method === 'key-based') {
                htmlContent += `
                        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                            <h3 style="color: #856404; margin-top: 0;">🔑 Watermark Anahtarları</h3>
                            <p style="color: #856404; margin: 5px 0;"><strong>Anahtarlar:</strong> ${keys.join(', ')}</p>
                            <p style="color: #856404; margin: 5px 0;"><strong>Sekans:</strong> ${sequence}</p>
                            <p style="color: #dc3545; font-size: 14px; margin-top: 15px;">
                                ⚠️ <strong>ÖNEMLİ:</strong> Bu anahtarları güvenli bir yerde saklayın! 
                                Filigranı çıkarmak için bu anahtarlara ihtiyacınız olacak.
                            </p>
                        </div>
                `;
            } else if (method === 'image-based') {
                htmlContent += `
                        <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0c5460;">
                            <h3 style="color: #0c5460; margin-top: 0;">🖼️ Watermark Bilgileri</h3>
                            <p style="color: #0c5460; margin: 5px 0;"><strong>Watermark:</strong> ${path.basename(watermarkPath)}</p>
                            <p style="color: #0c5460; margin: 5px 0;"><strong>Anahtar:</strong> ${key}</p>
                        </div>
                `;
            }

            htmlContent += `
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #667eea; margin-top: 0;">💡 Öneriler</h3>
                            <ul style="color: #666; line-height: 1.8;">
                                <li>Anahtarlarınızı güvenli bir yerde saklayın</li>
                                <li>Uygulama içinden kayıtlarınızı JSON olarak dışa aktarabilirsiniz</li>
                                <li>Orijinal video ve anahtarlar olmadan filigran çıkarılamaz</li>
                                <li>Anahtarları kaybetmemek için yedek alın</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center; padding: 20px; color: #999; font-size: 14px;">
                            <p>Bu email MGhosting Video Watermark uygulaması tarafından otomatik olarak gönderilmiştir.</p>
                            <p style="margin-top: 10px;">
                                <a href="https://mghosting.com" style="color: #667eea; text-decoration: none;">www.mghosting.com</a>
                            </p>
                        </div>
                    </div>
                </div>
            `;

            const mailOptions = {
                from: `"MGhosting Video Watermark" <${process.env.SMTP_USER}>`,
                to: to,
                subject: `✅ Video Watermark İşlemi Tamamlandı - ${videoName}`,
                html: htmlContent
            };

            const info = await this.transporter.sendMail(mailOptions);

            return {
                success: true,
                messageId: info.messageId,
                message: 'Email başarıyla gönderildi'
            };

        } catch (error) {
            console.error('Email send error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Test email configuration
     */
    async testEmailConfig(to) {
        if (!this.initialized) {
            return {
                success: false,
                error: 'Email service not configured'
            };
        }

        try {
            const mailOptions = {
                from: `"MGhosting Video Watermark" <${process.env.SMTP_USER}>`,
                to: to,
                subject: 'Test Email - MGhosting Video Watermark',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2>✅ Email Yapılandırması Başarılı</h2>
                        <p>MGhosting Video Watermark uygulamanız email göndermeye hazır.</p>
                        <p style="color: #666;">Test zamanı: ${new Date().toLocaleString('tr-TR')}</p>
                    </div>
                `
            };

            const info = await this.transporter.sendMail(mailOptions);

            return {
                success: true,
                messageId: info.messageId,
                message: 'Test emaili başarıyla gönderildi'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check if email service is ready
     */
    isReady() {
        return this.initialized;
    }
    
    /**
     * Get current SMTP settings (without password)
     */
    getSMTPSettings() {
        const settings = appSettings.get('smtp');
        return {
            host: settings.host,
            port: settings.port,
            secure: settings.secure,
            user: settings.user,
            hasPassword: !!settings.pass
        };
    }
    
    /**
     * Update SMTP settings
     */
    updateSMTPSettings(newSettings) {
        try {
            const currentSettings = appSettings.get('smtp');
            
            // Merge with existing settings
            const updatedSettings = {
                ...currentSettings,
                ...newSettings
            };
            
            appSettings.set('smtp', updatedSettings);
            
            // Reinitialize transporter
            this.initializeTransporter();
            
            return {
                success: true,
                message: 'SMTP settings updated successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send test email
     */
    async sendTestEmail(to) {
        if (!this.initialized) {
            return {
                success: false,
                error: 'Email service not configured. Please configure SMTP settings first.'
            };
        }

        try {
            const smtpSettings = appSettings.get('smtp');
            
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">MGhosting Video Watermark</h1>
                    </div>
                    
                    <div style="padding: 30px; background: #f7f7f7;">
                        <h2 style="color: #333;">✅ Test Email Başarılı</h2>
                        
                        <p style="color: #666; font-size: 16px;">
                            SMTP ayarlarınız doğru yapılandırılmış ve çalışıyor.
                        </p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #667eea; margin-top: 0;">📧 SMTP Bilgileri</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px; color: #666;"><strong>Host:</strong></td>
                                    <td style="padding: 8px; color: #333;">${smtpSettings.host}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; color: #666;"><strong>Port:</strong></td>
                                    <td style="padding: 8px; color: #333;">${smtpSettings.port}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; color: #666;"><strong>Secure:</strong></td>
                                    <td style="padding: 8px; color: #333;">${smtpSettings.secure ? 'Yes (SSL/TLS)' : 'No (STARTTLS)'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; color: #666;"><strong>User:</strong></td>
                                    <td style="padding: 8px; color: #333;">${smtpSettings.user}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196f3;">
                            <p style="margin: 0; color: #1976d2;">
                                <strong>✨ Harika!</strong> Artık video filigran işlemleriniz tamamlandığında otomatik email bildirimi alacaksınız.
                            </p>
                        </div>
                    </div>
                    
                    <div style="background: #333; padding: 20px; text-align: center;">
                        <p style="color: #999; margin: 0; font-size: 12px;">
                            MGhosting Video Watermark • ${new Date().toLocaleString('tr-TR')}
                        </p>
                    </div>
                </div>
            `;

            const mailOptions = {
                from: `"MGhosting Video Watermark" <${smtpSettings.user}>`,
                to: to,
                subject: '✅ Test Email - MGhosting Video Watermark',
                html: htmlContent
            };

            await this.transporter.sendMail(mailOptions);

            return {
                success: true,
                message: `Test email sent successfully to ${to}`
            };
        } catch (error) {
            console.error('Test email error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new EmailService();
