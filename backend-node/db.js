const { MongoClient } = require("mongodb");

let client;
let database;

function getMongoConfig() {
  if (!process.env.MONGO_URI) throw new Error("Missing MONGO_URI in backend-node/.env");
  return { uri: process.env.MONGO_URI, databaseName: process.env.MONGO_DB_NAME || "kisan_setu" };
}

async function connectDatabase() {
  if (database) return database;
  const config = getMongoConfig();
  client = new MongoClient(config.uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  database = client.db(config.databaseName);
  await database.collection("farmers").createIndexes([
    { key: { firebase_uid: 1 }, unique: true, partialFilterExpression: { firebase_uid: { $type: "string" } } },
    { key: { mobile_number: 1 }, unique: true },
  ]);
  await database.collection("sessions").createIndexes([
    { key: { session_token_hash: 1 }, unique: true },
    { key: { expires_at: 1 }, expireAfterSeconds: 0 },
  ]);
  return database;
}

function getDatabase() {
  if (!database) throw new Error("MongoDB is not connected");
  return database;
}

async function testConnection() {
  await connectDatabase();
  await database.command({ ping: 1 });
  return true;
}

async function closeDatabase() {
  if (client) await client.close();
  client = undefined;
  database = undefined;
}

module.exports = { connectDatabase, getDatabase, testConnection, closeDatabase };
