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
        // Check for Kroger-style buttons first
        let clipButtons = document.querySelectorAll('button[data-testid^="CouponActionButton-"]');
        let isKrogerSite = clipButtons.length > 0;
        let isCvsSite = false;
        let isWalgreensSite = false;
        
        // If no Kroger buttons found, check for CVS buttons
        if (!isKrogerSite) {
            clipButtons = document.querySelectorAll('send-to-card-action button.coupon-action, send-to-card-action button.sc-send-to-card-action');
            isCvsSite = clipButtons.length > 0;
        }
        
        // If no CVS buttons found, check for Walgreens buttons
        if (!isKrogerSite && !isCvsSite) {
            clipButtons = document.querySelectorAll('button[id^="clip"]');
            isWalgreensSite = clipButtons.length > 0;
        }
        
        if (clipButtons.length === 0) {
            showNotification('No coupon buttons found on this page', 'warning');
            return;
        }
        
        let actionText = 'Clipping';
        if (isCvsSite) {
            actionText = 'Sending to card';
        } else if (isWalgreensSite) {
            actionText = 'Clipping';
        }
        showNotification(`Found ${clipButtons.length} coupons. ${actionText}...`, 'info');
        
        let clippedCount = 0;
        let alreadyClippedCount = 0;
        
        clipButtons.forEach((button, index) => {
            const buttonText = button.textContent.trim().toLowerCase();
            
            if (isKrogerSite) {
                // Kroger logic: Only click buttons that say exactly "clip"
                if (buttonText !== 'clip') {
                    if (buttonText.includes('clipped') || buttonText.includes('added') || buttonText.includes('unclip')) {
                        alreadyClippedCount++;
                    }
                    return;
                }
            } else if (isWalgreensSite) {
                // Walgreens logic: Only click buttons that say exactly "clip" (ignore "shop" buttons)
                if (buttonText !== 'clip') {
                    if (buttonText.includes('clipped') || buttonText.includes('added') || buttonText.includes('unclip')) {
                        alreadyClippedCount++;
                    }
                    return;
                }
            } else {
                // CVS logic: Click "send to card" buttons
                if (!buttonText.includes('send to card')) {
                    if (buttonText.includes('sent') || buttonText.includes('added') || buttonText.includes('on card')) {
                        alreadyClippedCount++;
                    }
                    return;
                }
            }
            
            if (isKrogerSite) {
                // Kroger: Use fixed delay
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
            } else if (isWalgreensSite) {
                // Walgreens: Use 500ms delay (2 per second) to respect rate limiting
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
                }, index * 500);
            } else {
                // CVS: Process sequentially with confirmation
                if (index === 0) {
                    // Start the first CVS coupon immediately
                    setTimeout(() => {
                        try {
                            button.click();
                            clippedCount++;
                            // Wait for confirmation and then process next coupon
                            waitForCvsConfirmationAndContinueContent(clipButtons, index + 1, clippedCount, alreadyClippedCount);
                        } catch (error) {
                            console.log(`Error clicking button ${index + 1}:`, error);
                        }
                    }, 0);
                }
            }
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
        const hasKrogerCoupons = document.querySelector('button[data-testid^="CouponActionButton-"]');
        const hasCvsCoupons = document.querySelector('send-to-card-action button.coupon-action, send-to-card-action button.sc-send-to-card-action');
        const hasWalgreensCoupons = document.querySelector('button[id^="clip"]');
        
        if (url.includes('coupon') || url.includes('weekly-ad') || hasKrogerCoupons || hasCvsCoupons || hasWalgreensCoupons) {
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
    
    // Helper function to wait for CVS confirmation and continue (content script version)
    function waitForCvsConfirmationAndContinueContent(buttons, nextIndex, clippedCount, alreadyClippedCount) {
        if (nextIndex >= buttons.length) {
            // All buttons processed, show final notification
            setTimeout(() => {
                showNotification(
                    `Complete! Sent to card ${clippedCount} new coupons. ${alreadyClippedCount} were already sent to card.`,
                    'success'
                );
            }, 1000);
            return;
        }
        
        const button = buttons[nextIndex];
        const buttonText = button.textContent.trim().toLowerCase();
        
        // Check if this button should be clicked
        if (!buttonText.includes('send to card')) {
            if (buttonText.includes('sent') || buttonText.includes('added') || buttonText.includes('on card')) {
                alreadyClippedCount++;
            }
            // Skip this button and continue to next
            waitForCvsConfirmationAndContinueContent(buttons, nextIndex + 1, clippedCount, alreadyClippedCount);
            return;
        }
        
        // Click the button
        try {
            button.click();
            clippedCount++;
            
            // Wait for confirmation by monitoring button text changes
            waitForCvsButtonConfirmationContent(button, () => {
                // Confirmation received, process next button
                waitForCvsConfirmationAndContinueContent(buttons, nextIndex + 1, clippedCount, alreadyClippedCount);
            });
        } catch (error) {
            console.log(`Error clicking CVS button ${nextIndex + 1}:`, error);
            // Continue to next button even if this one failed
            waitForCvsConfirmationAndContinueContent(buttons, nextIndex + 1, clippedCount, alreadyClippedCount);
        }
    }
    
    // Helper function to wait for CVS button confirmation (content script version)
    function waitForCvsButtonConfirmationContent(button, callback) {
        const originalText = button.textContent.trim().toLowerCase();
        let attempts = 0;
        const maxAttempts = 4; // 2 seconds max wait
        
        const checkConfirmation = () => {
            attempts++;
            const currentText = button.textContent.trim().toLowerCase();
            
            // Check if button text changed (indicating success)
            if (currentText !== originalText && 
                (currentText.includes('sent') || currentText.includes('added') || currentText.includes('on card'))) {
                callback();
                return;
            }
            
            // Check if button is disabled or has loading state
            if (button.disabled || button.classList.contains('loading')) {
                // Wait a bit more for the state to change
                setTimeout(checkConfirmation, 500);
                return;
            }
            
            // Timeout after max attempts
            if (attempts >= maxAttempts) {
                console.log('CVS confirmation timeout, proceeding anyway');
                callback();
                return;
            }
            
            // Check again in 500ms
            setTimeout(checkConfirmation, 500);
        };
        
        // Start checking after a short delay
        setTimeout(checkConfirmation, 500);
    }
})();