import mongoose, { Schema } from "mongoose";

const PetRegistrationSchema = new mongoose.Schema(
  { userId: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    petName: {
      type: String,
      maxlength: 100,
      required: true,
    },
    image: {
      type: String,
    },
    petType: {
      type: Schema.Types.ObjectId,
      ref: "PetType",
      required: true,
    },
    breed: {
      type: Schema.Types.ObjectId,
      ref: "Breed",
      required: true,
    },
    dob: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female"],
    },
    weight: {
      type: Number,
      default: null,
    },
    activity_level: {
      type: String,
      enum: ["Lazy", "Fairly Active", "Often Active"],
    },
    day_Habits: {
      type: String,
      enum: ["At Home", "Outside", "Mix Of Both"],
    },
    personality: {
      type: String,
    },
    health_issues: {
      type: String,
    },
    special_care: {
      type: String,
    },
    document: {
      type: String,
    },
    microchip_number: {
      type: String,
    },
    warning: {
      type: String,
    },
    dietary_requirements: {
      type: String,
    },
    life_usage: {
      type: String,
    },
  },
  { timestamps: true,
    versionKey: false
  },
);

export const PetRegistration = mongoose.model("PetRegistration", PetRegistrationSchema);
