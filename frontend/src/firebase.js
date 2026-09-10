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

export function getFirebaseOtpError(error) {
  const messages = {
    "auth/invalid-phone-number": "Enter a valid Indian mobile number.",
    "auth/operation-not-allowed": "Phone sign-in is not enabled in Firebase Authentication.",
    "auth/unauthorized-domain": "This website is not authorized in Firebase Authentication.",
    "auth/invalid-app-credential": "The reCAPTCHA check failed. Please try again.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/quota-exceeded": "OTP limit reached. Please try again later.",
    "auth/captcha-check-failed": "Security check failed. Please try again.",
    "auth/network-request-failed": "Network error. Check your internet connection and try again.",
    "auth/invalid-verification-code": "Incorrect OTP. Please try again.",
    "auth/code-expired": "This OTP has expired. Please request a new OTP.",
    "auth/session-expired": "This OTP session has expired. Please request a new OTP.",
  };
  return messages[error?.code] || "Could not complete phone authentication. Please try again.";
}