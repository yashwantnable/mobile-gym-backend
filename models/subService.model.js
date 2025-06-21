import mongoose, { Schema } from "mongoose";

const subServiceSchema = new Schema(
  {
    serviceTypeId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceType",
      required: true,
    },
    name: {
      type: String,
      lowercase: true,
      trim: true, 
      required: true,
    },
    image: {
      type: String,
      default: null,
    },
    groomingDetails: [
      {
        weightType: {
          type: String,
          required: true,
          maxlength: 100,
        },
        description: {
          type: String,
          maxlength: 300,
        },
        price: {
          type: Number,
          required: true,
        },
        country: {
          type: Schema.Types.ObjectId,
          ref: "Country",
        },
      },
    ],
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

subServiceSchema.index({ serviceTypeId: 1, name: 1 }, { unique: true });

export const SubServiceType = mongoose.model("SubServiceType", subServiceSchema);
