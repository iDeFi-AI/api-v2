import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "firebase/auth";
import {
  getDatabase,
  ref as databaseRef,
  set as databaseSet,
  get as databaseGet,
  push as databasePush,
  update as databaseUpdate,
  remove as databaseRemove,
} from "firebase/database";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { v4 as uuidv4 } from "uuid"; // For generating unique API keys

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "api-v2-idefi-ai.firebaseapp.com",
  databaseURL: "https://api-v2-idefi-ai-default-rtdb.firebaseio.com",
  projectId: "api-v2-idefi-ai",
  storageBucket: "api-v2-idefi-ai.firebasestorage.app",
  messagingSenderId: "315219736110",
  appId: "1:315219736110:web:818238ea513631abe4d1bf",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

// Set authentication persistence
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting persistence:", error);
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

// Database helper functions
const storeData = (path: string, data: any) => databaseSet(databaseRef(database, path), data);

const getData = async (path: string) => {
  const snapshot = await databaseGet(databaseRef(database, path));
  return snapshot.exists() ? snapshot.val() : null;
};

const pushData = (path: string, data: any) => databasePush(databaseRef(database, path), data);

const updateData = (path: string, data: any) => databaseUpdate(databaseRef(database, path), data);

const deleteData = (path: string) => databaseRemove(databaseRef(database, path));

// Storage helper functions
const uploadFile = async (uid: string, filePath: string, file: File) => {
  if (!uid) throw new Error("UID is required to upload files.");
  const storagePath = `visualizations/${uid}/${filePath}`;
  const storageReference = storageRef(storage, storagePath);
  await uploadBytes(storageReference, file);
  return getDownloadURL(storageReference);
};

const getFileUrl = async (uid: string, filePath: string) => {
  if (!uid) throw new Error("UID is required to get file URLs.");
  const storagePath = `visualizations/${uid}/${filePath}`;
  const storageReference = storageRef(storage, storagePath);
  return getDownloadURL(storageReference);
};

const deleteFile = async (uid: string, filePath: string) => {
  if (!uid) throw new Error("UID is required to delete files.");
  const storagePath = `visualizations/${uid}/${filePath}`;
  const storageReference = storageRef(storage, storagePath);
  await deleteObject(storageReference);
};

// API token management
const generateApiKey = (): string => uuidv4();

const fetchApiKeys = async (uid: string) => {
  if (!uid) throw new Error("UID is required to fetch API keys.");
  const apiKeysPath = `users/${uid}/apiKeys`;
  const apiKeys = await getData(apiKeysPath);
  return apiKeys || [];
};

const createApiKey = async (uid: string) => {
  if (!uid) throw new Error("UID is required to create an API key.");
  const newKey = generateApiKey();
  const apiKeysPath = `users/${uid}/apiKeys`;
  const existingKeys = await fetchApiKeys(uid);

  const updatedKeys = [...existingKeys, newKey];
  await storeData(apiKeysPath, updatedKeys);

  return newKey;
};

const fetchUserToken = async (uid: string) => {
  if (!uid) throw new Error("UID is required to fetch the user token.");
  const tokenPath = `users/${uid}/accessToken`;
  const token = await getData(tokenPath);
  return token || "No access token available.";
};

const updateUserToken = async (uid: string, token: string) => {
  if (!uid) throw new Error("UID is required to update the user token.");
  const tokenPath = `users/${uid}/accessToken`;
  await storeData(tokenPath, token);
  return token;
};

const deleteApiKey = async (uid: string, keyToDelete: string) => {
  if (!uid) throw new Error("UID is required to delete an API key.");
  const apiKeysPath = `users/${uid}/apiKeys`;
  const existingKeys = await fetchApiKeys(uid);

  const updatedKeys = existingKeys.filter((key: string) => key !== keyToDelete);
  await storeData(apiKeysPath, updatedKeys);

  return updatedKeys;
};

// UID-based restriction validation
const validateUserAccess = async (uid: string) => {
  const userPath = `users/${uid}`;
  const userExists = await getData(userPath);

  if (!userExists) {
    throw new Error("Access denied. User not found in the database.");
  }
  return true;
};

// Exported functions
export {
  app,
  auth,
  database,
  storage,
  databaseRef,
  databaseSet,
  databaseGet,
  databasePush,
  databaseUpdate,
  databaseRemove,
  createAccountWithEmailPassword,
  signInWithEmailPassword,
  signInWithGoogle,
  signInWithGithub,
  signInAnonymouslyWithFirebase as signInAnonymously,
  storeData,
  getData,
  pushData,
  updateData,
  deleteData,
  fetchApiKeys,
  createApiKey,
  fetchUserToken,
  updateUserToken,
  deleteApiKey,
  validateUserAccess,
  uploadFile,
  getFileUrl,
  deleteFile,
};
