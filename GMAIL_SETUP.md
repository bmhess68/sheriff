# Gmail SMTP Setup Guide for Hess for Sheriff Campaign

This guide will help you configure your Google Workspace account to send emails from your campaign website.

## Prerequisites

- Google Workspace account with admin access
- Access to your `info@hessforsheriff.com` email account
- Two-factor authentication (2FA) enabled (recommended)

## Step 1: Enable 2-Factor Authentication (if not already enabled)

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google," click on "2-Step Verification"
3. Follow the prompts to enable 2FA

## Step 2: Generate an App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "Signing in to Google," click on "App passwords"
3. You may need to sign in again
4. At the bottom, click "Select app" and choose "Mail"
5. Click "Select device" and choose "Other (Custom name)"
6. Type "Sheriff Campaign Website" as the custom name
7. Click "Generate"
8. **Copy the 16-character password** (you'll need this for the configuration)

## Step 3: Configure Your Environment Variables

1. Copy the example configuration file:
   ```bash
   cp config.env.example config.env
   ```

2. Edit the `config.env` file with your settings:
   ```env
   # Gmail SMTP Configuration (Google Workspace)
   GMAIL_USER=info@hessforsheriff.com
   GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
   
   # Email Configuration
   CAMPAIGN_EMAIL=info@hessforsheriff.com
   
   # Other settings...
   PORT=3000
   NODE_ENV=development
   ```

3. Replace `abcd efgh ijkl mnop` with the 16-character App Password you generated

## Step 4: Install Dependencies

Run the following command to install the required email dependencies:

```bash
npm install
```

This will install `nodemailer` which replaces SendGrid for email sending.

## Step 5: Start the Server

```bash
npm start
```

You should see:
```
🚀 Sheriff Campaign Server running on port 3000
📧 Email Service: Gmail SMTP Configured ✅
```

## Step 6: Test Email Functionality

1. Visit your website at `http://localhost:3000`
2. Fill out the volunteer form or contact form
3. Check that emails are received at `info@hessforsheriff.com`
4. Verify that confirmation emails are sent to form submitters

## Troubleshooting

### Common Issues

1. **"Authentication failed" error**
   - Double-check your Gmail username and App Password
   - Make sure 2FA is enabled
   - Regenerate the App Password if needed

2. **"Connection failed" error**
   - Check your internet connection
   - Verify Gmail SMTP settings
   - Try port 465 with SSL if 587 doesn't work

3. **Emails not being received**
   - Check spam/junk folders
   - Verify the recipient email address
   - Check Gmail's sent folder

### Gmail Sending Limits

- **Daily limit**: 2,000 emails per day
- **Per minute limit**: 100 emails per minute
- **Bounce limit**: Keep bounce rate under 5%

These limits should be more than sufficient for a campaign website.

## Security Notes

- Never commit your `config.env` file to version control
- Keep your App Password secure and don't share it
- Regularly rotate your App Password (every 6 months)
- Monitor your email sending for any unusual activity

## Benefits Over SendGrid

✅ **Cost Savings**: No additional monthly fees  
✅ **Better Deliverability**: Emails come from your own domain  
✅ **Simplified Setup**: No need for external API keys  
✅ **Integrated Management**: Everything in your Google Workspace  
✅ **Higher Trust**: Recipients trust emails from known domains  

## Production Deployment

For production deployment (DigitalOcean App Platform, etc.), make sure to:

1. Set environment variables in your hosting platform
2. Never include `config.env` in your deployed code
3. Use secure environment variable management
4. Monitor email delivery rates

## Support

If you encounter issues:
1. Check the server logs for error messages
2. Verify your Google Workspace settings
3. Test with a simple email client first
4. Contact your hosting provider if deployment issues persist

---

**Note**: This setup replaces SendGrid completely. The old SendGrid configuration is no longer needed.
