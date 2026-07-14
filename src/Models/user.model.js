import mongoose, { model, Schema } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minLength: [3, "Name must have at least 3 characters"],
      maxLength: [30, "Name can have at max 30 characters"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    rootDirId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Directories",
      // unique: true,
    },
    isDeleted: {
      type: Boolean,
      required: true,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin", "superAdmin"],
      required: true,
      default: "user",
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      unique: true,
      default: null,
      ref: "Subscriptions",
    },
    storageLimit: {
      type: Number,
      default: 1024 ** 3,
    },
    maxFileSize: {
      type: Number,
      default: 100 * 1024 * 1024,
    },
  },
  {
    timestamps: true,
  },
);

const Users = mongoose.models.Users || model("Users", userSchema);

export default Users;
