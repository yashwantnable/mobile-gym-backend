import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {Payment} from "../../models/payment.model.js"
import Stripe from "stripe";

const createPayment = asyncHandler(async (req, res) => {
  console.log("req.body", req.body);

  const { is_success } = req.body;



  const payment = await Payment.create({
    is_success,
  });

if (is_success) {
    return res.status(200).json(new ApiResponse(200, payment, "Payment processed successfully"));
  } else {
    throw new ApiError(400, "Payment failed");
  }
});

// export const createPaymentIntent = asyncHandler(async (req, res) => {
//   const { amount, currency = 'aed' } = req.body;

//   if (!amount) {
//     return res.status(400).json(new ApiError(400, "Amount is required"));
//   }

//   try {
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: Math.round(amount * 100),
//       currency,
//       metadata: { userId: req.user._id.toString() }
//     });

//     res.status(200).json(new ApiResponse(200, {
//       clientSecret: paymentIntent.client_secret,
//       paymentIntentId: paymentIntent.id
//     }, "PaymentIntent created successfully"));

//   } catch (err) {
//     console.error("createPaymentIntent error:", err);
//     res.status(500).json(new ApiError(500, err.message));
//   }
// });
export {
  createPayment,
};
