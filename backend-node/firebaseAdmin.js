const { getApps, initializeApp, cert, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

if (getApps().length === 0) {
  initializeApp({
    credential: process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? cert(require(process.env.GOOGLE_APPLICATION_CREDENTIALS))
      : applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

async function verifyFirebaseToken(idToken) {
  if (!idToken) {
    const error = new Error("Missing Firebase ID token");
    error.statusCode = 401;
    throw error;
  }
  return getAuth().verifyIdToken(idToken);
}

module.exports = { verifyFirebaseToken };
