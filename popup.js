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
            const supportedSites = ['kroger.com', 'ralphs.com', 'fredmeyer.com', 'kingsupers.com', 'smithsfoodanddrug.com', 'cvs.com'];
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
            const supportedSites = ['kroger.com', 'ralphs.com', 'fredmeyer.com', 'kingsupers.com', 'smithsfoodanddrug.com', 'cvs.com'];
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
    
    // If no Kroger buttons found, check for CVS buttons
    if (!isKrogerSite) {
        clipButtons = document.querySelectorAll('send-to-card-action button.coupon-action, send-to-card-action button.sc-send-to-card-action');
        isKrogerSite = false;
    }
    
    if (clipButtons.length === 0) {
        return {
            success: false,
            message: 'No coupon buttons found. Make sure you\'re on the coupons page.'
        };
    }
    
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
        } else {
            // CVS logic: Click "send to card" buttons
            if (!buttonText.includes('send to card')) {
                // Check if already sent (CVS might change button text after sending)
                if (buttonText.includes('sent') || buttonText.includes('added') || buttonText.includes('on card')) {
                    alreadyClippedCount++;
                }
                return;
            }
        }
        
        const delay = isKrogerSite ? index * 300 : index * 500; // CVS: 500ms = 2 per second
        setTimeout(() => {
            try {
                button.click();
                clippedCount++;
            } catch (error) {
                console.log(`Error clicking button ${index + 1}:`, error);
            }
        }, delay);
    });
    
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
    
    // If no Kroger buttons found, check for CVS buttons
    if (!isKrogerSite) {
        clipButtons = document.querySelectorAll('send-to-card-action button.coupon-action, send-to-card-action button.sc-send-to-card-action');
        isKrogerSite = false;
    }
    
    const availableButtons = Array.from(clipButtons).filter(button => {
        const buttonText = button.textContent.trim().toLowerCase();
        if (isKrogerSite) {
            return buttonText === 'clip'; // Only exact match for "clip"
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
    
    availableButtons.forEach((button, index) => {
        const delay = isKrogerSite ? index * 300 : index * 500; // CVS: 500ms = 2 per second
        setTimeout(() => {
            button.click();
        }, delay);
    });
    
    return {
        success: true,
        total: clipButtons.length,
        clipped: availableButtons.length,
        alreadyClipped: clipButtons.length - availableButtons.length
    };
}