import { Notification } from "../../models/notification.model.js";
import { socketService } from "../../app.js";

class NotificationService {
  /**
   * Core notification sender — used internally.
   * @param {Object} options
   */
  async sendNotification({ userId, title, message, type = "General" }) {
    if (!userId || !title || !message) {
      throw new Error("Notification requires userId, title, and message");
    }

    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
    });

    socketService.emitToUser(userId, "notification", notification);

    return notification;
  }

  /**
   * Send a notification to a customer
   * @param {Object} options
   */
  async sendToCustomer({ userId, title, message, type = "General" }) {
    return this.sendNotification({ userId, title, message, type });
  }

  /**
   * Send a notification to a groomer
   * @param {Object} options
   */
  async sendToTrainer({ userId, title, message, type = "General" }) {
    return this.sendNotification({ userId, title, message, type });
  }
}

export default new NotificationService();
