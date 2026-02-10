import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getBytes, deleteObject, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyA8kSPE63aYs2QmzLR_k05hrV4-9SMXdGU",
  authDomain: "demoproject-c9fbc.firebaseapp.com",
  projectId: "demoproject-c9fbc",
  storageBucket: "demoproject-c9fbc.firebasestorage.app",
  messagingSenderId: "244981934160",
  appId: "1:244981934160:web:822af41ce04f9fafd64955",
  measurementId: "G-WVPCCRDS90"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app,'zaiko');
export const storage = getStorage(app);

// Collection references
export const companiesCollection = collection(db, 'companies');
export const inventoryCollection = collection(db, 'inventory');
export const returnsCollection = collection(db, 'returns');
export const deadStockCollection = collection(db, 'deadStock');
export const uploadedFilesCollection = collection(db, 'uploadedFiles');

// Helper functions
export const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

export { doc, getDocs, setDoc, deleteDoc, onSnapshot, query, Timestamp };
export { ref, uploadBytes, getBytes, deleteObject, getDownloadURL };
