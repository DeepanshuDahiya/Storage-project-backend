import mongoose from "mongoose";

export default async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Mongoose connected successfully.");
  } catch (error) {
    console.log("Mongoose error: ", error);
  }
}
