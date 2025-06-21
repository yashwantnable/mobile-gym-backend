import mongoose, { Schema } from "mongoose";

const CartSchema = new Schema(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceType",
      required: true,
    },
    subServiceId: {
      type: Schema.Types.ObjectId,
      ref: "SubServiceType",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value >= new Date().setHours(0, 0, 0, 0);
        },
        message: "Date must not be in the past.",
      },
    },
    timeslot: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "TimeSlot",
    },
    petTypeId: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "PetRegistration",
          required: true,
        },
      ],
      validate: {
        validator: function (value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "At least one pet must be selected.",
      },
    },
    // petTypeId: {
    //   type: Schema.Types.ObjectId,
    //   ref: "PetRegistration",
    //   required: true,
    // },
    pickupType: {
      type: String,
      enum: [
        "I'll Bring My Pet",
        "Pickup Required (+AED 20)",
        "DropOff Required (+AED 20)",
        "Both (+AED 35)",
      ],
      default: null,
    },
    petWeight: {
      type: String,
      // enum: ["Under 10 KG", "Over 10 KG"],
      required: true,
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
  { timestamps: true, versionKey: false }
);

export const Cart = mongoose.model("Cart", CartSchema);
