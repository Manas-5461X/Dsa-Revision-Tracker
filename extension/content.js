// extension/content.js
console.log("DSA Tracker: Content script injected on", window.location.hostname);

let hasNotified = false;

function checkForSuccess() {
    if (hasNotified) return;

    const host = window.location.hostname;
    let found = false;

    if (host.includes("leetcode.com")) {
        // LeetCode "Accepted" state
        // Look for data-e2e-locator or any text element containing "Accepted" in green
        const submissionResult = document.querySelector('[data-e2e-locator="submission-result"]');
        if (submissionResult && submissionResult.textContent.includes('Accepted')) {
            found = true;
        } else {
            const hasAcceptedText = Array.from(document.querySelectorAll('span, div, p, h1, h2, h3, a')).some(el => {
                const text = el.textContent ? el.textContent.trim() : '';
                const className = (el.getAttribute('class') || '').toLowerCase();
                // Check if it contains Accepted, is a short string, and has a green/success class
                return text.includes('Accepted') && text.length < 50 && (className.includes('green') || className.includes('success'));
            });
            if (hasAcceptedText) found = true;
        }
    } else if (host.includes("geeksforgeeks.org")) {
        // GeeksForGeeks success state
        const hasGfgSuccess = Array.from(document.querySelectorAll('div, span, h1, h2, h3, p')).some(el => {
            const text = el.textContent ? el.textContent.trim() : '';
            return text.length < 100 && (text.includes('Problem Solved Successfully') || text.includes('Correct Answer'));
        });
        if (hasGfgSuccess) found = true;
    }

    if (found) {
        hasNotified = true;
        console.log("DSA Tracker: Success detected! Notifying background script...");
        
        chrome.runtime.sendMessage({
            action: 'problem_solved',
            platform: host.includes('leetcode') ? 'leetcode' : 'gfg',
            url: window.location.href
        });

        // Reset after 10 seconds to allow for re-submissions
        setTimeout(() => {
            hasNotified = false;
        }, 10000);
    }
}

// Set up a MutationObserver to watch for DOM changes (since these are SPAs)
const observer = new MutationObserver((mutations) => {
    // Only check if we haven't recently notified
    if (!hasNotified) {
        // Throttle slightly to avoid too much overhead on every DOM change
        requestAnimationFrame(checkForSuccess);
    }
});

// Start observing the body
observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    characterData: true 
});
