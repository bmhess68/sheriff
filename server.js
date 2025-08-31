const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const sgMail = require('@sendgrid/mail');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"]
        }
    }
}));

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

const formLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // limit each IP to 5 form submissions per minute
    message: 'Too many form submissions, please try again later.'
});

app.use(limiter);

// Serve static files
app.use(express.static('.', {
    dotfiles: 'deny',
    index: 'index.html'
}));

// SendGrid configuration
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Database setup
const dbPath = path.join(__dirname, 'campaign_data.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
    // Form submissions table
    db.run(`CREATE TABLE IF NOT EXISTS form_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        zip_code TEXT,
        subject TEXT,
        message TEXT,
        interests TEXT,
        phone TEXT,
        ip_address TEXT,
        user_agent TEXT,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Website analytics table
    db.run(`CREATE TABLE IF NOT EXISTS website_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT,
        user_agent TEXT,
        page_url TEXT,
        referrer TEXT,
        session_id TEXT,
        visit_date DATE,
        visit_time DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Daily stats table
    db.run(`CREATE TABLE IF NOT EXISTS daily_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE UNIQUE,
        unique_visitors INTEGER DEFAULT 0,
        total_page_views INTEGER DEFAULT 0,
        form_submissions INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Admin users table
    db.run(`CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
    )`);
});

// Utility functions
function getClientIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
}

function generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Validation middleware
const validateVolunteerForm = [
    body('name').trim().isLength({ min: 2, max: 100 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('zip').matches(/^\d{5}(-\d{4})?$/),
    body('interests').optional().isArray()
];

const validateContactForm = [
    body('name').trim().isLength({ min: 2, max: 100 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('subject').optional().trim().isLength({ max: 200 }).escape(),
    body('message').trim().isLength({ min: 10, max: 5000 }).escape()
];

// Analytics tracking endpoint
app.post('/api/analytics/track', (req, res) => {
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const { page_url, referrer, session_id } = req.body;
    const today = moment().format('YYYY-MM-DD');

    // Track page view
    db.run(
        `INSERT INTO website_analytics (ip_address, user_agent, page_url, referrer, session_id, visit_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ip, userAgent, page_url, referrer, session_id, today],
        function(err) {
            if (err) {
                console.error('Analytics tracking error:', err);
                return res.status(500).json({ error: 'Failed to track visit' });
            }

            // Update daily stats
            db.run(
                `INSERT OR IGNORE INTO daily_stats (date) VALUES (?)`,
                [today]
            );

            db.run(
                `UPDATE daily_stats SET 
                 total_page_views = total_page_views + 1
                 WHERE date = ?`,
                [today]
            );

            // Count unique visitors for today
            db.get(
                `SELECT COUNT(DISTINCT ip_address) as unique_count
                 FROM website_analytics 
                 WHERE visit_date = ?`,
                [today],
                (err, row) => {
                    if (!err && row) {
                        db.run(
                            `UPDATE daily_stats SET unique_visitors = ? WHERE date = ?`,
                            [row.unique_count, today]
                        );
                    }
                }
            );

            res.json({ success: true });
        }
    );
});

