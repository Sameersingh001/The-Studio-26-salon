// Mobile Menu Toggle
const mobileToggle = document.getElementById('mobile-toggle');
const navLinks = document.querySelector('.nav-links');
const mobileToggleIcon = mobileToggle.querySelector('i');

mobileToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    if (navLinks.classList.contains('active')) {
        mobileToggleIcon.classList.remove('fa-bars');
        mobileToggleIcon.classList.add('fa-xmark');
    } else {
        mobileToggleIcon.classList.remove('fa-xmark');
        mobileToggleIcon.classList.add('fa-bars');
    }
});

// Close mobile menu when a link is clicked
const navItems = document.querySelectorAll('.nav-links a');
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navLinks.classList.remove('active');
        mobileToggleIcon.classList.remove('fa-xmark');
        mobileToggleIcon.classList.add('fa-bars');
    });
});

// Header scroll effect
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Active Link Highlight on Scroll
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    
    sections.forEach(current => {
        const sectionHeight = current.offsetHeight;
        const sectionTop = current.offsetTop - 100; // Offset for header
        const sectionId = current.getAttribute('id');
        
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            document.querySelector(`.nav-links a[href*=${sectionId}]`)?.classList.add('active');
        } else {
            document.querySelector(`.nav-links a[href*=${sectionId}]`)?.classList.remove('active');
        }
    });
});

// Scroll Reveal Animations using Intersection Observer
const animationElements = document.querySelectorAll('.animate-fade-up');

const observerOptions = {
    root: null,
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.05 // Trigger when just 5% of element is visible (fixes tall elements on mobile)
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            // Optional: stop observing once animated to keep it visible
            // observer.unobserve(entry.target); 
        }
    });
}, observerOptions);

animationElements.forEach(element => {
    observer.observe(element);
});

// Auto-scroll logic for continuous running reels
const reelsTracks = document.querySelectorAll('.reels-track');
reelsTracks.forEach(track => {
    let scrollSpeed = 0.5; // Slower speed so users can click
    let scrollPos = 0;

    // Duplicate content for seamless infinite scrolling
    const content = track.innerHTML;
    track.innerHTML = content + content; // Duplicate once

    function autoScrollReels() {
        scrollPos += scrollSpeed;
        
        // If scrolled past the first set of items, reset to 0 seamlessly
        if (scrollPos >= track.scrollWidth / 2) {
            scrollPos = 0;
        }
        
        track.scrollLeft = scrollPos;
        requestAnimationFrame(autoScrollReels);
    }

    // Start auto-scroll after a short delay to let embeds load
    setTimeout(() => {
        requestAnimationFrame(autoScrollReels);
    }, 3000);
});
