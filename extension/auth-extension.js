import { auth } from '../shared/firebase.js';
import { 
    GoogleAuthProvider, 
    signInWithCredential, 
    signOut, 
    onAuthStateChanged 
} from '../shared/lib/firebase-auth.js';

export function getCurrentUser() {
    return auth.currentUser;
}

/**
 * Signs into Firebase via Chrome Extension Identity.
 */
export async function signInWithGoogle() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'login' }, (response) => {
            if (chrome.runtime.lastError) {
                return reject(new Error(chrome.runtime.lastError.message));
            }
            if (response && response.error) {
                return reject(new Error(response.error));
            }
            if (!response || !response.token) {
                return reject(new Error('Failed to get auth token from background script'));
            }
            
            // Use the token to authenticate with Firebase
            const credential = GoogleAuthProvider.credential(null, response.token);
            signInWithCredential(auth, credential)
                .then(resolve)
                .catch(reject);
        });
    });
}

export function signOutUser() {
    return new Promise((resolve, reject) => {
        // Sign out of Firebase
        signOut(auth).then(() => {
            // Remove Chrome Identity token
            chrome.identity.getAuthToken({ interactive: false }, (token) => {
                if (token) {
                    chrome.identity.removeCachedAuthToken({ token }, () => resolve());
                } else {
                    resolve();
                }
            });
        }).catch(reject);
    });
}

export function subscribeToAuthState(callback) {
    return onAuthStateChanged(auth, callback);
}
