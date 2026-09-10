const crypto = require("crypto");
const { getDatabase } = require("./db");

const SESSION_COOKIE = "kisan_setu_session";
const SESSION_TTL_MS = 20 * 24 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function cookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: SESSION_TTL_MS, path: "/" };
}

async function createSession(farmerId) {
  const rawToken = crypto.randomBytes(48).toString("base64url");
  await getDatabase().collection("sessions").insertOne({ farmer_id: farmerId, session_token_hash: hashToken(rawToken), expires_at: new Date(Date.now() + SESSION_TTL_MS), created_at: new Date() });
  return rawToken;
}

async function findSession(rawToken) {
  if (!rawToken) return null;
  const session = await getDatabase().collection("sessions").findOne({ session_token_hash: hashToken(rawToken), expires_at: { $gt: new Date() } });
  if (!session) return null;
  const farmer = await getDatabase().collection("farmers").findOne({ _id: session.farmer_id });
  if (!farmer) return null;
  return { session_id: session._id, farmer_id: session.farmer_id, expires_at: session.expires_at, farmer };
}

async function revokeSession(rawToken) {
  if (rawToken) await getDatabase().collection("sessions").deleteOne({ session_token_hash: hashToken(rawToken) });
}

async function revokeExpiredSessions() {
  await getDatabase().collection("sessions").deleteMany({ expires_at: { $lte: new Date() } });
}

module.exports = { SESSION_COOKIE, SESSION_TTL_MS, cookieOptions, createSession, findSession, revokeSession, revokeExpiredSessions };
