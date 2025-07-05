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
  getSubscriptionsByCoordinates,
  getSubscriptionsByDate,
  getSubscriptionsByTrainerId,
  getSubscriptionsByUserMiles,
  getSubscriptionsBySessionTypeId,
  filterAndSortSubscriptions,
  searchSubscriptions,
  getSubscriptionsByLocationId,
  
} from "./subscriptionService.controller.js";

const router = Router();

router.get("/get-subscriptions-by-loc-id/:locationId", getSubscriptionsByLocationId);
router.post("/get-subscriptions-filter", filterAndSortSubscriptions);
router.get("/search-subscriptions", searchSubscriptions);


router.post("/get-all-subscription/:categoryId",  getSubscriptionsByCategoryId);

router.get("/get-subscriptions-by-session/:sessionTypeId",  getSubscriptionsBySessionTypeId);

router.post("/get-subscriptions-by-date",  getSubscriptionsByDate);

router.get("/get-subscriptions-by-trainer/:trainerId", getSubscriptionsByTrainerId);

router.post("/get-subscriptions-by-coordinates", getSubscriptionsByUserMiles);

router.route("/create-subscription").post(verifyJWT, adminOnly, multer.uploadSingle("media"), createSubscription);

router.get("/subscriptions/nearby",verifyJWT,getSubscriptionsByCoordinates);

router.route("/update-subscription/:id").put(verifyJWT, adminOnly, multer.uploadSingle("media"), updateSubscription);

router.route("/get-subscription-by-id/:id").get(getSubscriptionById);

router.route("/get-all-subscription").post(getAllSubscription);

router.route("/delete-subscription/:id").delete(verifyJWT, adminOnly, deleteSubscription);

export default router;
