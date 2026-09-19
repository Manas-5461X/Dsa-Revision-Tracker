// extension/content.js
console.log("DSA Tracker: Content script injected on", window.location.hostname);

let hasNotified = false;

function checkForSuccess() {
    if (hasNotified) return;

    const host = window.location.hostname;
    let found = false;

    if (host.includes("leetcode.com")) {
        // LeetCode "Accepted" state
        const acceptedNodes = Array.from(document.querySelectorAll('span, div')).filter(
            el => el.textContent && el.textContent.trim() === 'Accepted'
        );
        // Ensure it's part of the submission result (often green color or specific class)
        if (acceptedNodes.some(el => el.className.includes('text-green') || el.className.includes('success'))) {
            found = true;
        }
    } else if (host.includes("geeksforgeeks.org")) {
        // GeeksForGeeks success state
        const successNodes = Array.from(document.querySelectorAll('div, span')).filter(
            el => el.textContent && (el.textContent.includes('Problem Solved Successfully') || el.textContent.includes('Correct Answer'))
        );
        if (successNodes.length > 0) {
            found = true;
        }
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
