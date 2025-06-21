# Putnam County Sheriff Campaign Website

A modern, responsive campaign website for the Putnam County Sheriff election, built with HTML5, CSS3, and vanilla JavaScript.

## 🚀 Features

- **Modern Design**: Clean, professional design with Putnam County Sheriff branding
- **Fully Responsive**: Optimized for desktop, tablet, and mobile devices
- **Interactive Elements**: Smooth scrolling, animations, and form handling
- **Accessibility**: WCAG compliant with proper semantic HTML
- **Performance**: Optimized images, lazy loading, and efficient code
- **SEO Optimized**: Proper meta tags, structured data, and semantic markup

## 🎨 Design Specifications

### Color Palette
- **Sheriff Red**: #B22222 (Primary accent color)
- **Navy Charcoal**: #1A243B (Primary text and navigation)
- **White**: #FFFFFF (Background and contrast)

### Typography
- **Headings**: Merriweather Serif
- **Body Text**: Open Sans Sans Serif

## 📁 Project Structure

```
sheriff/
├── index.html              # Main HTML file
├── assets/
│   ├── css/
│   │   └── style.css       # Main stylesheet
│   ├── js/
│   │   └── main.js         # JavaScript functionality
│   └── images/
│       ├── logo.svg        # Campaign logo
│       ├── logo.png        # Logo PNG version
│       ├── hero-bg.jpg     # Hero background image
│       ├── candidate-portrait.jpg
│       ├── putnam-badge.png
│       └── gallery/        # Campaign event photos
├── components/             # Reusable components
├── pages/                  # Additional pages
├── package.json           # Project configuration
└── README.md              # This file
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v12 or higher)
- npm or yarn
- Web server (nginx, Apache, or development server)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/putnam-county-sheriff/campaign-website.git
   cd campaign-website
   ```

2. **Install dependencies** (if any)
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   # or
   python3 -m http.server 8000
   ```

4. **Open in browser**
   Navigate to `http://localhost:8000`

## 🌐 Deployment

### Development Server
```bash
npm run dev
```

### Production Deployment

#### Option 1: Static Hosting (Recommended)
- Upload files to your web server
- Configure nginx/Apache to serve static files
- Set up SSL certificate for HTTPS

#### Option 2: CDN/Cloud Hosting
- Deploy to services like Netlify, Vercel, or AWS S3
- Configure custom domain and SSL

### Nginx Configuration Example
```nginx
server {
    listen 80;
    server_name putnamcountysheriff.com www.putnamcountysheriff.com;
    root /var/www/html/sheriff;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable gzip compression
    gzip on;
    gzip_types text/css application/javascript text/html;

    # Cache static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 📱 Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🔧 Customization

### Updating Content
1. Edit `index.html` for main content
2. Modify `assets/css/style.css` for styling
3. Update `assets/js/main.js` for functionality

### Adding New Sections
1. Add HTML structure to `index.html`
2. Style new section in `style.css`
3. Add any JavaScript functionality to `main.js`

### Image Optimization
- Use WebP format when possible
- Optimize images for web (compress, resize)
- Implement lazy loading for gallery images

## 📊 Performance Optimization

- **Images**: Optimized and compressed
- **CSS**: Minified for production
- **JavaScript**: Minified for production
- **Caching**: Proper cache headers
- **CDN**: Use CDN for external resources

## 🔒 Security Considerations

- **HTTPS**: Always use HTTPS in production
- **Form Validation**: Client and server-side validation
- **XSS Protection**: Sanitize user inputs
- **CSP Headers**: Content Security Policy

## 📈 Analytics & Tracking

### Google Analytics
Add your Google Analytics tracking code to the `<head>` section of `index.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Facebook Pixel
Add Facebook Pixel for campaign tracking:

```html
<!-- Facebook Pixel -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'YOUR_PIXEL_ID');
  fbq('track', 'PageView');
</script>
```

## 📞 Support & Contact

For technical support or questions about the website:
- **Email**: tech@putnamcountysheriff.com
- **Phone**: (845) 555-0123

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📋 TODO

- [ ] Add real campaign photos
- [ ] Integrate with payment processor (Stripe)
- [ ] Add email newsletter signup (Mailchimp)
- [ ] Implement blog/news section
- [ ] Add social media integration
- [ ] Create admin panel for content management
- [ ] Add multi-language support
- [ ] Implement A/B testing
- [ ] Add performance monitoring
- [ ] Create backup and recovery procedures

---

**Built with ❤️ for Putnam County** 