document.addEventListener('DOMContentLoaded', function() {
    const clipAllBtn = document.getElementById('clipAll');
    const clipAvailableBtn = document.getElementById('clipAvailable');
    const statusDiv = document.getElementById('status');
    const clipIcon = document.getElementById('clipIcon');
    const clipText = document.getElementById('clipText');

    function showStatus(message, type = 'info') {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        statusDiv.style.display = 'block';
        
        if (type !== 'error') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        }
    }

    function setLoading(isLoading) {
        if (isLoading) {
            clipIcon.innerHTML = '<div class="loading"></div>';
            clipText.textContent = 'Clipping...';
            clipAllBtn.disabled = true;
            clipAvailableBtn.disabled = true;
        } else {
            clipIcon.textContent = '✂️';
            clipText.textContent = 'Clip All Coupons';
            clipAllBtn.disabled = false;
            clipAvailableBtn.disabled = false;
        }
    }

    async function executeScript(scriptFunction) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                showStatus('No active tab found', 'error');
                return;
            }

            // Check if we're on a supported site
            const supportedSites = ['kroger.com', 'ralphs.com', 'fredmeyer.com', 'kingsupers.com', 'smithsfoodanddrug.com', 'cvs.com', 'walgreens.com'];
            const currentSite = new URL(tab.url).hostname;
            
            if (!supportedSites.some(site => currentSite.includes(site))) {
                showStatus('Please navigate to a supported coupon page first', 'error');
                return;
            }

            setLoading(true);
            showStatus('Looking for coupons...', 'info');

            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: scriptFunction
            });

            const result = results[0].result;
            setLoading(false);

            if (result.success) {
                showStatus(`Success! Found ${result.total} coupons. Clipped ${result.clipped} new ones.`, 'success');
            } else {
                showStatus(result.message || 'No coupons found on this page', 'error');
            }

        } catch (error) {
            setLoading(false);
            console.error('Error:', error);
            showStatus('Error: Make sure you\'re on a coupon page', 'error');
        }
    }

    clipAllBtn.addEventListener('click', () => {
        executeScript(clipAllCoupons);
    });

    clipAvailableBtn.addEventListener('click', () => {
        executeScript(clipAvailableCoupons);
    });

    // Check if we're on a supported page when popup opens
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0]) {
            const url = tabs[0].url;
            const supportedSites = ['kroger.com', 'ralphs.com', 'fredmeyer.com', 'kingsupers.com', 'smithsfoodanddrug.com', 'cvs.com', 'walgreens.com'];
            const isSupported = supportedSites.some(site => url.includes(site));
            
            if (!isSupported) {
                showStatus('Navigate to a supported coupon page to use this extension', 'info');
            } else if (!url.includes('coupon') && !url.includes('weekly-ad')) {
                showStatus('Navigate to the coupons section for best results', 'info');
            }
        }
    });
});

// Functions that will be injected into the page
function clipAllCoupons() {
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
        return {
            success: false,
            message: 'No coupon buttons found. Make sure you\'re on the coupons page.'
        };
    }
    
    let clippedCount = 0;
    let alreadyClippedCount = 0;
    
    if (isKrogerSite) {
        // Kroger: Use fixed delay for all buttons
        clipButtons.forEach((button, index) => {
            const buttonText = button.textContent.trim().toLowerCase();
            
            // Only click buttons that say exactly "clip"
            if (buttonText !== 'clip') {
                if (buttonText.includes('clipped') || buttonText.includes('added') || buttonText.includes('unclip')) {
                    alreadyClippedCount++;
                }
                return;
            }
            
            setTimeout(() => {
                try {
                    button.click();
                    clippedCount++;
                } catch (error) {
                    console.log(`Error clicking button ${index + 1}:`, error);
                }
            }, index * 300);
        });
    } else if (isWalgreensSite) {
        // Walgreens: Use 500ms delay (2 per second) to respect rate limiting
        clipButtons.forEach((button, index) => {
            const buttonText = button.textContent.trim().toLowerCase();
            
            // Only click buttons that say exactly "clip" (ignore "shop" buttons)
            if (buttonText !== 'clip') {
                if (buttonText.includes('clipped') || buttonText.includes('added') || buttonText.includes('unclip')) {
                    alreadyClippedCount++;
                }
                return;
            }
            
            setTimeout(() => {
                try {
                    button.click();
                    clippedCount++;
                } catch (error) {
                    console.log(`Error clicking button ${index + 1}:`, error);
                }
            }, index * 500);
        });
    } else {
        // CVS: Process sequentially with confirmation inline
        // Process CVS coupons one by one with confirmation
        let cvsIndex = 0;
        const processCvsButton = () => {
            if (cvsIndex >= clipButtons.length) return;
            
            const button = clipButtons[cvsIndex];
            const buttonText = button.textContent.trim().toLowerCase();
            
            // Check if this button should be clicked
            if (!buttonText.includes('send to card')) {
                if (buttonText.includes('sent') || buttonText.includes('added') || buttonText.includes('on card')) {
                    alreadyClippedCount++;
                }
                cvsIndex++;
                setTimeout(processCvsButton, 100);
                return;
            }
            
            // Click the button
            try {
                button.click();
                clippedCount++;
                
                // Wait for confirmation before processing next button
                const originalText = button.textContent.trim().toLowerCase();
                let attempts = 0;
                const maxAttempts = 4; // 2 seconds max wait
                
                const checkConfirmation = () => {
                    attempts++;
                    const currentText = button.textContent.trim().toLowerCase();
                    
                    // Check if button text changed (indicating success)
                    if (currentText !== originalText && 
                        (currentText.includes('sent') || currentText.includes('added') || currentText.includes('on card'))) {
                        cvsIndex++;
                        setTimeout(processCvsButton, 100);
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
                        cvsIndex++;
                        setTimeout(processCvsButton, 100);
                        return;
                    }
                    
                    // Check again in 500ms
                    setTimeout(checkConfirmation, 500);
                };
                
                // Start checking after a short delay
                setTimeout(checkConfirmation, 500);
            } catch (error) {
                console.log(`Error clicking CVS button ${cvsIndex + 1}:`, error);
                cvsIndex++;
                setTimeout(processCvsButton, 100);
            }
        };
        
        processCvsButton();
    }
    
    return {
        success: true,
        total: clipButtons.length,
        clipped: clipButtons.length - alreadyClippedCount,
        alreadyClipped: alreadyClippedCount
    };
}

