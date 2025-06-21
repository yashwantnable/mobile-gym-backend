import { Router } from "express";
import { verifyJWT } from "../../../middlewares/auth.middleware.js";
import {
  sendMessage,
  getMessageHistory,
  markMessageAsRead,
} from "./chat.controller.js";

const router = Router();

router.route("/send-message").post(verifyJWT, sendMessage);
router.route("/mark-as-read").post(verifyJWT, markMessageAsRead);
router.route("/get-message-history").post(verifyJWT, getMessageHistory);

export default router;
