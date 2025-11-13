import { Notification } from "../../models/notification.model.js";
import { socketService } from "../../app.js";

class NotificationService {
  /**
   * Core notification sender
   */
  async sendNotification({ userId, title, message, type = "General" }) {
    if (!userId || !title || !message) {
      throw new Error("Notification requires userId, title, and message");
    }

    // 1️⃣ Save DB notification
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
    });

    // 2️⃣ Emit via Socket.IO
    socketService.emitToUser(userId, "notification", notification);

    // 3️⃣ Send FCM push notification
    await sendFirebasePush(userId, {
      title,
      body: message,
      data: { type },
    });

    return notification;
  }

  async sendToCustomer({ userId, title, message, type = "General" }) {
    return this.sendNotification({ userId, title, message, type });
  }

  async sendToTrainer({ userId, title, message, type = "General" }) {
    return this.sendNotification({ userId, title, message, type });
  }
}

export default new NotificationService();
