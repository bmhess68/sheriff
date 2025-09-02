require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// Gmail SMTP Email Service
const emailService = require('./email-service');

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

// Email sending function using Gmail SMTP
async function sendEmail(to, subject, html, replyTo = null) {
    return await emailService.sendEmail(to, subject, html, replyTo);
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
    await emailService.sendCampaignNotification('volunteer', {
        id: submission.id,
        name: name,
        email: email,
        zip: zip,
        phone: phone,
        interests: submission.interests,
        ip: submission.ip
    });
    
    // Send confirmation email to volunteer
    await emailService.sendConfirmationEmail('volunteer', {
        name: name,
        email: email,
        interests: submission.interests
    });
    
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
    await emailService.sendCampaignNotification('contact', {
        id: submission.id,
        name: name,
        email: email,
        subject: subject,
        message: message,
        ip: submission.ip
    });
    
    // Send auto-reply to sender
    await emailService.sendConfirmationEmail('contact', {
        name: name,
        email: email,
        message: message
    });
    
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
        email: emailService.getStatus(),
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
    console.log('📧 Email Service:', emailService.isReady() ? 'Gmail SMTP CONFIGURED ✅' : 'Not configured ⚠️');
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
