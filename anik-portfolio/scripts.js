// ============================================
// QA Engineering Portfolio - Interactive Script
// ============================================

// Supabase public configuration for client-side inserts.
// Replace these with your actual Supabase Project URL and anon key.
const SUPABASE_URL = 'https://obwmduughgithagpelst.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9id21kdXVnaGdpdGhhZ3BlbHN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NjcxMDgsImV4cCI6MjA5MTU0MzEwOH0.yLJwo_hJKAeYrLEqfl9r8kYioVkwhForhsufyCXyHac';
const CONTACT_TABLE = 'contact_submissions';
const MIN_MESSAGE_LENGTH = 10;

function isSupabaseConfigured() {
    return (
        SUPABASE_URL &&
        SUPABASE_ANON_KEY &&
        !SUPABASE_URL.includes('YOUR-PROJECT-ID') &&
        !SUPABASE_ANON_KEY.includes('YOUR-SUPABASE-ANON-KEY')
    );
}

function setFormStatus(type, message) {
    const statusEl = document.getElementById('formStatus');
    if (!statusEl) return;

    statusEl.className = 'form-status';
    if (type) {
        statusEl.classList.add(type);
    }
    statusEl.textContent = message || '';
}

function getFriendlySupabaseError(error) {
    const code = error && error.code ? String(error.code) : '';
    const message = error && error.message ? String(error.message) : '';
    const errorName = error && error.name ? String(error.name) : '';

    if (code === '42501' || message.toLowerCase().includes('row-level security')) {
        return 'Submission blocked by Supabase RLS policy. Allow INSERT for anon/public on contact_submissions.';
    }

    if (code === '23514' || message.toLowerCase().includes('check constraint')) {
        return `Message must be at least ${MIN_MESSAGE_LENGTH} characters.`;
    }

    if (code === '401' || message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('invalid api key')) {
        return 'Supabase auth failed. Verify SUPABASE_URL and SUPABASE_ANON_KEY in scripts.js.';
    }

    if (
        errorName === 'TypeError' ||
        message.toLowerCase().includes('failed to fetch') ||
        message.toLowerCase().includes('network') ||
        message.toLowerCase().includes('load failed')
    ) {
        return `Network request failed: ${message || 'unknown browser fetch error'}`;
    }

    if (code || message) {
        return `Submit failed${code ? ` (${code})` : ''}: ${message || 'unknown error'}`;
    }

    return 'Unable to submit right now. Please try again in a moment. Open browser console for more details.';
}

