import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCwwtxP-gX-Ij_5Z3CdGt3S3qXXv20-DVU",
  authDomain: "chronosfeed.firebaseapp.com",
  projectId: "chronosfeed",
  storageBucket: "chronosfeed.firebasestorage.app",
  messagingSenderId: "609492845487",
  appId: "1:609492845487:web:df28094c526ae30101255a"
};

// Initialize Firebase (safely for SSR/Next.js)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export interface FirestoreReport {
  ciphertext: string;
  iv: string;
  createdAt: string;
}

/**
 * Saves the encrypted report ciphertext to Firestore.
 * Zero-knowledge: the encryption key is NEVER uploaded to the server or database.
 */
export async function saveEncryptedReport(id: string, ciphertext: string, iv: string): Promise<void> {
  const docRef = doc(db, 'reports', id);
  await setDoc(docRef, {
    ciphertext,
    iv,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Retrieves the encrypted report ciphertext from Firestore.
 */
export async function getEncryptedReport(id: string): Promise<FirestoreReport | null> {
  try {
    const docRef = doc(db, 'reports', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as FirestoreReport;
    }
  } catch (error) {
    console.error('Error fetching document from Firestore:', error);
  }
  return null;
}
