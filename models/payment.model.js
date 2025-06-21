import mongoose, {Schema} from "mongoose";

const paymentSchema = new mongoose.Schema(
  {

    // card_number: {
    //   type: Number,
    //   required: true,
    // },
    // month: {
    //   type: String,
    //   default: null,
    // },
    // date: {
    //   type: String,
    //   default: null,
    // },
    // cve: {
    //   type: String,
    //   default: null,
    // },
    is_success: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);
