# Sheriff Campaign Website Setup Guide

## 🚀 Complete Setup with SendGrid, Analytics & Form Storage

This guide will help you set up the enhanced campaign website with email integration, visitor analytics, and local form storage.

## Prerequisites

- Node.js (version 16+)
- SendGrid account and API key
- Basic command line knowledge

## 📦 Installation

1. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

2. **Create environment configuration:**
   ```bash
   cp config.env.example .env
   ```

3. **Configure your environment variables in `.env`:**
   ```env
   # SendGrid Configuration (REQUIRED)
   SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
   
   # Email Configuration
   CAMPAIGN_EMAIL=info@hessforsheriff.com
   FROM_EMAIL=noreply@hessforsheriff.com
   
   # Server Configuration
   PORT=3000
   NODE_ENV=production
   
   # Security
   JWT_SECRET=your_random_jwt_secret_here
   ```

## 🔑 SendGrid Setup

1. **Create SendGrid Account:**
   - Go to [sendgrid.com](https://sendgrid.com)
   - Sign up for a free account (100 emails/day free tier)

2. **Get API Key:**
   - Navigate to Settings → API Keys
   - Create a new API key with "Full Access"
   - Copy the key to your `.env` file

3. **Verify Sender Email:**
   - Go to Settings → Sender Authentication
   - Verify your campaign email address
   - This is required to send emails

## 🚀 Running the Application

### Development Mode
```bash
# Start the backend server
npm run dev

# In another terminal, serve the frontend (optional)
npm run frontend
```

### Production Mode
```bash
npm start
```

## 📊 Analytics & Admin Dashboard

### Accessing the Dashboard
- **URL:** `http://localhost:3000/admin`
- **Features:**
  - Real-time visitor statistics
  - Daily visitor charts
  - Form submission tracking
  - System health monitoring

### Analytics Features
- **Automatic Tracking:** Page views are tracked automatically
- **Session Management:** Unique visitor identification
- **Daily Stats:** Visitor counts, page views, form submissions
- **Data Storage:** SQLite database (`campaign_data.db`)

## 📧 Email Features

### Automated Emails
1. **Volunteer Sign-ups:**
   - Notification to campaign team
   - Confirmation email to volunteer

2. **Contact Form:**
   - Notification to campaign team
   - Auto-reply to sender

### Email Templates
- Professional HTML templates
- Campaign branding
- Responsive design

## 🗄️ Data Storage

### Local Database (SQLite)
- **Location:** `campaign_data.db`
- **Tables:**
  - `form_submissions` - All form data
  - `website_analytics` - Page view tracking
  - `daily_stats` - Aggregated statistics

### Data Backup
```bash
# Backup database
cp campaign_data.db backup_$(date +%Y%m%d).db

# View data
sqlite3 campaign_data.db "SELECT * FROM form_submissions;"
```

## 🔒 Security Features

- **Rate Limiting:** Prevents spam and abuse
- **Input Validation:** Server-side validation
- **CSRF Protection:** Security headers
- **Data Sanitization:** XSS prevention

## 📱 API Endpoints

### Analytics
- `POST /api/analytics/track` - Track page views
- `GET /api/analytics/stats` - Get statistics
- `GET /api/analytics/daily` - Daily chart data

### Forms
- `POST /api/forms/volunteer` - Volunteer sign-up
- `POST /api/forms/contact` - Contact form

### System
- `GET /api/health` - System status
- `GET /admin` - Admin dashboard

## 🛠️ Customization

### Email Templates
Edit the HTML templates in `server.js`:
- Volunteer confirmation email
- Contact auto-reply
- Admin notifications

### Analytics Tracking
Additional tracking can be added in `assets/js/main.js`:
- Button clicks
- Download tracking
- Social media interactions

### Dashboard
Customize `admin.html`:
- Add new charts
- Custom metrics
- Export functionality

## 🌐 Deployment

### Environment Setup
1. **Production Server:**
   ```bash
   npm install --production
   NODE_ENV=production npm start
   ```

2. **Process Manager (PM2):**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "sheriff-campaign"
   pm2 startup
   pm2 save
   ```

3. **Reverse Proxy (Nginx):**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## 📈 Monitoring & Maintenance

### Regular Tasks
- Monitor SendGrid usage and billing
- Backup database regularly
- Review analytics for campaign insights
- Check form submissions daily

### Troubleshooting
1. **Emails not sending:**
   - Check SendGrid API key
   - Verify sender email address
   - Review SendGrid activity log

2. **Analytics not working:**
   - Check browser console for errors
   - Verify API endpoints are accessible
   - Check database permissions

3. **Forms not submitting:**
   - Verify backend server is running
   - Check rate limiting settings
   - Review server logs

## 📞 Support

### Log Files
```bash
# View server logs
pm2 logs sheriff-campaign

# Check system status
curl http://localhost:3000/api/health
```

### Database Queries
```sql
-- View recent form submissions
SELECT * FROM form_submissions ORDER BY submitted_at DESC LIMIT 10;

-- Daily visitor stats
SELECT date, unique_visitors, total_page_views FROM daily_stats ORDER BY date DESC;

-- Email addresses collected
SELECT DISTINCT email FROM form_submissions WHERE email IS NOT NULL;
```

## 🎯 Campaign Analytics Insights

### Key Metrics to Track
- **Daily unique visitors**
- **Volunteer sign-up rate**
- **Geographic distribution (ZIP codes)**
- **Popular volunteer interests**
- **Contact form topics**

### Growth Indicators
- Week-over-week visitor growth
- Form submission conversion rates
- Email engagement (if using SendGrid analytics)
- Peak traffic times and days

---

## ✅ Quick Start Checklist

- [ ] Install Node.js dependencies (`npm install`)
- [ ] Create `.env` file with SendGrid API key
- [ ] Verify SendGrid sender email
- [ ] Start server (`npm start`)
- [ ] Test form submissions
- [ ] Check admin dashboard (`/admin`)
- [ ] Verify emails are being sent
- [ ] Set up database backups

**Your campaign website is now ready with professional email integration and comprehensive analytics!** 🎉
