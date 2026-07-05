require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Gmail SMTP Email Service
const emailService = require('./email-service');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 8 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = new Set([
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ]);
        if (allowedTypes.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Essay file must be a PDF, DOC, DOCX, or TXT file.'));
        }
    }
});

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

function cleanText(value) {
    return String(value || '').trim();
}

function parseSignatureData(signatureData) {
    const match = cleanText(signatureData).match(/^data:image\/png;base64,(.+)$/);
    if (!match) return null;
    return Buffer.from(match[1], 'base64');
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

// Scholarship application submission with email
app.post('/api/forms/scholarship', simpleRateLimit, upload.single('essay_file'), async (req, res) => {
    const {
        first_name,
        last_name,
        email,
        phone,
        address_street,
        address_street2,
        address_city,
        address_state,
        address_zip,
        address_country,
        school,
        gpa,
        other_scholarships,
        extracurricular,
        college,
        major,
        accepted,
        community_service,
        signature_data,
        signature_typed,
        certification
    } = req.body;

    const signatureBuffer = parseSignatureData(signature_data);

    if (
        !first_name || !last_name || !email || !phone ||
        !address_street || !address_city || !address_state || !address_zip || !address_country ||
        !school || !gpa || !other_scholarships || !extracurricular ||
        !college || !major || !accepted || !community_service ||
        !req.file || !signatureBuffer || !signature_typed || certification !== 'yes'
    ) {
        return res.status(400).json({ error: 'Please complete all required scholarship fields.' });
    }

    const submission = {
        id: submissions.length + 1,
        type: 'scholarship',
        student_name: `${cleanText(first_name)} ${cleanText(last_name)}`,
        first_name: cleanText(first_name),
        last_name: cleanText(last_name),
        email: cleanText(email),
        phone: cleanText(phone),
        address_street: cleanText(address_street),
        address_street2: cleanText(address_street2),
        address_city: cleanText(address_city),
        address_state: cleanText(address_state),
        address_zip: cleanText(address_zip),
        address_country: cleanText(address_country),
        school: cleanText(school),
        gpa: cleanText(gpa),
        other_scholarships: cleanText(other_scholarships),
        extracurricular: cleanText(extracurricular),
        college: cleanText(college),
        major: cleanText(major),
        accepted: cleanText(accepted),
        community_service: cleanText(community_service),
        essay_file_name: req.file.originalname,
        essay_file_type: req.file.mimetype,
        essay_file_size: req.file.size,
        signature_typed: cleanText(signature_typed),
        certification: cleanText(certification),
        submitted_at: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
        attachments: [
            {
                filename: req.file.originalname,
                content: req.file.buffer,
                contentType: req.file.mimetype
            },
            {
                filename: `${cleanText(first_name)}-${cleanText(last_name)}-signature.png`.replace(/[^a-z0-9_.-]/gi, '-'),
                content: signatureBuffer,
                contentType: 'image/png'
            }
        ]
    };

    const storedSubmission = { ...submission };
    delete storedSubmission.attachments;
    submissions.push(storedSubmission);
    analytics.submissions++;
    saveData();

    await emailService.sendCampaignNotification('scholarship', submission);
    await emailService.sendConfirmationEmail('scholarship', submission);

    res.json({
        success: true,
        message: 'Thank you. Your scholarship submission was received.',
        id: submission.id
    });
});

app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Essay file must be 8 MB or smaller.' : error.message });
    }

    if (error) {
        return res.status(400).json({ error: error.message || 'There was a problem processing the submission.' });
    }

    next();
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
