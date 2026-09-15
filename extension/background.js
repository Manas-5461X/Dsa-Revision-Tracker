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
});
