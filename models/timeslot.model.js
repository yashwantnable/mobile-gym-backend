import mongoose, { Schema } from "mongoose";

const timeSlotSchema = new mongoose.Schema(
  {
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    travelTime: { 
      type: Number,
      default: 0
    },
    bookingDate: {
      type: Date,
      required: true
    },
    subservice: {
      type: Schema.Types.ObjectId,
      ref: "SubServiceType",
      required: true
    },
    subserviceName: {
      type: String,
      enum: [ "full" , "royal", "basic" ],
      required: true
    },
    groomer: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    specificDate: {
      type: Boolean,
      default: false
    },
    customDuration: { 
      type: Number
    },
    isBooked: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true,
    versionKey: false
  }
);

  
export const TimeSlot = mongoose.models.TimeSlot || mongoose.model("TimeSlot", timeSlotSchema);
