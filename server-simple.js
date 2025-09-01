const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Initialize Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Serve static files with Stripe key injection for index.html
app.use(express.static('.'));

// Inject Stripe publishable key into index.html
app.get('/', (req, res) => {
    const fs = require('fs');
    let html = fs.readFileSync('./index.html', 'utf8');
    
    // Inject Stripe publishable key
    const stripeKey = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder';
    html = html.replace('</head>', `    <script>window.STRIPE_PUBLISHABLE_KEY = '${stripeKey}';</script>\n</head>`);
    
    res.send(html);
});

// Simple in-memory storage (for demo - in production use a database)
let submissions = [];
let analytics = {
    visitors: 0,
    pageViews: 0,
    submissions: 0,
    dailyStats: {}
};

// Simple rate limiting
const rateLimitStore = new Map();
function simpleRateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    if (!rateLimitStore.has(ip)) {
        rateLimitStore.set(ip, []);
    }
    
    const requests = rateLimitStore.get(ip).filter(time => time > windowStart);
    
    if (requests.length >= 10) { // Max 10 requests per minute
        return res.status(429).json({ error: 'Too many requests' });
    }
    
    requests.push(now);
    rateLimitStore.set(ip, requests);
    next();
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

// Volunteer form submission
app.post('/api/forms/volunteer', simpleRateLimit, (req, res) => {
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
    
    // Save to file for persistence
    saveData();
    
    // Send email notification (simplified)
    console.log('📧 New volunteer sign-up:', {
        name: submission.name,
        email: submission.email,
        interests: submission.interests
    });
    
    res.json({ 
        success: true, 
        message: 'Thank you for signing up! We will be in touch soon.',
        id: submission.id 
    });
});

// Contact form submission
app.post('/api/forms/contact', simpleRateLimit, (req, res) => {
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
    
    // Save to file for persistence
    saveData();
    
    // Send email notification (simplified)
    console.log('📧 New contact message:', {
        name: submission.name,
        email: submission.email,
        subject: submission.subject,
        message: submission.message.substring(0, 100) + '...'
    });
    
    res.json({ 
        success: true, 
        message: 'Thank you for your message! We will get back to you soon.',
        id: submission.id 
    });
});

// Stripe payment intent creation
app.post('/api/create-payment-intent', simpleRateLimit, async (req, res) => {
    try {
        const { amount, currency } = req.body;

        // Validate amount
        if (!amount || amount < 100) { // Minimum $1
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // FEC contribution limit check ($2,800 per election)
        if (amount > 280000) { // $2,800 in cents
            return res.status(400).json({ error: 'Amount exceeds legal contribution limit of $2,800' });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: currency || 'usd',
            metadata: {
                campaign: 'Brian Hess for Putnam County Sheriff',
                timestamp: new Date().toISOString()
            }
        });

        // Log donation attempt
        console.log('💰 Payment intent created:', {
            amount: amount / 100,
            currency: currency || 'usd',
            id: paymentIntent.id
        });

        res.send({
            clientSecret: paymentIntent.client_secret
        });
    } catch (error) {
        console.error('Stripe error:', error);
        res.status(400).send({
            error: error.message
        });
    }
});

// Stripe webhook to handle successful payments
app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.log(`Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('💳 Payment succeeded:', {
                id: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency
            });

            // Store donation record
            const donation = {
                id: submissions.length + 1,
                type: 'donation',
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                payment_intent_id: paymentIntent.id,
                status: 'completed',
                submitted_at: new Date().toISOString(),
                metadata: paymentIntent.metadata
            };

            submissions.push(donation);
            saveData();
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({received: true});
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

// Get recent form submissions
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
        submissions: submissions.length,
        analytics: analytics
    });
});

// Save data to file for persistence
function saveData() {
    const data = {
        submissions: submissions,
        analytics: analytics,
        lastSaved: new Date().toISOString()
    };
    
    fs.writeFileSync('campaign_data.json', JSON.stringify(data, null, 2));
}

// Load data from file on startup
function loadData() {
    try {
        if (fs.existsSync('campaign_data.json')) {
            const data = JSON.parse(fs.readFileSync('campaign_data.json', 'utf8'));
            submissions = data.submissions || [];
            analytics = data.analytics || { visitors: 0, pageViews: 0, submissions: 0, dailyStats: {} };
            console.log(`📁 Loaded ${submissions.length} submissions from storage`);
        }
    } catch (error) {
        console.error('Error loading data:', error.message);
    }
}

// Initialize data
loadData();

// Start server
app.listen(PORT, () => {
    console.log('🚀 Sheriff Campaign Server running on port', PORT);
    console.log('📊 Submissions loaded:', submissions.length);
    console.log('🌐 Website: http://localhost:' + PORT);
    console.log('📈 Admin Dashboard: http://localhost:' + PORT + '/admin');
    console.log('💾 Data saved to: campaign_data.json');
});

// Save data periodically
setInterval(saveData, 60000); // Save every minute

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n💾 Saving data before shutdown...');
    saveData();
    console.log('👋 Server stopped gracefully');
    process.exit(0);
});
