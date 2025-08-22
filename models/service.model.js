import mongoose, { Schema } from "mongoose";


const sessionSchema = new Schema(
    {
      categoryId: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        default: null,
      },
      sessionName: {
        type: String,
        lowercase: true,
        required: true,
      },
       description: {
      type: String,
      trim: true,
    },
      image: {
        type: String,
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


export const Session = mongoose.model("Session", sessionSchema);