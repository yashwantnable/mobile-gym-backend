import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      default: null,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      default: "",
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

// Function to update average rating
async function updateSubscriptionAverageRating(RatingReview, subscriptionId) {
  const result = await RatingReview.aggregate([
    { $match: { subscriptionId, rating: { $ne: 0 } } },
    {
      $group: {
        _id: "$subscriptionId",
        averageRating: { $avg: "$rating" },
      },
    },
  ]);

  if (result.length > 0) {
    const average_rating = result[0].averageRating;
    await mongoose
      .model("Subscription")
      .findByIdAndUpdate(subscriptionId, { average_rating });
  }
}

// Hook after saving a review
subscriptionSchema.post("save", async function (doc) {
  const RatingReview = this.constructor;
  await updateSubscriptionAverageRating(RatingReview, doc.subscriptionId);
});

// Hook after updating a review
subscriptionSchema.post("findOneAndUpdate", async function (doc) {
  if (!doc) return;
  const RatingReview = this.model;
  await updateSubscriptionAverageRating(RatingReview, doc.subscriptionId);
});

export const SubscriptionRatingReview = mongoose.model(
  "SubscriptionRatingReview",
  subscriptionSchema
);