function clipAvailableCoupons() {
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
    
    const availableButtons = Array.from(clipButtons).filter(button => {
        const buttonText = button.textContent.trim().toLowerCase();
        if (isKrogerSite) {
            return buttonText === 'clip'; // Only exact match for "clip"
        } else if (isWalgreensSite) {
            return buttonText === 'clip'; // Only exact match for "clip" (ignore "shop" buttons)
        } else {
            return buttonText.includes('send to card'); // CVS "send to card" buttons
        }
    });
    
    if (availableButtons.length === 0) {
        return {
            success: false,
            message: 'No available coupons to clip found.'
        };
    }
    
    if (isKrogerSite) {
        // Kroger: Use fixed delay
        availableButtons.forEach((button, index) => {
            setTimeout(() => {
                button.click();
            }, index * 300);
        });
    } else if (isWalgreensSite) {
        // Walgreens: Use 500ms delay (2 per second) to respect rate limiting
        availableButtons.forEach((button, index) => {
            setTimeout(() => {
                button.click();
            }, index * 500);
        });
    } else {
        // CVS: Process sequentially with confirmation inline
        // Process CVS coupons one by one with confirmation
        let cvsIndex = 0;
        const processCvsButton = () => {
            if (cvsIndex >= availableButtons.length) return;
            
            const button = availableButtons[cvsIndex];
            const buttonText = button.textContent.trim().toLowerCase();
            
            // Check if this button should be clicked
            if (!buttonText.includes('send to card')) {
                cvsIndex++;
                setTimeout(processCvsButton, 100);
                return;
            }
            
            // Click the button
            try {
                button.click();
                
                // Wait for confirmation before processing next button
                const originalText = button.textContent.trim().toLowerCase();
                let attempts = 0;
                const maxAttempts = 4; // 2 seconds max wait
                
                const checkConfirmation = () => {
                    attempts++;
                    const currentText = button.textContent.trim().toLowerCase();
                    
                    // Check if button text changed (indicating success)
                    if (currentText !== originalText && 
                        (currentText.includes('sent') || currentText.includes('added') || currentText.includes('on card'))) {
                        cvsIndex++;
                        setTimeout(processCvsButton, 100);
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
                        cvsIndex++;
                        setTimeout(processCvsButton, 100);
                        return;
                    }
                    
                    // Check again in 500ms
                    setTimeout(checkConfirmation, 500);
                };
                
                // Start checking after a short delay
                setTimeout(checkConfirmation, 500);
            } catch (error) {
                console.log(`Error clicking CVS button ${cvsIndex + 1}:`, error);
                cvsIndex++;
                setTimeout(processCvsButton, 100);
            }
        };
        
        processCvsButton();
    }
    
    return {
        success: true,
        total: clipButtons.length,
        clipped: availableButtons.length,
        alreadyClipped: clipButtons.length - availableButtons.length
    };
}
