import mongoose, { Schema } from "mongoose";

const subServiceRatingReviewSchema = new Schema(
  {
    subService: {
      type: Schema.Types.ObjectId,
      ref: "SubServiceType",
      // required : true
      default : null
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    orderId : {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default : null,
    },
    groomer : {
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
async function updateSubServiceAverageRating(RatingReview, subServiceId) {
  const result = await RatingReview.aggregate([
    { $match: { subService: subServiceId, rating: { $ne: 0 } } },
    { $group: { _id: "$subService", averageRating: { $avg: "$rating" } } },
  ]);

  if (result.length > 0) {
    const average_rating = result[0].averageRating;
    await mongoose
      .model("SubServiceType")
      .findByIdAndUpdate(subServiceId, { average_rating });
  }
}

// Hook: After Save
subServiceRatingReviewSchema.post("save", async function (doc) {
  const RatingReview = this.constructor;
  await updateSubServiceAverageRating(RatingReview, doc.subService);
});

// Hook: After findOneAndUpdate
subServiceRatingReviewSchema.post("findOneAndUpdate", async function (doc) {
  const RatingReview = this.model;
  await updateSubServiceAverageRating(RatingReview, doc.subService);
});


export const SubServiceRatingReview = mongoose.model("SubServiceRatingReview",subServiceRatingReviewSchema);
