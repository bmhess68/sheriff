// Main JavaScript for Putnam County Sheriff Campaign Website

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Navigation Toggle
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close mobile menu when clicking on a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offsetTop = target.offsetTop - 80; // Account for fixed navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Navbar background change on scroll
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            navbar.style.backgroundColor = 'rgba(26, 36, 59, 0.98)';
        } else {
            navbar.style.backgroundColor = 'rgba(26, 36, 59, 0.95)';
        }
    });
    
    // Scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    document.querySelectorAll('.issue-card, .endorsement-card, .gallery-item, .media-item').forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });
    
    // Volunteer Form Handling
    const volunteerForm = document.getElementById('volunteer-form');
    if (volunteerForm) {
        volunteerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            // Basic validation
            if (!data.name || !data.email || !data.zip) {
                showMessage('Please fill in all required fields.', 'error');
                return;
            }
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                showMessage('Please enter a valid email address.', 'error');
                return;
            }
            
            // ZIP code validation
            const zipRegex = /^\d{5}(-\d{4})?$/;
            if (!zipRegex.test(data.zip)) {
                showMessage('Please enter a valid ZIP code.', 'error');
                return;
            }
            
            // Show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Signing Up...';
            submitBtn.disabled = true;
            
            // Simulate form submission (replace with actual API call)
            setTimeout(() => {
                showMessage('Thank you for signing up! We\'ll be in touch soon.', 'success');
                this.reset();
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }, 2000);
        });
    }
    
    // Contact Form Handling
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            // Basic validation
            if (!data.name || !data.email || !data.message) {
                showMessage('Please fill in all required fields.', 'error');
                return;
            }
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                showMessage('Please enter a valid email address.', 'error');
                return;
            }
            
            // Show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            
            // Simulate form submission (replace with actual API call)
            setTimeout(() => {
                showMessage('Thank you for your message! We\'ll get back to you soon.', 'success');
                this.reset();
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }, 2000);
        });
    }
    
    // Donation Button Handling
    document.querySelectorAll('.donation-card button').forEach(button => {
        button.addEventListener('click', function() {
            const amount = this.getAttribute('data-amount');
            handleDonation(amount);
        });
    });
    
    // Custom donation amount
    const customDonateBtn = document.getElementById('custom-donate');
    const customAmountInput = document.getElementById('custom-amount');
    
    if (customDonateBtn && customAmountInput) {
        customDonateBtn.addEventListener('click', function() {
            const amount = customAmountInput.value;
            if (amount && amount > 0) {
                handleDonation(amount);
            } else {
                showMessage('Please enter a valid donation amount.', 'error');
            }
        });
    }
    
    // Gallery Lightbox (basic implementation)
    document.querySelectorAll('.gallery-item img').forEach(img => {
        img.addEventListener('click', function() {
            openLightbox(this.src, this.alt);
        });
    });
    
    // Auto-scroll endorsements (optional)
    let endorsementIndex = 0;
    const endorsementCards = document.querySelectorAll('.endorsement-card');
    
    if (endorsementCards.length > 0) {
        setInterval(() => {
            endorsementCards[endorsementIndex].style.opacity = '0.7';
            endorsementIndex = (endorsementIndex + 1) % endorsementCards.length;
            endorsementCards[endorsementIndex].style.opacity = '1';
        }, 5000);
    }
    
    // Utility Functions
    function showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        // Insert message at the top of the form
        const form = document.querySelector('form');
        if (form) {
            form.insertBefore(messageDiv, form.firstChild);
        }
        
        // Auto-remove message after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
    
    function handleDonation(amount) {
        // Show donation modal or redirect to payment processor
        const isRecurring = document.getElementById('recurring')?.checked || false;
        
        // For now, show a message (replace with actual payment integration)
        const message = isRecurring 
            ? `Thank you for your recurring donation of $${amount}! Redirecting to secure payment...`
            : `Thank you for your donation of $${amount}! Redirecting to secure payment...`;
        
        showMessage(message, 'success');
        
        // Simulate redirect to payment processor
        setTimeout(() => {
            alert('This would redirect to Stripe or another payment processor in production.');
        }, 2000);
    }
    
    function openLightbox(src, alt) {
        // Create lightbox overlay
        const overlay = document.createElement('div');
        overlay.className = 'lightbox-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            cursor: pointer;
        `;
        
        // Create image element
        const img = document.createElement('img');
        img.src = src;
        img.alt = alt;
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
            border-radius: 10px;
        `;
        
        overlay.appendChild(img);
        document.body.appendChild(overlay);
        
        // Close lightbox on click
        overlay.addEventListener('click', () => {
            overlay.remove();
        });
        
        // Close lightbox on escape key
        document.addEventListener('keydown', function closeOnEscape(e) {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', closeOnEscape);
            }
        });
    }
    
    // Lazy loading for images
    const images = document.querySelectorAll('img[loading="lazy"]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src || img.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
    
    // Parallax effect for hero section
    const hero = document.querySelector('.hero');
    if (hero) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            hero.style.transform = `translateY(${rate}px)`;
        });
    }
    
    // Active navigation highlighting
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.pageYOffset >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
    
    // Add active class styles to CSS
    const style = document.createElement('style');
    style.textContent = `
        .nav-link.active {
            color: var(--sheriff-red) !important;
        }
        .nav-link.active::after {
            width: 100% !important;
        }
        .lightbox-overlay img {
            transition: transform 0.3s ease;
        }
        .lightbox-overlay img:hover {
            transform: scale(1.05);
        }
    `;
    document.head.appendChild(style);
    
    // Initialize tooltips for donation cards
    document.querySelectorAll('.donation-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Form field focus effects
    document.querySelectorAll('.form-group input, .form-group textarea').forEach(field => {
        field.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        field.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.classList.remove('focused');
            }
        });
    });
    
    // Add focused class styles
    const focusedStyle = document.createElement('style');
    focusedStyle.textContent = `
        .form-group.focused label {
            color: var(--sheriff-red);
        }
        .form-group.focused input,
        .form-group.focused textarea {
            border-color: var(--sheriff-red);
            box-shadow: 0 0 0 3px rgba(178, 34, 34, 0.1);
        }
    `;
    document.head.appendChild(focusedStyle);
    
    console.log('Putnam County Sheriff Campaign Website initialized successfully!');
}); 