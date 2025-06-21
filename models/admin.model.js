import mongoose, { Schema } from "mongoose";

const promoCodeSchema = new Schema(
  {
    code: {
      type: String,
      maxlength: 250,
      required: true,
    },
    discountType: {
      type: String,
      enum: ["Percentage", "Fixed_Amount"],
      required: true,
    },

    usedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    
    discountValue: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0.0,
    },
    description: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: false,
    },


    is_validation_date: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },

    apply_offer_after_orders: {
      type: Number,
      default: 0,
    },

    minOrderAmount: {
      type: Schema.Types.Decimal128,
      default: 0.0,
    },
    maxDiscountAmount: {
      type: Schema.Types.Decimal128,
      default: 0.0,
    },
    maxUses: {
      type: Schema.Types.Decimal128,
      default: 0.0,
      required : true
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
  {
    timestamps: true,
    versionKey: false
  }
);

export const PromoCode = mongoose.model("PromoCode", promoCodeSchema);