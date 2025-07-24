import "dotenv/config";
import http from "http";
import app, { socketService } from "./app.js";
import connectDB from "./config/db.config.js";
import "./cron/reminderCron.js";

const port = process.env.PORT || 5000;
const httpServer = http.createServer(app);

// Attach Socket.io to HTTP server
socketService._io.attach(httpServer);
socketService.initListeners();

connectDB()
  .then(() => {
    httpServer.listen(port, () => {
      console.log(`⚙️ Server running at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed!!!", err);
  });