// Volunteer form submission
app.post('/api/forms/volunteer', formLimiter, validateVolunteerForm, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, zip, interests, phone } = req.body;
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const interestsStr = Array.isArray(interests) ? interests.join(', ') : '';

    // Store in database
    db.run(
        `INSERT INTO form_submissions (type, name, email, zip_code, interests, phone, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['volunteer', name, email, zip, interestsStr, phone, ip, userAgent],
        function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to save submission' });
            }

            // Update daily stats
            const today = moment().format('YYYY-MM-DD');
            db.run(
                `UPDATE daily_stats SET form_submissions = form_submissions + 1 WHERE date = ?`,
                [today]
            );

            // Send email via SendGrid
            if (process.env.SENDGRID_API_KEY && process.env.CAMPAIGN_EMAIL) {
                const msg = {
                    to: process.env.CAMPAIGN_EMAIL,
                    from: process.env.FROM_EMAIL || process.env.CAMPAIGN_EMAIL,
                    subject: 'New Volunteer Sign-up - Hess for Sheriff Campaign',
                    html: `
                        <h2>New Volunteer Sign-up</h2>
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>ZIP Code:</strong> ${zip}</p>
                        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                        <p><strong>Interests:</strong> ${interestsStr || 'None specified'}</p>
                        <p><strong>Submitted:</strong> ${moment().format('MMMM Do YYYY, h:mm:ss a')}</p>
                        <hr>
                        <p><small>IP: ${ip}</small></p>
                    `
                };

                sgMail.send(msg).catch(err => {
                    console.error('SendGrid error:', err);
                });

                // Send confirmation email to volunteer
                const confirmationMsg = {
                    to: email,
                    from: process.env.FROM_EMAIL || process.env.CAMPAIGN_EMAIL,
                    subject: 'Thank you for volunteering - Hess for Sheriff',
                    html: `
                        <h2>Thank You for Volunteering!</h2>
                        <p>Dear ${name},</p>
                        <p>Thank you for signing up to volunteer for Brian Hess's campaign for Putnam County Sheriff. Your support means everything to us!</p>
                        <p>We will be in touch soon with volunteer opportunities that match your interests.</p>
                        <p>Together, we can build a safer Putnam County.</p>
                        <br>
                        <p>Best regards,<br>
                        The Hess for Sheriff Campaign Team</p>
                        <hr>
                        <p><small>This email was sent because you signed up to volunteer at our campaign website.</small></p>
                    `
                };

                sgMail.send(confirmationMsg).catch(err => {
                    console.error('SendGrid confirmation error:', err);
                });
            }

            res.json({ 
                success: true, 
                message: 'Thank you for signing up! We will be in touch soon.',
                id: this.lastID 
            });
        }
    );
});

// Contact form submission
app.post('/api/forms/contact', formLimiter, validateContactForm, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, subject, message } = req.body;
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';

    // Store in database
    db.run(
        `INSERT INTO form_submissions (type, name, email, subject, message, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['contact', name, email, subject, message, ip, userAgent],
        function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to save submission' });
            }

            // Update daily stats
            const today = moment().format('YYYY-MM-DD');
            db.run(
                `UPDATE daily_stats SET form_submissions = form_submissions + 1 WHERE date = ?`,
                [today]
            );

            // Send email via SendGrid
            if (process.env.SENDGRID_API_KEY && process.env.CAMPAIGN_EMAIL) {
                const msg = {
                    to: process.env.CAMPAIGN_EMAIL,
                    from: process.env.FROM_EMAIL || process.env.CAMPAIGN_EMAIL,
                    subject: `Campaign Contact: ${subject || 'No Subject'}`,
                    html: `
                        <h2>New Contact Form Submission</h2>
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Subject:</strong> ${subject || 'No subject provided'}</p>
                        <p><strong>Message:</strong></p>
                        <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #B22222;">
                            ${message.replace(/\n/g, '<br>')}
                        </div>
                        <p><strong>Submitted:</strong> ${moment().format('MMMM Do YYYY, h:mm:ss a')}</p>
                        <hr>
                        <p><small>IP: ${ip}</small></p>
                    `,
                    replyTo: email
                };

                sgMail.send(msg).catch(err => {
                    console.error('SendGrid error:', err);
                });

                // Send auto-reply
                const autoReply = {
                    to: email,
                    from: process.env.FROM_EMAIL || process.env.CAMPAIGN_EMAIL,
                    subject: 'Thank you for contacting Hess for Sheriff',
                    html: `
                        <h2>Thank You for Your Message</h2>
                        <p>Dear ${name},</p>
                        <p>Thank you for contacting the Hess for Sheriff campaign. We have received your message and will respond within 24-48 hours.</p>
                        <p>Your voice matters in this campaign, and we appreciate you taking the time to reach out.</p>
                        <br>
                        <p>Best regards,<br>
                        The Hess for Sheriff Campaign Team</p>
                        <hr>
                        <p><small>This is an automated response. Please do not reply to this email.</small></p>
                    `
                };

                sgMail.send(autoReply).catch(err => {
                    console.error('SendGrid auto-reply error:', err);
                });
            }

            res.json({ 
                success: true, 
                message: 'Thank you for your message! We will get back to you soon.',
                id: this.lastID 
            });
        }
    );
});

