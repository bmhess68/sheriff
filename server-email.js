require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// Try to load SendGrid, fall back gracefully if not available
let sgMail = null;
try {
    sgMail = require('@sendgrid/mail');
    if (process.env.SENDGRID_API_KEY) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        console.log('✅ SendGrid configured successfully');
    }
} catch (error) {
    console.log('📧 SendGrid not installed, emails will be logged to console');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));

// Storage
let submissions = [];
let analytics = {
    visitors: 0,
    pageViews: 0,
    submissions: 0,
    dailyStats: {}
};

// Rate limiting
const rateLimitStore = new Map();
function simpleRateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - 60000;
    
    if (!rateLimitStore.has(ip)) {
        rateLimitStore.set(ip, []);
    }
    
    const requests = rateLimitStore.get(ip).filter(time => time > windowStart);
    
    if (requests.length >= 10) {
        return res.status(429).json({ error: 'Too many requests' });
    }
    
    requests.push(now);
    rateLimitStore.set(ip, requests);
    next();
}

// Email sending function
async function sendEmail(to, subject, html, replyTo = null) {
    if (!sgMail || !process.env.SENDGRID_API_KEY) {
        console.log('📧 EMAIL (would be sent):', { to, subject, preview: html.substring(0, 100) + '...' });
        return { success: true, method: 'console' };
    }
    
    try {
        const msg = {
            to: to,
            from: process.env.FROM_EMAIL || process.env.CAMPAIGN_EMAIL || 'noreply@hessforsheriff.com',
            subject: subject,
            html: html
        };
        
        if (replyTo) {
            msg.replyTo = replyTo;
        }
        
        await sgMail.send(msg);
        console.log('✅ Email sent successfully to:', to);
        return { success: true, method: 'sendgrid' };
    } catch (error) {
        console.error('❌ Email error:', error.message);
        return { success: false, error: error.message };
    }
}

// Analytics tracking
app.post('/api/analytics/track', simpleRateLimit, (req, res) => {
    analytics.pageViews++;
    const today = new Date().toISOString().split('T')[0];
    
    if (!analytics.dailyStats[today]) {
        analytics.dailyStats[today] = { visitors: 0, views: 0 };
    }
    analytics.dailyStats[today].views++;
    
    res.json({ success: true });
});

// Volunteer form submission with email
app.post('/api/forms/volunteer', simpleRateLimit, async (req, res) => {
    const { name, email, zip, interests, phone } = req.body;
    
    // Basic validation
    if (!name || !email || !zip) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const submission = {
        id: submissions.length + 1,
        type: 'volunteer',
        name: name,
        email: email,
        zip: zip,
        interests: Array.isArray(interests) ? interests.join(', ') : interests || '',
        phone: phone || '',
        submitted_at: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress
    };
    
    submissions.push(submission);
    analytics.submissions++;
    saveData();
    
    // Send notification email to campaign
    const campaignNotification = `
        <h2>🎉 New Volunteer Sign-up!</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>ZIP Code:</strong> ${zip}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p><strong>Volunteer Interests:</strong> ${submission.interests || 'None specified'}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p style="color: #666; font-size: 12px;">Submission ID: ${submission.id}</p>
    `;
    
    await sendEmail(
        process.env.CAMPAIGN_EMAIL || 'info@hessforsheriff.com',
        '🎉 New Volunteer Sign-up - Hess for Sheriff',
        campaignNotification
    );
    
    // Send confirmation email to volunteer
    const volunteerConfirmation = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1A243B; color: white; padding: 20px; text-align: center;">
                <h1>Thank You for Volunteering!</h1>
                <p style="margin: 0;">Hess for Sheriff Campaign</p>
            </div>
            <div style="padding: 30px 20px;">
                <p>Dear ${name},</p>
                <p>Thank you for signing up to volunteer for Brian Hess's campaign for Putnam County Sheriff! Your support means everything to us.</p>
                <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #B22222; margin: 20px 0;">
                    <p><strong>Your volunteer interests:</strong> ${submission.interests || 'We\'ll match you with opportunities'}</p>
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
    
    await sendEmail(
        email,
        'Welcome to Team Hess! - Volunteer Confirmation',
        volunteerConfirmation
    );
    
    res.json({ 
        success: true, 
        message: 'Thank you for signing up! Check your email for confirmation.',
        id: submission.id 
    });
});

