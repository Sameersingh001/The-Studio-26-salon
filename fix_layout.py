import re

with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Let's remove the previous tweak_css blocks that broke the layout
# We will use regex to find and replace everything after /* USER REQUESTED MOBILE TWEAKS */

pattern = re.compile(r'/\* =========================================\s*USER REQUESTED MOBILE TWEAKS\s*========================================= \*/.*', re.DOTALL)

clean_css = pattern.sub('', css)

# Now we append a single, clean, proper mobile fix block
proper_mobile_fixes = '''
/* =========================================
   PROPER MOBILE FIXES 
   ========================================= */

@media (max-width: 768px) {
    .nav-links a {
        font-size: 14px !important;
        padding: 12px 20px !important;
    }
}

@media (max-width: 576px) {
    /* Hero Section Fixes */
    .hero {
        height: 80vh !important;
        min-height: 550px !important;
        padding-top: 100px !important;
    }
    
    .hero-content {
        text-align: center !important; /* Revert back to center, left looks broken with divider */
        align-items: center !important;
    }
    
    .hero-divider {
        justify-content: center !important;
    }
    
    .hero-title {
        font-size: 32px !important;
        line-height: 1.2 !important;
    }
    
    .hero-subtitle {
        font-size: 12px !important;
    }
    
    /* Fix the features size (target correct class .feature) */
    .hero-features {
        gap: 15px !important;
        flex-wrap: wrap !important;
        justify-content: center !important;
        margin-top: 25px !important;
    }
    
    .hero-features .feature {
        font-size: 11px !important;
        gap: 5px !important;
        letter-spacing: 0.5px !important;
        flex-direction: column;
        text-align: center;
        flex: 1 1 40%; /* 2 items per row */
    }
    
    .hero-features .feature i {
        font-size: 20px !important; /* Smaller icon */
        margin-bottom: 5px;
    }
    
    /* Make buttons proper */
    .hero-cta {
        display: flex;
        flex-direction: column;
        gap: 15px;
        width: 100%;
        margin-top: 30px !important;
    }
    
    .hero-cta .btn {
        width: 100%;
        text-align: center;
    }

    /* Paragraphs justified */
    .about-desc, .story-content p, .about-lead {
        text-align: justify !important;
    }
    
    /* About Images */
    .gallery-item img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
    }
}
'''

with open('style.css', 'w', encoding='utf-8') as f:
    f.write(clean_css + '\n' + proper_mobile_fixes)

print("Proper mobile layout applied.")
