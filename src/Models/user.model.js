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
      unique: true,
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
      ref: "Subscriptions",
    },
    storageLimit: {
      type: Number,
      default: 30 * 1024 * 1024,
    },
    maxFileSize: {
      type: Number,
      default: 10 * 1024 * 1024,
    },
    maxDevices: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index(
  { subscriptionId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      subscriptionId: { $exists: true },
    },
  },
);

const Users = mongoose.models.Users || model("Users", userSchema);

export default Users;
