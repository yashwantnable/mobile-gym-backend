import mongoose, { Schema } from "mongoose";

const orderSchema = new Schema(
  {
    orderid: {
      type: String,
      maxlength: 250,
      unique: true,
      default: null,
    },
    invoice: {
      type: String,
      maxlength: 250,
      unique: true,
      default: null,
    },
    total_delivery_price: {
      type: Schema.Types.Decimal128,
      default: 0.0,
    },
    pay_type: {
      type: String,
      enum: ["CASH", "CARD", "ONLINE"],
      default: "ONLINE",
    },
    defaultAddress: {
      type: Schema.Types.ObjectId,
      ref: "Address",
      default: null,
    },

    order_date: {
      type: Date,
      default: Date.now,
    },
    paymentIntentId: {
      type: String,
      default: null,
    },
    promoCode: {
      type: Schema.Types.ObjectId,
      ref: "PromoCode",
      default: null,
    },
    promoCodeUsedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
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

orderSchema.statics.generateNextOrderId = async function () {
  const lastOrder = await this.findOne().sort({ orderid: -1 }).exec();
  const lastOrderId = lastOrder ? parseInt(lastOrder.orderid, 10) : 0;
  const nextOrderId = (lastOrderId + 1).toString().padStart(6, "0");
  return nextOrderId;
};

orderSchema.statics.generateNextInvoiceNumber = async function () {
  const lastOrder = await this.findOne({ invoice: { $ne: null } })
    .sort({ createdAt: -1 })
    .exec();
  const lastInvoiceNum = lastOrder
    ? parseInt(lastOrder.invoice.replace("INVOICE-", ""))
    : 0;
  const nextInvoiceNum = (lastInvoiceNum + 1).toString().padStart(6, "0");
  return `INVOICE-${nextInvoiceNum}`;
};
orderSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      this.orderid = await this.constructor.generateNextOrderId();
      this.invoice = await this.constructor.generateNextInvoiceNumber();
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

// OrderDetails Schema
const OrderDetailsSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    orderDetails: {
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
      // petTypeId: {
      //   type: Schema.Types.ObjectId,
      //   ref: "PetRegistration",
      //   required: true,
      // },
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
        required: true,
      },
    },
    groomer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["CONFIRMED", "PENDING", "REFUNDED"],
      default: "PENDING",
    },
    bookingStatus: {
      type: String,
      enum: ["NOT_STARTED", "IN_PROGRESS", "CANCEL","COMPLETED", "ON_THE_WAY","CANCELLED_BY_GROOMER", "CANCELLED_BY_CUSTOMER", "CANCEL_REQUESTED_BY_CUSTOMER","CHECKIN","CHECKOUT"],
      default: "NOT_STARTED",
    },
    applied_promocode: {
      type: Schema.Types.ObjectId,
      ref: "PromoCode",
      default: null,
    },
    defaultAddress: {
      type: Schema.Types.ObjectId,
      ref: "Address",
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
  { timestamps: true }
);

OrderDetailsSchema.index(
  {
    "orderDetails.date": 1,
    "orderDetails.timeslot": 1,
    "orderDetails.groomer": 1,
  },
  {
    unique: true,
    partialFilterExpression: { "orderDetails.groomer": { $ne: null } },
  }
);

export const Order = mongoose.model("Order", orderSchema);
export const OrderDetails = mongoose.model("OrderDetails", OrderDetailsSchema);
