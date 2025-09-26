// Content script that runs on coupon pages
(function() {
    'use strict';
    
    // Add a floating action button for quick access
    function createFloatingButton() {
        // Check if button already exists
        if (document.getElementById('coupon-clipper-fab')) return;
        
        const fab = document.createElement('div');
        fab.id = 'coupon-clipper-fab';
        fab.innerHTML = '✂️';
        fab.title = 'Clip All Coupons';
        
        // Style the floating action button
        Object.assign(fab.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            backgroundColor: '#667eea',
            color: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            cursor: 'pointer',
            zIndex: '10000',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease',
            fontFamily: 'Arial, sans-serif'
        });
        
        // Hover effects
        fab.addEventListener('mouseenter', () => {
            fab.style.transform = 'scale(1.1)';
            fab.style.backgroundColor = '#5a67d8';
        });
        
        fab.addEventListener('mouseleave', () => {
            fab.style.transform = 'scale(1)';
            fab.style.backgroundColor = '#667eea';
        });
        
        // Click handler
        fab.addEventListener('click', () => {
            clipAllCouponsFromContent();
        });
        
        document.body.appendChild(fab);
    }
    
    function clipAllCouponsFromContent() {
        const clipButtons = document.querySelectorAll('button[data-testid^="CouponActionButton-"]');
        
        if (clipButtons.length === 0) {
            showNotification('No coupon buttons found on this page', 'warning');
            return;
        }
        
        showNotification(`Found ${clipButtons.length} coupons. Clipping...`, 'info');
        
        let clippedCount = 0;
        let alreadyClippedCount = 0;
        
        clipButtons.forEach((button, index) => {
            const buttonText = button.textContent.trim().toLowerCase();
            
            // Only click buttons that say exactly "clip" (nothing else)
            if (buttonText !== 'clip') {
                // Count non-clip buttons as already processed  
                if (buttonText.includes('clipped') || buttonText.includes('added') || buttonText.includes('unclip')) {
                    alreadyClippedCount++;
                }
                return;
            }
            
            setTimeout(() => {
                try {
                    button.click();
                    clippedCount++;
                    
                    // Show final notification after all buttons are processed
                    if (index === clipButtons.length - 1) {
                        setTimeout(() => {
                            showNotification(
                                `Complete! Clipped ${clippedCount} new coupons. ${alreadyClippedCount} were already clipped.`,
                                'success'
                            );
                        }, 1000);
                    }
                } catch (error) {
                    console.log(`Error clicking button ${index + 1}:`, error);
                }
            }, index * 300);
        });
    }
    
    function showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.getElementById('coupon-clipper-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.id = 'coupon-clipper-notification';
        notification.textContent = message;
        
        const colors = {
            info: '#2196F3',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#F44336'
        };
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: colors[type] || colors.info,
            color: 'white',
            padding: '15px 20px',
            borderRadius: '8px',
            zIndex: '10001',
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            maxWidth: '300px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: 'slideIn 0.3s ease'
        });
        
        // Add slide-in animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, 4000);
    }
    
    // Initialize when page loads
    function init() {
        // Check if we're on a coupon page
        const url = window.location.href;
        if (url.includes('coupon') || document.querySelector('button[data-testid^="CouponActionButton-"]')) {
            setTimeout(createFloatingButton, 1000); // Delay to ensure page is loaded
        }
    }
    
    // Run on page load and navigation changes (for SPAs)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Re-run when URL changes (for single-page applications)
    let currentUrl = window.location.href;
    const observer = new MutationObserver(() => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            setTimeout(init, 1000);
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
})();