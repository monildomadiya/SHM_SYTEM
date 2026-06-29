import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyD58idVk61B7vjCsUNCucYO_nHlJbZPh-4",
  authDomain: "shm-system-2ae10.firebaseapp.com",
  databaseURL: "https://shm-system-2ae10-default-rtdb.firebaseio.com",
  projectId: "shm-system-2ae10",
  storageBucket: "shm-system-2ae10.firebasestorage.app",
  messagingSenderId: "126625238505",
  appId: "1:126625238505:web:3de64c935745c412e90f78",
  measurementId: "G-SGES3KTFYT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