// Contact form submission with email
app.post('/api/forms/contact', simpleRateLimit, async (req, res) => {
    const { name, email, subject, message } = req.body;
    
    // Basic validation
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const submission = {
        id: submissions.length + 1,
        type: 'contact',
        name: name,
        email: email,
        subject: subject || '',
        message: message,
        submitted_at: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress
    };
    
    submissions.push(submission);
    analytics.submissions++;
    saveData();
    
    // Send notification to campaign
    const campaignNotification = `
        <h2>📧 New Contact Message</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
            <p><strong>Subject:</strong> ${subject || 'No subject'}</p>
            <div style="background: white; padding: 15px; border-left: 4px solid #B22222; margin: 15px 0;">
                <p><strong>Message:</strong></p>
                <p style="white-space: pre-wrap;">${message}</p>
            </div>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p style="color: #666; font-size: 12px;">
            Reply directly to this email to respond to ${name}<br>
            Submission ID: ${submission.id}
        </p>
    `;
    
    await sendEmail(
        process.env.CAMPAIGN_EMAIL || 'info@hessforsheriff.com',
        `📧 Contact: ${subject || 'New Message'} - Hess for Sheriff`,
        campaignNotification,
        email // Set reply-to
    );
    
    // Send auto-reply to sender
    const autoReply = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1A243B; color: white; padding: 20px; text-align: center;">
                <h1>Message Received</h1>
                <p style="margin: 0;">Hess for Sheriff Campaign</p>
            </div>
            <div style="padding: 30px 20px;">
                <p>Dear ${name},</p>
                <p>Thank you for contacting the Hess for Sheriff campaign. We have received your message and will respond within 24-48 hours.</p>
                <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #B22222; margin: 20px 0;">
                    <p><strong>Your message:</strong></p>
                    <p style="font-style: italic;">"${message.substring(0, 200)}${message.length > 200 ? '...' : ''}"</p>
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
    
    await sendEmail(
        email,
        'Thank you for contacting Hess for Sheriff',
        autoReply
    );
    
    res.json({ 
        success: true, 
        message: 'Thank you for your message! Check your email for confirmation.',
        id: submission.id 
    });
});

// Get analytics stats
app.get('/api/analytics/stats', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const todayStats = analytics.dailyStats[today] || { visitors: 0, views: 0 };
    
    res.json({
        today: {
            unique_visitors: todayStats.visitors,
            total_page_views: todayStats.views,
            form_submissions: submissions.filter(s => s.submitted_at.startsWith(today)).length
        },
        total: {
            total_visitors: analytics.visitors,
            total_views: analytics.pageViews,
            total_submissions: analytics.submissions
        }
    });
});

// Get recent submissions
app.get('/api/forms/recent', (req, res) => {
    const recent = submissions
        .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
        .slice(0, 20);
    res.json(recent);
});

// Admin dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        sendgrid: !!sgMail && !!process.env.SENDGRID_API_KEY,
        submissions: submissions.length,
        analytics: analytics
    });
});

// Data persistence (App Platform compatible)
function saveData() {
    const data = {
        submissions: submissions,
        analytics: analytics,
        lastSaved: new Date().toISOString()
    };
    
    // Create data directory if it doesn't exist
    const dataDir = process.env.NODE_ENV === 'production' ? '/app/data' : '.';
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const filePath = path.join(dataDir, 'campaign_data.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadData() {
    try {
        const dataDir = process.env.NODE_ENV === 'production' ? '/app/data' : '.';
        const filePath = path.join(dataDir, 'campaign_data.json');
        
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            submissions = data.submissions || [];
            analytics = data.analytics || { visitors: 0, pageViews: 0, submissions: 0, dailyStats: {} };
            console.log(`📁 Loaded ${submissions.length} submissions from storage`);
        } else {
            console.log('📁 No existing data found, starting fresh');
        }
    } catch (error) {
        console.error('Error loading data:', error.message);
    }
}

// Initialize
loadData();

// Start server
app.listen(PORT, () => {
    console.log('🚀 Sheriff Campaign Server running on port', PORT);
    console.log('📧 SendGrid:', sgMail && process.env.SENDGRID_API_KEY ? 'CONFIGURED ✅' : 'Not configured ⚠️');
    console.log('📊 Submissions loaded:', submissions.length);
    console.log('🌐 Website: http://localhost:' + PORT);
    console.log('📈 Admin Dashboard: http://localhost:' + PORT + '/admin');
    console.log('💾 Data saved to: campaign_data.json');
});

// Auto-save and cleanup
setInterval(saveData, 60000);

process.on('SIGINT', () => {
    console.log('\n💾 Saving data before shutdown...');
    saveData();
    console.log('👋 Server stopped gracefully');
    process.exit(0);
});
