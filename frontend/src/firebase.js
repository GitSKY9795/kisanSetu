// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA0tFX8L87RiR5jtWgWG8Pm_FqEp65YTpA",
  authDomain: "kisan-setu-3bbf5.firebaseapp.com",
  projectId: "kisan-setu-3bbf5",
  storageBucket: "kisan-setu-3bbf5.firebasestorage.app",
  messagingSenderId: "378054503664",
  appId: "1:378054503664:web:33fc17b6867094eaabe635",
  measurementId: "G-Z6X299DR0R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);

const AUTH_ERROR_MESSAGES = {
  // Email link (verification)
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-email": "Enter your email address.",
  "auth/invalid-action-code": "This verification link is invalid or has already been used.",
  "auth/expired-action-code": "This verification link has expired. Request a new one.",
  "auth/user-disabled": "This account has been disabled.",
  // Password linking / set-password
  "auth/email-already-in-use": "An account with this email already exists — try logging in instead.",
  "auth/credential-already-in-use": "This email is already linked to another account.",
  "auth/weak-password": "Choose a stronger password (at least 6 characters).",
  "auth/requires-recent-login": "This took too long — please verify your email again.",
  // Login (email + password)
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "No account found with that email.",
  "auth/invalid-credential": "Incorrect email or password.",
  // Shared
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/network-request-failed": "Network error. Check your internet connection and try again.",
  "auth/unauthorized-domain": "This website is not authorized in Firebase Authentication.",
};

export function getFirebaseAuthError(error) {
  return AUTH_ERROR_MESSAGES[error?.code] || "Something went wrong. Please try again.";
}
