import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

export const isFirebaseConfigured =
  !!apiKey &&
  apiKey !== 'undefined' &&
  !String(apiKey).startsWith('REPLACE') &&
  !String(apiKey).startsWith('YOUR_');

let app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _firestore: Firestore | undefined;

if (isFirebaseConfigured) {
  try {
    app = initializeApp({
      apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });
    _auth = getAuth(app);
    _firestore = getFirestore(app);
  } catch (e) {
    console.warn('[Firebase] Init failed — running in placeholder mode:', e);
  }
}

export const auth = _auth;
export const firestore = _firestore;
export default app;
