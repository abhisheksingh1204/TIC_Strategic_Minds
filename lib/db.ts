import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI not defined");
}

const uri = MONGODB_URI.trim();

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false, 
      serverSelectionTimeoutMS: 5000,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
