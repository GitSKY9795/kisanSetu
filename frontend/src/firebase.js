// Import the functions you need from the SDKs you need
import { T } from "./i18n/mark.js";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
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
// Keep the Firebase session across reloads and browser restarts.
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("[KisanSetu] Could not enable persistent sign-in:", error);
});

const AUTH_ERROR_MESSAGES = {
  // Email link (verification)
  "auth/invalid-email": T("Enter a valid email address."),
  "auth/missing-email": T("Enter your email address."),
  "auth/invalid-action-code": T("This verification link is invalid or has already been used."),
  "auth/expired-action-code": T("This verification link has expired. Request a new one."),
  "auth/user-disabled": T("This account has been disabled."),
  // Password linking / set-password
  "auth/email-already-in-use": T("An account with this email already exists — try logging in instead."),
  "auth/credential-already-in-use": T("This email is already linked to another account."),
  "auth/weak-password": T("Choose a stronger password (at least 6 characters)."),
  "auth/requires-recent-login": T("This took too long — please verify your email again."),
  // Login (email + password)
  "auth/wrong-password": T("Incorrect email or password."),
  "auth/user-not-found": T("No account found with that email."),
  "auth/invalid-credential": T("Incorrect email or password."),
  // Shared
  "auth/too-many-requests": T("Too many attempts. Please try again later."),
  "auth/network-request-failed": T("Network error. Check your internet connection and try again."),
  "auth/unauthorized-domain": T("This website is not authorized in Firebase Authentication."),
  // Google sign-in
  "auth/operation-not-allowed": T("Google sign-in is not enabled for this project yet."),
  "auth/popup-closed-by-user": T("The Google sign-in window was closed before finishing."),
  "auth/cancelled-popup-request": T("The Google sign-in window was closed before finishing."),
  "auth/account-exists-with-different-credential": T("An account already exists with this email using a different sign-in method. Log in with your password first."),
};

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/** Signs in with Google. Uses a popup; if the browser blocks popups it falls back to a full-page
 * redirect (the result is then picked up by `finishGoogleRedirect()` when the app loads again).
 * Resolves to the Firebase user, or null when a redirect was started instead. */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    if (error?.code === "auth/popup-blocked") {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
}

/** Completes a Google sign-in that went through the redirect fallback. */
export async function finishGoogleRedirect() {
  const result = await getRedirectResult(auth);
  return result?.user || null;
}

export const isGoogleUser = (user) => Boolean(user?.providerData?.some((p) => p.providerId === "google.com"));

export function getFirebaseAuthError(error) {
  return AUTH_ERROR_MESSAGES[error?.code] || T("Something went wrong. Please try again.");
}
