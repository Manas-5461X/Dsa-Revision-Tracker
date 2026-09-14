import { auth } from './firebase.js';
import { 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';

const provider = new GoogleAuthProvider();

export function getCurrentUser() {
    return auth.currentUser;
}

export function signInWithGoogle() {
    return signInWithPopup(auth, provider);
}

export function signOutUser() {
    return signOut(auth);
}

export function subscribeToAuthState(callback) {
    return onAuthStateChanged(auth, callback);
}
