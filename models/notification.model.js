import mongoose, {Schema} from "mongoose";

const notificationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["Order", "Booking", "Cancel", "General"],
    default: "General",
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
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
});

export const Notification = mongoose.model("Notification", notificationSchema);
