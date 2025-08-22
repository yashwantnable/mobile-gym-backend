import mongoose, { Schema } from "mongoose";

const policySchema = new Schema(
  {
    type: {
      type: String,
      enum: ["TERMS", "PRIVACY"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    // is_active: {
    //   type: Boolean,
    //   default: true,
    // },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Policy = mongoose.model("Policy", policySchema);
