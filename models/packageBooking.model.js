import mongoose from "mongoose";

const joinClassSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription",
  },
  className: String,
  classDetails: {
    name: String,
    description: String,
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trainer"
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location"
    },
    date: Date,
    startTime: String,
    endTime: String
  }
}, { _id: false });

const packageBookingSchema = new mongoose.Schema(
  {
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joinClasses: [joinClassSchema],
    activate: { type: Boolean, default: false },
    isFinished: { type: Boolean, default: false },

    firstActivatedAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    expired: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Automatically update `expired` status
packageBookingSchema.pre("save", function (next) {
  if (this.expiredAt && new Date() > this.expiredAt) {
    this.expired = true;
  } else {
    this.expired = false;
  }
  next();
});

export const PackageBooking = mongoose.model("PackageBooking", packageBookingSchema);
