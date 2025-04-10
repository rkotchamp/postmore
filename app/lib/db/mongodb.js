import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI || !process.env.MONGO_DB) {
  throw new Error(
    "Please define the MONGODB_URI and MONGO_DB environment variables"
  );
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGO_DB;

let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

// Helper functions

/**
 * Connect to the database and return the database instance
 * @returns {Promise<Db>} MongoDB database instance
 */
export async function connectToDatabase() {
  const client = await clientPromise;
  return client.db(dbName);
}

/**
 * Get a collection from the database
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<Collection>} MongoDB collection
 */
export async function getCollection(collectionName) {
  const db = await connectToDatabase();
  return db.collection(collectionName);
}

export default clientPromise;
