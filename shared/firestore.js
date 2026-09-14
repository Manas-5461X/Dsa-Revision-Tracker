import { db, auth } from './firebase.js';
import { 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    getDocs, 
    onSnapshot,
    serverTimestamp
} from './lib/firebase-firestore.js';

/**
 * Helper to get the authenticated user's progress document reference.
 */
function getProgressRef(questionId) {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('User is not authenticated');
    }
    return doc(db, 'users', user.uid, 'progress', questionId);
}

/**
 * Helper to get the authenticated user's progress collection reference.
 */
function getProgressCollectionRef() {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('User is not authenticated');
    }
    return collection(db, 'users', user.uid, 'progress');
}

/**
 * Helper to migrate old completed boolean to new status string.
 */
function parseProgressData(data) {
    let status = 'not-done';
    if (data.status) {
        status = data.status;
    } else if (data.completed === true) {
        status = 'done';
    }
    
    let timestamp = Date.now();
    if (data.updatedAt) {
        if (typeof data.updatedAt.toMillis === 'function') {
            timestamp = data.updatedAt.toMillis();
        } else if (typeof data.updatedAt === 'number') {
            timestamp = data.updatedAt;
        } else if (data.updatedAt.seconds) {
            timestamp = data.updatedAt.seconds * 1000;
        }
    }
    
    return {
        status: status,
        notes: data.notes || '',
        updatedAt: timestamp
    };
}

export async function getProgress(questionId) {
    try {
        const ref = getProgressRef(questionId);
        const snapshot = await getDoc(ref);
        if (snapshot.exists()) {
            return parseProgressData(snapshot.data());
        }
        return { status: 'not-done', notes: '', updatedAt: null };
    } catch (error) {
        console.error("Error getting progress:", error);
        return { status: 'not-done', notes: '', updatedAt: null };
    }
}

export async function updateProgress(questionId, updates) {
    const ref = getProgressRef(questionId);
    
    // We keep 'completed' true/false synced just in case older extension versions are active
    const dataToSave = {
        questionId: questionId,
        updatedAt: serverTimestamp(),
        ...updates
    };
    
    if (updates.status !== undefined) {
        dataToSave.completed = (updates.status === 'done');
    }

    // Wrap setDoc in a timeout in case Firestore hangs (e.g., database not created)
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firebase write timed out. Did you create the Firestore Database in the Firebase Console?')), 5000)
    );
    
    await Promise.race([
        setDoc(ref, dataToSave, { merge: true }),
        timeoutPromise
    ]);
}

export async function setProgress(questionId, completed) {
    // Legacy support for import
    const status = completed ? 'done' : 'not-done';
    await updateProgress(questionId, { status });
}

export async function toggleProgress(questionId) {
    // Legacy support
    const current = await getProgress(questionId);
    const newStatus = current.status === 'done' ? 'not-done' : 'done';
    await updateProgress(questionId, { status: newStatus });
    return newStatus === 'done';
}

export async function getAllProgress() {
    try {
        const ref = getProgressCollectionRef();
        const snapshot = await getDocs(ref);
        const progressMap = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            const key = data.questionId || doc.id;
            progressMap[key] = parseProgressData(data);
        });
        return progressMap;
    } catch (error) {
        console.error("Error getting all progress:", error);
        return {};
    }
}

export function subscribeToProgress(callback) {
    try {
        const ref = getProgressCollectionRef();
        return onSnapshot(ref, (snapshot) => {
            const progressMap = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                const key = data.questionId || doc.id;
                progressMap[key] = parseProgressData(data);
            });
            callback(progressMap);
        }, (error) => {
            console.error("Firestore subscription error:", error);
        });
    } catch (error) {
        console.error("Error subscribing to progress:", error);
        return () => {}; // return empty unsubscribe function
    }
}

/**
 * Get user profile (displayName)
 */
export async function getUserProfile() {
    const user = auth.currentUser;
    if (!user) return null;
    try {
        const ref = doc(db, 'users', user.uid, 'profile', 'info');
        const snapshot = await getDoc(ref);
        if (snapshot.exists()) {
            return snapshot.data();
        }
        return { displayName: user.displayName || 'User' };
    } catch (error) {
        console.error("Error getting user profile:", error);
        return { displayName: user.displayName || 'User' };
    }
}

/**
 * Save user profile (displayName)
 */
export async function saveUserProfile(displayName) {
    const user = auth.currentUser;
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'profile', 'info');
    await setDoc(ref, { displayName, updatedAt: serverTimestamp() }, { merge: true });
}
