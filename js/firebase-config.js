// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBRbfuMB_J7ADzWYcnI2UmUmTuLYoY3G6Q",
    authDomain: "webrtc-a3cd5.firebaseapp.com",
    projectId: "webrtc-a3cd5",
    storageBucket: "webrtc-a3cd5.firebasestorage.app",
    messagingSenderId: "203007627814",
    appId: "1:203007627814:web:bd8e152d4cd64e66f78ce7",
    measurementId: "G-WM7CQRP0WK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
