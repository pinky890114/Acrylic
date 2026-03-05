import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyB4tcpN50rPxU5rRHLbFFxgRV6bWdIVbLc",
  authDomain: "arclyc-c08bc.firebaseapp.com",
  projectId: "arclyc-c08bc",
  storageBucket: "arclyc-c08bc.firebasestorage.app",
  messagingSenderId: "109415460260",
  appId: "1:109415460260:web:ce63c0ec3c93a51eade531"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
  } else if (err.code == 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence');
  }
});

export { db, storage };
