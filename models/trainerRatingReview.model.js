import mongoose, { Schema } from "mongoose";

const trainerRatingReviewSchema = new Schema(
    {
        trainer: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        session: {
            type: Schema.Types.ObjectId,
            ref: "SubServiceType",
            // required: true,
            default : null
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
            // maxlength: [600, "Review must be 600 characters or fewer"],
        },
        // sessionId: {
        //     type: Schema.Types.ObjectId,
        //     ref: "Session",
        //     // default: null,
        //     required : true
        // },
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

async function updateTrainerAverageRating(ReviewModel, trainerId) {
    const result = await ReviewModel.aggregate([
        { $match: { trainer: trainerId, rating: { $ne: 0 } } },
        { $group: { _id: "$trainer", averageRating: { $avg: "$rating" } } },
    ]);

    if (result.length > 0) {
        const average_rating = result[0].averageRating;
        await mongoose
            .model("User")
            .findByIdAndUpdate(trainerId, { average_rating });
    }
}

trainerRatingReviewSchema.post("save", async function (doc) {
    const ReviewModel = this.constructor;
    await updateTrainerAverageRating(ReviewModel, doc.trainer);
});

trainerRatingReviewSchema.post("findOneAndUpdate", async function (doc) {
    const ReviewModel = this.model;
    await updateTrainerAverageRating(ReviewModel, doc.trainer);
});


export const TrainerRatingReview = mongoose.model("trainerRatingReview", trainerRatingReviewSchema);