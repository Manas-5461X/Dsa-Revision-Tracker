/**
 * Firebase and Application Configuration
 * 
 * Replace the firebaseConfig values with your own Firebase project configuration.
 * Note: These values are safe to expose in client-side code as they only identify
 * your app to Firebase. Security is enforced via Firebase Security Rules.
 */
export const config = {
    // Replace with your Google Sheet ID (from the URL)
    SHEET_ID: 'YOUR_SHEET_ID_HERE',
    // Replace with your Sheet GID (from the URL, usually 0)
    SHEET_GID: '0',
    
    // Replace with your Firebase configuration object
    firebaseConfig: {
        apiKey: "YOUR_API_KEY_HERE",
        authDomain: "YOUR_AUTH_DOMAIN_HERE",
        projectId: "YOUR_PROJECT_ID_HERE",
        storageBucket: "YOUR_STORAGE_BUCKET_HERE",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
        appId: "YOUR_APP_ID_HERE",
        measurementId: "YOUR_MEASUREMENT_ID_HERE"
    }
};
