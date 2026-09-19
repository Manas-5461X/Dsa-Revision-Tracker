import { updateProgress } from '../shared/firestore.js';
import { auth } from '../shared/firebase.js';

// Allows opening side panel on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'login') {
        chrome.identity.getAuthToken({ interactive: true }, function(token) {
            if (chrome.runtime.lastError) {
                const errorMsg = chrome.runtime.lastError.message;
                if (errorMsg.includes('not supported') || errorMsg.includes('Microsoft Edge')) {
                    const manifest = chrome.runtime.getManifest();
                    const clientId = manifest.oauth2.client_id;
                    const redirectUri = chrome.identity.getRedirectURL();
                    const scopes = manifest.oauth2.scopes.join(' ');
                    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
                    
                    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, function(redirectUrl) {
                        if (chrome.runtime.lastError) {
                            sendResponse({ error: "Edge Login Failed: " + chrome.runtime.lastError.message + "\nDid you add " + redirectUri + " to your Google Cloud Console Authorized redirect URIs?" });
                            return;
                        }
                        if (redirectUrl) {
                            const url = new URL(redirectUrl.replace('#', '?'));
                            const fallbackToken = url.searchParams.get('access_token');
                            if (fallbackToken) {
                                sendResponse({ token: fallbackToken });
                            } else {
                                sendResponse({ error: "No access token in response" });
                            }
                        }
                    });
                } else {
                    sendResponse({ error: errorMsg });
                }
            } else {
                sendResponse({ token: token });
            }
        });
        return true; // Keep message channel open for async response
    }
    
    if (request.action === 'problem_solved') {
        handleProblemSolved(request.url, request.platform);
        return true;
    }
});

async function handleProblemSolved(url, platform) {
    try {
        let questionId = null;
        
        if (platform === 'leetcode' && url.includes('leetcode.com/problems/')) {
            const match = url.match(/leetcode\.com\/problems\/([^/]+)/);
            if (match && match[1]) questionId = `leetcode:${match[1]}`;
        } else if (platform === 'gfg' && url.includes('geeksforgeeks.org/problems/')) {
            const match = url.match(/geeksforgeeks\.org\/problems\/([^/]+)/);
            if (match && match[1]) questionId = `gfg:${match[1]}`;
        }
        
        if (questionId) {
            // Wait for auth to initialize if waking from service worker sleep
            if (!auth.currentUser) {
                await new Promise((resolve) => {
                    let isResolved = false;
                    const timer = setTimeout(() => {
                        if (!isResolved) {
                            isResolved = true;
                            unsubscribe();
                            resolve(auth.currentUser);
                        }
                    }, 3000);
                    
                    const unsubscribe = auth.onAuthStateChanged((user) => {
                        if (user && !isResolved) {
                            isResolved = true;
                            clearTimeout(timer);
                            unsubscribe();
                            resolve(user);
                        }
                    });
                });
            }

            console.log("DSA Tracker: Auto-tracking problem solved:", questionId);
            await updateProgress(questionId, { status: 'done' });
            
            // Notify sidepanel if it's open to refresh its UI immediately
            chrome.runtime.sendMessage({ action: 'sync_progress' }).catch(() => {});
        }
    } catch (error) {
        console.error("DSA Tracker: Failed to auto-update progress", error);
    }
}
