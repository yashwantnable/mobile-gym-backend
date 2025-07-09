import mongoose, { Schema } from "mongoose";

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
    joinClasses: [
      {
        classId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Subscription"
        },
        className: {
          type: String
        }
      }
    ],
    activate: { type: Boolean, default: false },
    isFinished: { type: Boolean, default: false },

    // 👇 New fields
    firstActivatedAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    expired: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// 👇 Pre-save hook to auto-update `expired` field
packageBookingSchema.pre("save", function (next) {
  if (this.expiredAt && new Date() > this.expiredAt) {
    this.expired = true;
  } else {
    this.expired = false;
  }
  next();
});

export const PackageBooking = mongoose.model("PackageBooking", packageBookingSchema);