// Analytics endpoints
app.get('/api/analytics/stats', (req, res) => {
    const today = moment().format('YYYY-MM-DD');
    const weekAgo = moment().subtract(7, 'days').format('YYYY-MM-DD');
    const monthAgo = moment().subtract(30, 'days').format('YYYY-MM-DD');

    // Get comprehensive stats
    const queries = [
        // Today's stats
        new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM daily_stats WHERE date = ?`,
                [today],
                (err, row) => {
                    if (err) reject(err);
                    else resolve({ today: row || { unique_visitors: 0, total_page_views: 0, form_submissions: 0 } });
                }
            );
        }),
        // Weekly stats
        new Promise((resolve, reject) => {
            db.get(
                `SELECT 
                    SUM(unique_visitors) as weekly_visitors,
                    SUM(total_page_views) as weekly_views,
                    SUM(form_submissions) as weekly_submissions
                 FROM daily_stats WHERE date >= ?`,
                [weekAgo],
                (err, row) => {
                    if (err) reject(err);
                    else resolve({ weekly: row || { weekly_visitors: 0, weekly_views: 0, weekly_submissions: 0 } });
                }
            );
        }),
        // Monthly stats
        new Promise((resolve, reject) => {
            db.get(
                `SELECT 
                    SUM(unique_visitors) as monthly_visitors,
                    SUM(total_page_views) as monthly_views,
                    SUM(form_submissions) as monthly_submissions
                 FROM daily_stats WHERE date >= ?`,
                [monthAgo],
                (err, row) => {
                    if (err) reject(err);
                    else resolve({ monthly: row || { monthly_visitors: 0, monthly_views: 0, monthly_submissions: 0 } });
                }
            );
        }),
        // Total stats
        new Promise((resolve, reject) => {
            db.get(
                `SELECT 
                    SUM(unique_visitors) as total_visitors,
                    SUM(total_page_views) as total_views,
                    SUM(form_submissions) as total_submissions
                 FROM daily_stats`,
                (err, row) => {
                    if (err) reject(err);
                    else resolve({ total: row || { total_visitors: 0, total_views: 0, total_submissions: 0 } });
                }
            );
        })
    ];

    Promise.all(queries)
        .then(results => {
            const stats = Object.assign({}, ...results);
            res.json(stats);
        })
        .catch(err => {
            console.error('Stats query error:', err);
            res.status(500).json({ error: 'Failed to fetch statistics' });
        });
});

// Get daily stats for charts
app.get('/api/analytics/daily', (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const startDate = moment().subtract(days, 'days').format('YYYY-MM-DD');

    db.all(
        `SELECT date, unique_visitors, total_page_views, form_submissions 
         FROM daily_stats 
         WHERE date >= ? 
         ORDER BY date ASC`,
        [startDate],
        (err, rows) => {
            if (err) {
                console.error('Daily stats error:', err);
                return res.status(500).json({ error: 'Failed to fetch daily statistics' });
            }
            res.json(rows);
        }
    );
});

// Admin dashboard (basic)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        sendgrid: !!process.env.SENDGRID_API_KEY,
        database: 'connected'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Sheriff Campaign Server running on port ${PORT}`);
    console.log(`📧 SendGrid: ${process.env.SENDGRID_API_KEY ? 'Configured' : 'Not configured'}`);
    console.log(`📊 Database: ${dbPath}`);
    console.log(`🌐 Admin Dashboard: http://localhost:${PORT}/admin`);
});
