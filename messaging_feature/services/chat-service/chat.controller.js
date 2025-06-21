import {ChatMessage} from "../../../models/message.model.js"
import { socketService } from "../../../app.js";
import notificationService from "../NotificationService.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { ApiError } from "../../../utils/ApiError.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

// POST /send-message
export const sendMessage = asyncHandler(async (req, res) => {
  const { from, to, orderDetailsId, message } = req.body;

  if (!from || !to || !orderDetailsId || !message) {
    throw new ApiError(400, "Missing required fields: from, to, orderDetailsId, message");
  }

  // Save message to database
  const newMessage = await ChatMessage.create({
    from,
    to,
    orderDetailsId,
    message,
  });

  // Emit message to recipient via socket
  socketService.emitToUser(to, "receiveMessage", newMessage);

  // Send notification to recipient
  // await notificationService.sendNotification({
  //   userId: to,
  //   title: "New Chat Message",
  //   message,
  //   type: "Chat",
  // });

  return res
    .status(201)
    .json(new ApiResponse(201, newMessage, "Message sent successfully"));
});

export const markMessageAsRead = asyncHandler(async (req, res) => {
  const { messageId } = req.body;

  if (!messageId) {
    throw new ApiError(400, "Missing messageId");
  }

  const message = await ChatMessage.findById(messageId);

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  message.isRead = true;
  await message.save();

  socketService.emitToUser(message.from, "messageRead", {
    messageId: message._id,
    by: message.to,
  });

  return res.status(200).json(new ApiResponse(200, message, "Message marked as read"));
});

// GET /get-message-history
export const getMessageHistory = asyncHandler(async (req, res) => {
  const { orderDetailsId,from, to } = req.body;
  if (!orderDetailsId || !from || !to) {
    throw new ApiError(400, "Missing required fields: orderDetailsId, from, to");
  }

  // Fetch message history between the two users for the order
  const messages = await ChatMessage.find({
    orderDetailsId,
    $or: [
      { from, to },
      { from: to, to: from },
    ],
  }).sort({ sentAt: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, messages, "Message history fetched successfully"));
});
