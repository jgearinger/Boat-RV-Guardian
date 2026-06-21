import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCLXUhvN8ZJsLKogs9-0GWUDFO2WzAWAEY",
  authDomain: "boat-rv-guardian.firebaseapp.com",
  projectId: "boat-rv-guardian",
  storageBucket: "boat-rv-guardian.firebasestorage.app",
  messagingSenderId: "356004364257",
  appId: "1:356004364257:web:d86ec4ee4297da5f499ca0",
  measurementId: "G-GN20PZSK1D"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  onSnapshot
};
