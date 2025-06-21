import mongoose, { Schema } from "mongoose";


const serviceSchema = new Schema(
    {user: [{
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      }],
      name: {
        type: String,
        lowercase: true,
        required: true,
      },
      image: {
        type: String,
        required : true
      },
      description: {
        type: String,
        maxlength: 250,
        default: null,
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


export const ServiceType = mongoose.model("ServiceType", serviceSchema);