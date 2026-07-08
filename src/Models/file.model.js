import { model, Schema } from "mongoose";

const fileSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    parentDirId: {
      type: Schema.Types.ObjectId,
      ref: "Directory",
      required: true,
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
    strict: "throw",
    timestamps: true,
  },
);

const Files = model("Files", fileSchema);

export default Files;
