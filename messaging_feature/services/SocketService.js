import { Server } from "socket.io";
import { whiteListCors } from "../../config/cors.config.js";
import mongoose from "mongoose";

class SocketService {
  constructor() {
    this._io = new Server({
      cors: {
        origin: whiteListCors,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });
  }

  // initListeners() {
  //   this._io.on("connection", (socket) => {
  //     console.log("User connected:", socket.id);

  //     socket.on("join", (userId) => {
  //       socket.join(userId);
  //       console.log(`User ${userId} joined their room`);
  //     });

  //     socket.on("disconnect", () => {
  //       console.log("User disconnected:", socket.id);
  //     });
  //   });
  // }

  initListeners() {
    try {
      this._io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        socket.on("join", (userId) => {
          try {
            socket.join(userId);
            console.log(`User ${userId} joined their room`);
            socket.emit("joined", {
              message: `Successfully joined room ${userId}`,
              room: userId,
            });
          } catch (err) {
            console.error(`Error in join event: ${err.message}`);
          }
        });

        socket.on("disconnect", () => {
          try {
            console.log("User disconnected:", socket.id);
          } catch (err) {
            console.error(`Error in disconnect event: ${err.message}`);
          }
        });
      });
    } catch (err) {
      console.error(`Error in initListeners: ${err.message}`);
    }
  }

  emitToUser(userId, event, payload) {
    this._io.to(userId.toString()).emit(event, payload);
  }
}

export default SocketService;
