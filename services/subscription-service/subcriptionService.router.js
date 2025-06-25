import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { adminOnly } from "../../middlewares/role.middleware.js";
import multer from "../../middlewares/multer.middleware.js";
import {
  createSubscription,
  getAllSubscription,
  getSubscriptionById,
  updateSubscription,
  getSubscriptionsByCategoryId,
  deleteSubscription,
} from "./subscriptionService.controller.js";

const router = Router();

router.get("/get-subscription-by-category-id/:categoryId", verifyJWT, getSubscriptionsByCategoryId);

router
  .route("/create-subscription")
  .post(verifyJWT, adminOnly, multer.uploadSingle("media"), createSubscription);

router
  .route("/update-subscription/:id")
  .put(verifyJWT, adminOnly, multer.uploadSingle("media"), updateSubscription);

router
  .route("/get-subscription-by-id/:id")
  .get(verifyJWT, adminOnly, getSubscriptionById);
router
  .route("/get-all-subscription")
  .post(verifyJWT, getAllSubscription);
router
  .route("/delete-subscription/:id")
  .delete(verifyJWT, adminOnly, deleteSubscription);

export default router;
