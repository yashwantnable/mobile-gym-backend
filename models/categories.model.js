import mongoose, { Schema } from "mongoose";

const CategorySchema = new mongoose.Schema({
    cName: {
      type: String,
      required: true,
      unique: true,
    },
    cLevel: {
      type: String,
      required: true,
    },
})

export const CategoryModel = mongoose.model("Categories", CategorySchema);