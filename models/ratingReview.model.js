import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required : true,
      default : null
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    sessionId : {
      type: Schema.Types.ObjectId,
      ref: "Session",
      default : null,
    },
    trainer : {
      type: Schema.Types.ObjectId,
      ref: "User",
      default : null
    },
    review: {
      type: String,
      default: "",
      // maxlength :  [600, "Review must be 600 characters or fewer"],
    },

    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Average rating updater function
async function updateSubscriptionAverageRating(RatingReview, subServiceId) {
  const result = await RatingReview.aggregate([
    { $match: { subscriptionId: sessionId, rating: { $ne: 0 } } },
    { $group: { _id: "$subscription", averageRating: { $avg: "$rating" } } },
  ]);

  if (result.length > 0) {
    const average_rating = result[0].averageRating;
    await mongoose
      .model("subscription")
      .findByIdAndUpdate(subServiceId, { average_rating });
  }
}

// Hook: After Save
subscriptionSchema.post("save", async function (doc) {
  const RatingReview = this.constructor;
  await updateSubscriptionAverageRating(RatingReview, doc.subService);
});

// Hook: After findOneAndUpdate
subscriptionSchema.post("findOneAndUpdate", async function (doc) {
  const RatingReview = this.model;
  await updateSubscriptionAverageRating(RatingReview, doc.subService);
});


export const SubscriptionRatingReview = mongoose.model("SubscriptionRatingReview",subscriptionSchema);
