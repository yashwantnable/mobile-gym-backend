import mongoose, { Schema } from "mongoose";

const vaccineScheduleSchema = new mongoose.Schema(
  {
    pet: {
      type: Schema.Types.ObjectId,
      ref: "PetRegistration",
      required: true,
    },
    vaccineName: {
      type: Schema.Types.ObjectId,
      ref: "Vaccine",
      required: true,
    },
    batchNumber: {
      type: String,
      lowercaser: true,
      defualt: null,
    },
    vaccinationDate: {
      // type: Date,
      // required: true,
      type: Date,
      required: true,
      validate: {
        validator: function (v) {
          if (this.dueDate) {
            return v <= this.dueDate;
          }
          return true;
        },
        message: "Vaccination date cannot be later than due date.",
      },
    },
    dueDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["Pending", "Overdue", "Completed"],
      default: "Pending",
    },
    remark: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const VaccineSchedule = mongoose.model("VaccineSchedule",vaccineScheduleSchema);
