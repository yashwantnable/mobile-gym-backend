import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { swaggerOptions } from "./api-documentation/swagger.config.js";
import SocketService from "./messaging_feature/services/SocketService.js";
import router from "./api-gateway/router.js";
import { whiteListCors } from "./config/cors.config.js";


const app = express();
export const socketService = new SocketService();

// File path utilities
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log directory
const logDirectory = path.join(__dirname, "logs");

// Ensure log directory exists
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "logs", "access.log"),
  { flags: "a" }
);

// Middleware setup
app.use(
  cors({
    origin: whiteListCors,
    // origin: "*",
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(morgan("combined", { stream: accessLogStream }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(bodyParser.json());

// Swagger documentation setup
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes declaration
app.use("/test", (req, res) => {
  res.send("testing");
});
// app.use("/api/v1", chatRoutes);
app.use("/api/v1", router);

export default app;
