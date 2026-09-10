const { verifyFirebaseToken } = require("../firebaseAdmin");
const { SESSION_COOKIE, findSession } = require("../session");

function getBearerToken(request) {
  const header = request.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

async function requireFirebaseToken(request, response, next) {
  try {
    request.firebaseUser = await verifyFirebaseToken(getBearerToken(request));
    return next();
  } catch (error) {
    return response.status(401).json({ error: "Invalid or missing Firebase authentication token" });
  }
}

async function requireSession(request, response, next) {
  try {
    const session = await findSession(request.cookies[SESSION_COOKIE]);
    if (!session) return response.status(401).json({ error: "Your session has expired. Please login again." });
    request.session = session;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireFirebaseToken, requireSession };
