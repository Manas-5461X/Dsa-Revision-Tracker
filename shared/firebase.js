import { config } from './config.js';
import { initializeApp } from './lib/firebase-app.js';
import { getAuth } from './lib/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from './lib/firebase-firestore.js';

// Initialize Firebase
const app = initializeApp(config.firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});
