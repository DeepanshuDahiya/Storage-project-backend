import { model, Schema } from "mongoose";

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
      enum: ["user", "admin"],
      required: true,
      default: "user",
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      unique: true,
      default: null,
    },
    storageLimit: {
      type: Number,
      default: 500 * 1024 * 1024,
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

const Users = model("Users", userSchema);

export default Users;
