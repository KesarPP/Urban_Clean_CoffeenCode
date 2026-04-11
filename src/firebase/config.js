import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAg43vR3TxUiBEgpQeu9uG26pSlSYXUFv4",
  authDomain: "e-waste-management-51bff.firebaseapp.com",
  projectId: "e-waste-management-51bff",
  storageBucket: "e-waste-management-51bff.firebasestorage.app",
  messagingSenderId: "140465082012",
  appId: "1:140465082012:web:5caca5bc71783b0041a759",
  measurementId: "G-QF0JST029Z"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);