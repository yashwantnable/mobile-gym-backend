import cron from "node-cron";
import { sendClassRemindersService, sendUpcomingClassReminders } from "../services/user-service/user.controller.js";


cron.schedule("*/10 * * * *", async () => {
  try {
    await sendClassRemindersService(); // Call directly
    // await sendUpcomingClassReminders(); // Call directly
    console.log("✅ Sent class reminders.");
  } catch (err) {
    console.error("❌ Reminder failed:", err.message);
  }
});
