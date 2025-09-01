// Main JavaScript for Putnam County Sheriff Campaign Website

document.addEventListener('DOMContentLoaded', function() {
    // Initialize analytics tracking
    initializeAnalytics();
    
    // Track page view
    trackPageView();
    // Mobile Navigation Toggle
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            hamburger.setAttribute('aria-expanded', !isExpanded);
        });
        
        // Close mobile menu when clicking on a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
            });
        });
        
        // Close mobile menu on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && navMenu.classList.contains('active')) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
                hamburger.focus();
            }
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
    
    // Navbar background change on scroll (debounced for performance)
    const navbar = document.getElementById('navbar');
    const handleScroll = debounce(function() {
        if (window.scrollY > 100) {
            navbar.style.backgroundColor = 'rgba(26, 36, 59, 0.98)';
        } else {
            navbar.style.backgroundColor = 'rgba(26, 36, 59, 0.95)';
        }
    }, 10);
    
    window.addEventListener('scroll', handleScroll);
    
    // Lazy loading for images
    const lazyImages = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback for browsers without IntersectionObserver
        lazyImages.forEach(img => {
            img.src = img.dataset.src;
            img.classList.remove('lazy');
        });
    }
    
    // Performance optimization: Debounce scroll events
    function debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction() {
            const context = this;
            const args = arguments;
            const later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }
    
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
            
            // Convert interests checkboxes to array
            const interests = Array.from(this.querySelectorAll('input[name="interests"]:checked'))
                .map(cb => cb.value);
            data.interests = interests;
            
            // Submit to backend
            submitFormToBackend(data, 'volunteer');
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
            
            // Submit to backend
            submitFormToBackend(data, 'contact');
        });
    }
    
    // Stripe Integration
    // Note: In production, the publishable key should be injected by the server
    // For now, this is a placeholder that needs to be replaced with the actual key
    const stripe = Stripe(window.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');
    
    // Donation Button Handling
    document.querySelectorAll('.donate-btn').forEach(button => {
        button.addEventListener('click', function() {
            const amount = this.getAttribute('data-amount');
            initiateDonation(amount);
        });
    });
    
    // Custom donation amount
    const customDonateBtn = document.getElementById('custom-donate-btn');
    const customAmountInput = document.getElementById('custom-amount');
    
    if (customDonateBtn && customAmountInput) {
        customDonateBtn.addEventListener('click', function() {
            const amount = customAmountInput.value * 100; // Convert to cents
            if (amount >= 100) { // Minimum $1
                initiateDonation(amount);
            } else {
                showMessage('Please enter a minimum donation of $1.', 'error');
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
    
    async function initiateDonation(amount) {
        try {
            // Show loading state
            const buttons = document.querySelectorAll('.donate-btn, #custom-donate-btn');
            buttons.forEach(btn => {
                btn.disabled = true;
                btn.textContent = 'Processing...';
            });

            const response = await fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: amount,
                    currency: 'usd'
                })
            });

            const { clientSecret } = await response.json();

            const { error } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: {
                        // This will prompt for card details
                    }
                }
            });

            if (error) {
                console.error('Payment failed:', error);
                showMessage('Payment failed. Please try again.', 'error');
            } else {
                showMessage('Thank you for your donation! Your contribution helps build a safer Putnam County.', 'success');
                // Clear custom amount if used
                if (customAmountInput) {
                    customAmountInput.value = '';
                }
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('There was an error processing your donation. Please try again.', 'error');
        } finally {
            // Reset button states
            const buttons = document.querySelectorAll('.donate-btn, #custom-donate-btn');
            buttons.forEach(btn => {
                btn.disabled = false;
                if (btn.classList.contains('donate-btn')) {
                    const amount = btn.getAttribute('data-amount');
                    btn.textContent = `Donate $${amount / 100}`;
                } else {
                    btn.textContent = 'Donate';
                }
            });
        }
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
    
    // Analytics and tracking functions
    function initializeAnalytics() {
        // Generate or retrieve session ID
        let sessionId = sessionStorage.getItem('campaign_session_id');
        if (!sessionId) {
            sessionId = generateSessionId();
            sessionStorage.setItem('campaign_session_id', sessionId);
        }
        window.campaignSessionId = sessionId;
    }
    
    function generateSessionId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    
    function trackPageView() {
        const data = {
            page_url: window.location.href,
            referrer: document.referrer,
            session_id: window.campaignSessionId
        };
        
        fetch('/api/analytics/track', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        }).catch(err => {
            console.log('Analytics tracking unavailable:', err.message);
        });
    }
    
    // Enhanced form submission with backend integration
    function submitFormToBackend(formData, formType) {
        const submitButton = document.querySelector(`#${formType}-form button[type="submit"]`);
        const originalText = submitButton.textContent;
        
        // Show loading state
        submitButton.textContent = formType === 'volunteer' ? 'Signing Up...' : 'Sending...';
        submitButton.disabled = true;
        
        fetch(`/api/forms/${formType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccessMessage(data.message);
                document.getElementById(`${formType}-form`).reset();
            } else if (data.errors) {
                showFormErrors(data.errors, formType);
            } else {
                throw new Error(data.error || 'Submission failed');
            }
        })
        .catch(error => {
            console.error('Form submission error:', error);
            showErrorMessage('There was an error submitting your form. Please try again or contact us directly.');
        })
        .finally(() => {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        });
    }
    
    function showSuccessMessage(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'success-message';
        alertDiv.style.cssText = `
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
            font-weight: 500;
        `;
        alertDiv.textContent = message;
        
        const form = document.querySelector('.form');
        form.parentNode.insertBefore(alertDiv, form);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 10000);
        
        // Scroll to message
        alertDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    function showErrorMessage(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'error-message';
        alertDiv.style.cssText = `
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
            font-weight: 500;
        `;
        alertDiv.textContent = message;
        
        const form = document.querySelector('.form');
        form.parentNode.insertBefore(alertDiv, form);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 10000);
    }
    
    function showFormErrors(errors, formType) {
        errors.forEach(error => {
            const field = document.querySelector(`#${formType}-form [name="${error.param}"]`);
            if (field) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'field-error';
                errorDiv.style.cssText = 'color: #B22222; font-size: 14px; margin-top: 5px;';
                errorDiv.textContent = error.msg;
                field.parentNode.appendChild(errorDiv);
                
                // Remove error on input
                field.addEventListener('input', function() {
                    errorDiv.remove();
                }, { once: true });
            }
        });
    }
    
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