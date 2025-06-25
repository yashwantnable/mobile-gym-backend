import mongoose, { Schema } from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pet: {
      type: Schema.Types.ObjectId,
      ref: 'PetRegistration',
      required: true,
      // type: [
      //   {
      //     type: Schema.Types.ObjectId,
      //     ref: "PetRegistration",
      //     required: true,
      //   },
      // ],
    },
    serviceType: {
      type: Schema.Types.ObjectId,
      ref: "ServiceType",
      required: true,
    },
    subService: {
      type: Schema.Types.ObjectId,
      ref: "SubServiceType",
      required: true,
    },
    petWeight: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: Schema.Types.ObjectId,
      ref: "TimeSlot",
      required: true,
    },
    groomer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      // required: true,
      default: null,
    },
    orderDetailsId: {
      type: Schema.Types.ObjectId,
      ref: "OrderDetails",
      // required: true,
      default: null,
    },
    price: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Inprogress", "Cancelled", "Completed"],
      default: "Pending",
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);


const subscriptionBookingSchema = new Schema({
  subscription: {
    type: Schema.Types.ObjectId,
    ref: "Subscription",
    required: true,
  },
  trainer: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  customer: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  timeSlot: {
    type: Schema.Types.ObjectId,
    ref: "TimeSlot", // or "Session" if you're using that model
    required: true,
  },
  status: {
    type: String,
    enum: ["ACTIVE", "CANCELLED", "COMPLETED"],
    default: "ACTIVE",
  },
}, {
  timestamps: true,
});

export const SubscriptionBooking = mongoose.model("SubscriptionBooking",subscriptionBookingSchema);
export const Booking = mongoose.model("Booking", bookingSchema);
