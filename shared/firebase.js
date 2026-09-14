import { config } from './config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js';
import { getFirestore, enableIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

// Initialize Firebase
const app = initializeApp(config.firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence for instant loading
enableIndexedDbPersistence(db).catch((err) => {
    console.warn("Firebase persistence error:", err.code);
});
