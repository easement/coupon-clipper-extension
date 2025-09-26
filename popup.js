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
            const supportedSites = ['kroger.com', 'ralphs.com', 'fredmeyer.com', 'kingsupers.com', 'smithsfoodanddrug.com'];
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
            const supportedSites = ['kroger.com', 'ralphs.com', 'fredmeyer.com', 'kingsupers.com', 'smithsfoodanddrug.com'];
            const isSupported = supportedSites.some(site => url.includes(site));
            
            if (!isSupported) {
                showStatus('Navigate to a grocery store coupon page to use this extension', 'info');
            } else if (!url.includes('coupon')) {
                showStatus('Navigate to the coupons section for best results', 'info');
            }
        }
    });
});

// Functions that will be injected into the page
function clipAllCoupons() {
    const clipButtons = document.querySelectorAll('button[data-testid^="CouponActionButton-"]');
    
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
        
        if (buttonText.includes('clipped') || buttonText.includes('added') || buttonText.includes('unclip')) {
            alreadyClippedCount++;
            return;
        }
        
        setTimeout(() => {
            try {
                button.click();
                clippedCount++;
            } catch (error) {
                console.log(`Error clicking button ${index + 1}:`, error);
            }
        }, index * 300); // Reduced delay for faster execution
    });
    
    return {
        success: true,
        total: clipButtons.length,
        clipped: clipButtons.length - alreadyClippedCount,
        alreadyClipped: alreadyClippedCount
    };
}

function clipAvailableCoupons() {
    const clipButtons = document.querySelectorAll('button[data-testid^="CouponActionButton-"]');
    const availableButtons = Array.from(clipButtons).filter(button => {
        const buttonText = button.textContent.trim().toLowerCase();
        return buttonText === 'clip' && !buttonText.includes('unclip');
    });
    
    if (availableButtons.length === 0) {
        return {
            success: false,
            message: 'No available coupons to clip found.'
        };
    }
    
    availableButtons.forEach((button, index) => {
        setTimeout(() => {
            button.click();
        }, index * 300);
    });
    
    return {
        success: true,
        total: clipButtons.length,
        clipped: availableButtons.length,
        alreadyClipped: clipButtons.length - availableButtons.length
    };
}