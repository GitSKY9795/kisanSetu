require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { testConnection } = require("./db");
const farmersRouter = require("./routes/farmers");
const authRouter = require("./routes/auth");
const { revokeExpiredSessions } = require("./session");

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/", (request, response) => {
  response.json({ service: "Kisan Setu MongoDB API", status: "running" });
});

app.get("/health", async (request, response) => {
  try {
    await testConnection();
    return response.json({ status: "ok", database: "connected" });
  } catch (error) {
    return response.status(503).json({ status: "error", database: "unavailable" });
  }
});

app.use("/api/farmers", farmersRouter);
app.use("/api/auth", authRouter);

app.use((error, request, response, next) => {
  console.error("Unhandled API error:", error);
  return response.status(500).json({ error: "Internal server error" });
});

async function start() {
  try {
    await testConnection();
    await revokeExpiredSessions();
    app.listen(port, () => console.log(`Kisan Setu MongoDB API listening on http://localhost:${port}`));
  } catch (error) {
    console.error("Could not connect to MongoDB. Check backend-node/.env and your MongoDB URI.");
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) start();

module.exports = app;
