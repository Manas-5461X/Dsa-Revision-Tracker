import { config } from './config.js';
import { initializeApp } from './lib/firebase-app.js';
import { getAuth } from './lib/firebase-auth.js';
import { getFirestore, enableIndexedDbPersistence } from './lib/firebase-firestore.js';

// Initialize Firebase
const app = initializeApp(config.firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence for instant loading
enableIndexedDbPersistence(db).catch((err) => {
    console.warn("Firebase persistence error:", err.code);
});
