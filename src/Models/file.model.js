import { model, Schema } from "mongoose";

const fileSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    extension: {
      type: String,
      trim: true,
      required: true,
    },
    parentDirId: {
      type: Schema.Types.ObjectId,
      ref: "Directory",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    size: {
      type: Number,
      required: true,
    },
    isUploading: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    strict: "throw",
    timestamps: true,
  },
);

const Files = model("Files", fileSchema);

export default Files;
