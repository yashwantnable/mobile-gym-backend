import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, lowercase: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    sessionType: { type: Schema.Types.ObjectId, ref: "Session", required: true },
    // duration: { type: Schema.Types.ObjectId, ref: "TenureModel", required: true },
     country: {
      type: Schema.Types.ObjectId,
      ref: "Country",
      default: null,
    },
    city: {
      type: Schema.Types.ObjectId,
      ref: "City",
      default: null,
    },
      streetName: {
        type: String,
        required: true,
      },
    price: { type: Number, required: true },
    // subscriptionLink: { type: String, default: null },
    media: { type: String, default: null },
    description: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    date: {
      type: [Date], // array to support single or range
      validate: {
        validator: (v) => v.length === 1 || v.length === 2,
        message: 'Date must be a single date or a range of two dates',
      },
      required: true,
    },
    startTime: { type: String, required: true }, // example: "09:00 AM"
    endTime: { type: String, required: true },   // example: "11:00 AM"
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);


export const Subscription = mongoose.model("Subscription", subscriptionSchema);
