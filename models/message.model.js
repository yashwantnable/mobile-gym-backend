import mongoose, { Schema } from "mongoose";
// const { Schema } = mongoose;

const MessageSchema = new Schema(
  {
    from: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    to: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderDetailsId: {
      type: Schema.Types.ObjectId,
      ref: "OrderDetails",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
       type: Boolean, 
       default: false 
      },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const ChatMessage = mongoose.model("Message", MessageSchema);
