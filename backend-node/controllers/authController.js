const { getDatabase } = require("../db");
const { verifyFirebaseToken } = require("../firebaseAdmin");
const { SESSION_COOKIE, cookieOptions, createSession, revokeSession, findSession } = require("../session");

async function login(request, response, next) {
  try {
    const firebaseUser = await verifyFirebaseToken(request.body?.id_token);
    const farmer = await getDatabase().collection("farmers").findOne({ firebase_uid: firebaseUser.uid });
    if (!farmer) return response.status(404).json({ error: "Farmer profile not found. Complete registration first." });

    const rawToken = await createSession(farmer._id);
    response.cookie(SESSION_COOKIE, rawToken, cookieOptions());
    const { _id, ...farmerData } = farmer;
    return response.json({ farmer: { id: _id.toString(), ...farmerData } });
  } catch (error) {
    if (error.code?.startsWith("auth/") || error.statusCode === 401) return response.status(401).json({ error: "Invalid Firebase authentication token" });
    if (error.code === "app/invalid-credential" || error.message?.includes("Could not load the default credentials")) {
      return response.status(503).json({ error: "Firebase Admin credentials are not configured on the backend." });
    }
    return next(error);
  }
}

async function logout(request, response, next) {
  try {
    await revokeSession(request.cookies[SESSION_COOKIE]);
    response.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function session(request, response, next) {
  try {
    const current = await findSession(request.cookies[SESSION_COOKIE]);
    if (!current) {
      response.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
      return response.status(401).json({ error: "Your session has expired. Please login again." });
    }
    const { session_id, farmer_id, expires_at, ...farmer } = current;
    return response.json({ farmer, expires_at });
  } catch (error) {
    return next(error);
  }
}

module.exports = { login, logout, session };
