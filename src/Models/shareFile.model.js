import { Schema, model } from "mongoose";

const sharedFileSchema = new Schema(
  {
    fileId: {
      type: Schema.Types.ObjectId,
      ref: "Files",
      required: true,
      index: true,
    },

    owner: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },

    token: {
      type: String,
      required: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    password: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const SharedFiles = model("SharedFiles", sharedFileSchema);

export default SharedFiles;
