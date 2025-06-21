import mongoose, { Schema, Types } from "mongoose";

const holidaySchema = new Schema({
    groomer: {
      type: Types.ObjectId,
      ref: 'User',
      required: false
    },
    startDate: {
     type: Date,
     required: true
    },
    endDate: {
     type: Date,
     required: true },
    reason: {
     type: String
    }
  },
  { timestamps: true,
    versionKey: false
  }
);

export const Holiday = mongoose.model("Holiday", holidaySchema);