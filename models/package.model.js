import mongoose, { Schema } from "mongoose";


const packageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true }, // File URL or path
  price: { type: Number, required: true },
  numberOfClasses: { type: Number, required: true },
  duration: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  }
}, { timestamps: true });

export const Package = mongoose.model("Package", packageSchema);