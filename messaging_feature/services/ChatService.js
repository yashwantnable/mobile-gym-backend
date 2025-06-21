// import { Message } from "../../models/message.model.js";
// import { socketService } from "../../app.js";
// import notificationService from "./NotificationService.js";

// class ChatService {
//   async sendMessage({ from, to, orderDetailsId, message }) {
//     if (!from || !to || !orderDetailsId || !message) {
//       throw new Error("Missing required fields: from, to, orderDetailsId, message");
//     }

//     const newMessage = await Message.create({
//       from,
//       to,
//       orderDetailsId,
//       message,
//     });

//     socketService.emitToUser(to, "receiveMessage", newMessage);

//     await notificationService.sendNotification({
//       userId: to,
//       title: "New Chat Message",
//       message,
//       type: "Chat",
//     });

//     return newMessage;
//   }

//   async getMessages({ orderDetailsId, from, to }) {
//     if (!orderDetailsId || !from || !to) {
//       throw new Error("Missing required fields: orderDetailsId, from, to");
//     }

//     const messages = await Message.find({
//       orderDetailsId,
//       $or: [
//         { from, to },
//         { from: to, to: from },
//       ],
//     }).sort({ sentAt: 1 });

//     return messages;
//   }
// }

// export default new ChatService();
