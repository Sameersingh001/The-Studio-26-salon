with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()

tweak_css = '''
/* Hero Section Mobile Adjustments (Height & Features) */
@media (max-width: 576px) {
    .hero {
        height: 55vh !important; /* Almost half screen */
        min-height: 480px !important; /* Ensure it doesn't get too small */
    }
    
    .hero-features {
        gap: 10px !important;
        flex-wrap: wrap !important;
        justify-content: flex-start !important;
    }
    
    .hero-feature {
        font-size: 11px !important;
        letter-spacing: 0.5px !important;
        gap: 6px !important;
        margin-bottom: 5px !important;
    }
    
    .hero-feature i {
        font-size: 13px !important;
    }
}
'''

with open('style.css', 'a', encoding='utf-8') as f:
    f.write('\n' + tweak_css)

print("Hero section mobile tweaks added.")
