#!/bin/bash

# Sheriff Campaign Website - Git Setup Script
echo "🗳️ Setting up Sheriff Campaign Website Git Repository"

# Initialize git repository if not already done
if [ ! -d ".git" ]; then
    echo "📁 Initializing git repository..."
    git init
else
    echo "📁 Git repository already exists"
fi

# Configure git user (update these with your details)
echo "👤 Configuring git user..."
git config user.name "Hess for Sheriff Campaign"
git config user.email "info@hessforsheriff.com"

# Add all files to staging
echo "📝 Adding files to git..."
git add .

# Create initial commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit: Sheriff campaign website with enhanced features

Features included:
- Responsive campaign website
- SendGrid email integration  
- Visitor analytics and tracking
- Form submission storage
- Admin dashboard
- DigitalOcean App Platform ready
- Security enhancements
- SEO optimizations
- Accessibility improvements"

# Create and switch to election branch
echo "🗳️ Creating election branch..."
git checkout -b election

# Show status
echo "✅ Git setup complete!"
echo ""
echo "Current branch: $(git branch --show-current)"
echo "Files tracked: $(git ls-files | wc -l)"
echo ""
echo "📋 Next steps:"
echo "1. Push to GitHub: git remote add origin <your-repo-url>"
echo "2. Push election branch: git push -u origin election"
echo "3. Deploy to DigitalOcean App Platform"
echo ""
echo "🎉 Your enhanced sheriff campaign website is ready!"
