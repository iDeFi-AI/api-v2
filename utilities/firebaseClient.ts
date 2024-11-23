import { initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  GithubAuthProvider
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  child,
  get,
  push
} from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "api-v2-idefi-ai.firebaseapp.com",
  projectId: "api-v2-idefi-ai",
  storageBucket: "api-v2-idefi-ai.appspot.com",
  messagingSenderId: "315219736110",
  appId: "1:315219736110:web:818238ea513631abe4d1bf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Set authentication persistence to browser local
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting persistence:', error);
});

// Authentication providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// Authentication functions
const createAccountWithEmailPassword = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

const signInWithEmailPassword = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

const signInWithGithub = () => signInWithPopup(auth, githubProvider);

const signInAnonymouslyWithFirebase = () => signInAnonymously(auth);

// Realtime Database functions
const storeData = (path: string, data: any) => set(ref(database, path), data);

const getData = async (path: string) => {
  const snapshot = await get(ref(database, path));
  return snapshot.exists() ? snapshot.val() : null;
};

const pushData = (path: string, data: any) => push(ref(database, path), data);

export {
  app,
  auth,
  database,
  createAccountWithEmailPassword,
  signInWithEmailPassword,
  signInWithGoogle,
  signInWithGithub,
  signInAnonymouslyWithFirebase as signInAnonymously,
  storeData,
  getData,
  pushData
};
