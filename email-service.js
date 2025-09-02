// Gmail SMTP Email Service for Sheriff Campaign
require('dotenv').config();
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.isConfigured = false;
        this.initializeTransporter();
    }

    initializeTransporter() {
        try {
            // Check if Gmail credentials are provided
            if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
                console.log('📧 Gmail SMTP: Not configured (missing credentials)');
                return;
            }

            // Create Gmail SMTP transporter
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                host: 'smtp.gmail.com',
                port: 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.GMAIL_USER, // Your Gmail address
                    pass: process.env.GMAIL_APP_PASSWORD // Your Gmail App Password
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            // Verify connection
            this.transporter.verify((error, success) => {
                if (error) {
                    console.log('❌ Gmail SMTP Error:', error.message);
                    this.isConfigured = false;
                } else {
                    console.log('✅ Gmail SMTP configured successfully');
                    this.isConfigured = true;
                }
            });

        } catch (error) {
            console.error('❌ Email service initialization error:', error.message);
            this.isConfigured = false;
        }
    }

    async sendEmail(to, subject, html, replyTo = null) {
        if (!this.transporter || !this.isConfigured) {
            console.log('📧 EMAIL (would be sent):', { 
                to, 
                subject, 
                preview: html.substring(0, 100) + '...' 
            });
            return { success: true, method: 'console' };
        }

        try {
            const mailOptions = {
                from: {
                    name: 'Hess for Sheriff Campaign',
                    address: process.env.GMAIL_USER
                },
                to: to,
                subject: subject,
                html: html
            };

            // Add reply-to if provided
            if (replyTo) {
                mailOptions.replyTo = replyTo;
            }

            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Email sent successfully to:', to);
            console.log('📧 Message ID:', info.messageId);
            
            return { 
                success: true, 
                method: 'gmail-smtp',
                messageId: info.messageId 
            };

        } catch (error) {
            console.error('❌ Gmail SMTP Error:', error.message);
            
            // Log specific error details for troubleshooting
            if (error.code === 'EAUTH') {
                console.error('Authentication failed. Check your Gmail credentials and App Password.');
            } else if (error.code === 'ECONNECTION') {
                console.error('Connection failed. Check your internet connection and Gmail SMTP settings.');
            }
            
            return { 
                success: false, 
                error: error.message,
                code: error.code 
            };
        }
    }

    // Helper method to send campaign notifications
    async sendCampaignNotification(type, data) {
        const campaignEmail = process.env.CAMPAIGN_EMAIL || 'info@hessforsheriff.com';
        
        if (type === 'volunteer') {
            const subject = '🎉 New Volunteer Sign-up - Hess for Sheriff';
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #1A243B; color: white; padding: 20px; text-align: center;">
                        <h1>🎉 New Volunteer Sign-up!</h1>
                        <p style="margin: 0;">Hess for Sheriff Campaign</p>
                    </div>
                    <div style="padding: 30px 20px;">
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Name:</strong> ${data.name}</p>
                            <p><strong>Email:</strong> ${data.email}</p>
                            <p><strong>ZIP Code:</strong> ${data.zip}</p>
                            <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
                            <p><strong>Volunteer Interests:</strong> ${data.interests || 'None specified'}</p>
                            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
                        </div>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                        <p style="color: #666; font-size: 12px;">
                            Submission ID: ${data.id}<br>
                            IP Address: ${data.ip || 'Unknown'}
                        </p>
                    </div>
                </div>
            `;
            
            return await this.sendEmail(campaignEmail, subject, html);
            
        } else if (type === 'contact') {
            const subject = `📧 Contact: ${data.subject || 'New Message'} - Hess for Sheriff`;
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #1A243B; color: white; padding: 20px; text-align: center;">
                        <h1>📧 New Contact Message</h1>
                        <p style="margin: 0;">Hess for Sheriff Campaign</p>
                    </div>
                    <div style="padding: 30px 20px;">
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>From:</strong> ${data.name} &lt;${data.email}&gt;</p>
                            <p><strong>Subject:</strong> ${data.subject || 'No subject'}</p>
                            <div style="background: white; padding: 15px; border-left: 4px solid #B22222; margin: 15px 0;">
                                <p><strong>Message:</strong></p>
                                <p style="white-space: pre-wrap;">${data.message}</p>
                            </div>
                            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
                        </div>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                        <p style="color: #666; font-size: 12px;">
                            Reply directly to this email to respond to ${data.name}<br>
                            Submission ID: ${data.id}<br>
                            IP Address: ${data.ip || 'Unknown'}
                        </p>
                    </div>
                </div>
            `;
            
            return await this.sendEmail(campaignEmail, subject, html, data.email);
        }
    }

    // Helper method to send confirmation emails
    async sendConfirmationEmail(type, data) {
        if (type === 'volunteer') {
            const subject = 'Welcome to Team Hess! - Volunteer Confirmation';
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #1A243B; color: white; padding: 20px; text-align: center;">
                        <h1>Thank You for Volunteering!</h1>
                        <p style="margin: 0;">Hess for Sheriff Campaign</p>
                    </div>
                    <div style="padding: 30px 20px;">
                        <p>Dear ${data.name},</p>
                        <p>Thank you for signing up to volunteer for Brian Hess's campaign for Putnam County Sheriff! Your support means everything to us.</p>
                        <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #B22222; margin: 20px 0;">
                            <p><strong>Your volunteer interests:</strong> ${data.interests || 'We\'ll match you with opportunities'}</p>
                        </div>
                        <p>We will be in touch soon with volunteer opportunities that match your interests and availability.</p>
                        <p>Together, we can build a safer, stronger Putnam County!</p>
                        <br>
                        <p>Best regards,<br>
                        <strong>The Hess for Sheriff Campaign Team</strong></p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                        <p style="font-size: 12px; color: #666;">
                            This email was sent because you signed up to volunteer at our campaign website.<br>
                            Questions? Reply to this email or contact us at ${process.env.CAMPAIGN_EMAIL || 'info@hessforsheriff.com'}
                        </p>
                    </div>
                </div>
            `;
            
            return await this.sendEmail(data.email, subject, html);
            
        } else if (type === 'contact') {
            const subject = 'Thank you for contacting Hess for Sheriff';
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #1A243B; color: white; padding: 20px; text-align: center;">
                        <h1>Message Received</h1>
                        <p style="margin: 0;">Hess for Sheriff Campaign</p>
                    </div>
                    <div style="padding: 30px 20px;">
                        <p>Dear ${data.name},</p>
                        <p>Thank you for contacting the Hess for Sheriff campaign. We have received your message and will respond within 24-48 hours.</p>
                        <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #B22222; margin: 20px 0;">
                            <p><strong>Your message:</strong></p>
                            <p style="font-style: italic;">"${data.message.substring(0, 200)}${data.message.length > 200 ? '...' : ''}"</p>
                        </div>
                        <p>Your voice matters in this campaign, and we appreciate you taking the time to reach out.</p>
                        <br>
                        <p>Best regards,<br>
                        <strong>The Hess for Sheriff Campaign Team</strong></p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                        <p style="font-size: 12px; color: #666;">
                            This is an automated response. For urgent matters, please call our campaign office.
                        </p>
                    </div>
                </div>
            `;
            
            return await this.sendEmail(data.email, subject, html);
        }
    }

    // Check if email service is properly configured
    isReady() {
        return this.isConfigured;
    }

    // Get configuration status
    getStatus() {
        return {
            configured: this.isConfigured,
            service: 'Gmail SMTP',
            user: process.env.GMAIL_USER || 'Not configured'
        };
    }
}

module.exports = new EmailService();
