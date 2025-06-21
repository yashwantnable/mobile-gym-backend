import mongoose, { Schema } from "mongoose";

const articalSchema = new Schema(
  {

    title: {
      type: String,
      lowercase: true,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      maxlength: 1500,
      default: null,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Artical = mongoose.model("Artical", articalSchema);