async function insertContactSubmission(payload) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${CONTACT_TABLE}`, {
        method: 'POST',
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation'
        },
        body: JSON.stringify([payload])
    });

    if (!response.ok) {
        let errorData = null;
        let errorText = '';

        try {
            errorData = await response.json();
        } catch {
            errorData = null;
        }

        if (!errorData) {
            try {
                errorText = await response.text();
            } catch {
                errorText = '';
            }
        }

        const error = new Error(
            errorData && errorData.message
                ? errorData.message
                : errorText || `Supabase request failed with status ${response.status}`
        );
        error.code = errorData && errorData.code ? errorData.code : String(response.status);
        throw error;
    }

    return response.json();
}

/**
 * Smooth scroll to a specific section
 * @param {string} sectionId - The ID of the section to scroll to
 */
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const header = document.querySelector('.header');
        const headerHeight = header ? header.offsetHeight : 0;
        const sectionTop = section.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
            top: sectionTop - headerHeight - 8,
            behavior: 'smooth'
        });
    }
}

/**
 * Initialize all event listeners and interactivity on page load
 */
document.addEventListener('DOMContentLoaded', function() {
    initHamburgerMenu();
    initNavigationSmoothing();
    initContactForm();
    initScrollAnimations();
    initActiveNavHighlight();
});

/**
 * Setup hamburger menu toggle functionality
 */
function initHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navLinks = document.getElementById('navLinks');

    if (!hamburgerBtn || !navLinks) return;

    // Toggle menu when hamburger button is clicked
    hamburgerBtn.addEventListener('click', function() {
        navLinks.classList.toggle('active');
        hamburgerBtn.classList.toggle('active');
        hamburgerBtn.setAttribute('aria-expanded', navLinks.classList.contains('active').toString());
    });

    // Close menu when a nav link is clicked
    navLinks.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            navLinks.classList.remove('active');
            hamburgerBtn.classList.remove('active');
            hamburgerBtn.setAttribute('aria-expanded', 'false');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        const isClickInsideNav = hamburgerBtn.contains(event.target) || navLinks.contains(event.target);
        if (!isClickInsideNav && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
            hamburgerBtn.classList.remove('active');
            hamburgerBtn.setAttribute('aria-expanded', 'false');
        }
    });
}

/**
 * Setup smooth scrolling for navigation links
 */
function initNavigationSmoothing() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (!href || !href.startsWith('#')) {
                return;
            }

            e.preventDefault();
            const targetId = href.substring(1);
            scrollToSection(targetId);
            
            // Close mobile menu if open
            const navLinksMenu = document.getElementById('navLinks');
            const hamburgerBtn = document.getElementById('hamburgerBtn');
            if (navLinksMenu && hamburgerBtn) {
                navLinksMenu.classList.remove('active');
                hamburgerBtn.classList.remove('active');
                hamburgerBtn.setAttribute('aria-expanded', 'false');
            }
        });
    });
}

/**
 * Setup contact form submission handler
 */
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        if (!isSupabaseConfigured()) {
            setFormStatus('error', 'Form is not connected yet. Add Supabase URL and anon key in scripts.js.');
        }
        contactForm.addEventListener('submit', handleFormSubmit);
    }
}

/**
 * Handle contact form submission
 * @param {Event} e - The form submit event
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const form = e.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Get form values
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const message = document.getElementById('message').value.trim();
    
    // Simple validation
    if (!name || !email || !subject || !message) {
        setFormStatus('error', 'Please fill in all fields.');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        setFormStatus('error', 'Please enter a valid email address.');
        return;
    }

    if (message.length < MIN_MESSAGE_LENGTH) {
        setFormStatus('error', `Message must be at least ${MIN_MESSAGE_LENGTH} characters.`);
        return;
    }

    if (!isSupabaseConfigured()) {
        setFormStatus('error', 'Supabase is not configured. Add your project URL and anon key in scripts.js.');
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    setFormStatus('loading', 'Submitting your message...');

    try {
        const payload = {
            full_name: name,
            email: email,
            subject: subject,
            message: message,
            source: 'portfolio_contact_form',
            page_url: window.location.href,
            user_agent: navigator.userAgent
        };

        await insertContactSubmission(payload);

        setFormStatus('success', 'Thank you. Your message was submitted successfully.');
        form.reset();
    } catch (error) {
        console.error('Supabase insert error:', error);
        setFormStatus('error', getFriendlySupabaseError(error));
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Send Message';
    }
}

/**
 * Initialize scroll-triggered animations for elements
 */
function initScrollAnimations() {
    // Observer for cards and content elements
    const cardObserverOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const cardObserver = new IntersectionObserver(function(entries) {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Staggered animation delay
                const delay = index * 100;
                entry.target.style.transitionDelay = delay + 'ms';
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                cardObserver.unobserve(entry.target);
            }
        });
    }, cardObserverOptions);

    // Apply animations to skill cards, project cards, and experience cards
    const skillCards = document.querySelectorAll('.skill-card');
    const projectCards = document.querySelectorAll('.project-card');
    const experienceCards = document.querySelectorAll('.experience-card');
    const contactItems = document.querySelectorAll('.contact-item');
    const workflowSteps = document.querySelectorAll('.workflow-step');
    const philosophyPoints = document.querySelectorAll('.philosophy-point');
    const techGroups = document.querySelectorAll('.tech-group');
    const whyHirePoints = document.querySelectorAll('.why-hire-point');
    
    const allCards = [...skillCards, ...projectCards, ...experienceCards, ...contactItems, ...workflowSteps, ...philosophyPoints, ...techGroups, ...whyHirePoints];
    allCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        cardObserver.observe(card);
    });

    // Observer for section headings
    const sectionObserverOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const sectionObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                sectionObserver.unobserve(entry.target);
            }
        });
    }, sectionObserverOptions);

    const sectionTitles = document.querySelectorAll('.section-title');
    sectionTitles.forEach(title => {
        title.style.opacity = '0';
        title.style.transform = 'translateY(20px)';
        title.style.transition = 'opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1), transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)';
        sectionObserver.observe(title);
    });
}

/**
 * Highlight the active navigation link based on scroll position
 */
function initActiveNavHighlight() {
    window.addEventListener('scroll', updateActiveNavLink);
}

/**
 * Update the active navigation link based on current scroll position
 */
function updateActiveNavLink() {
    let currentSection = '';
    const sections = document.querySelectorAll('section');
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        // Check if section is in viewport
        if (window.scrollY >= sectionTop - 300) {
            currentSection = section.getAttribute('id');
        }
    });

    // Update active state on all nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || !href.startsWith('#')) {
            link.classList.remove('active');
            return;
        }

        const linkTarget = href.substring(1);
        
        if (linkTarget === currentSection) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// ============================================
// End of Script
// ============================================
