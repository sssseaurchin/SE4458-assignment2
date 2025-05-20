// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, onValue } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDn7nbSJNib1xaKxdJwfFK4QESUikWkoDI",
    authDomain: "se-4458-assignment-2.firebaseapp.com",
    databaseURL: "https://se-4458-assignment-2-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "se-4458-assignment-2",
    storageBucket: "se-4458-assignment-2.firebasestorage.app",
    messagingSenderId: "21004539036",
    appId: "1:21004539036:web:39a3df733cf85483088959"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
export { db, ref, push, onValue };
