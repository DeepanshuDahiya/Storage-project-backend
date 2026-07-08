import { model, Schema } from "mongoose";
import { maxLength } from "zod";

const directorySchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "Untitled",
      maxLength: [30, "Name of directory can not exceed 30 characters"],
    },
    parentDirId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
      unique: false,
      ref: "Directories",
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // size: {
    //   type: Number,
    //   required: true,
    //   default: 0,
    // },
  },
  {
    timestamps: true,
    strict: "throw",
  },
);

const Directories = model("Directories", directorySchema);

export default Directories;
