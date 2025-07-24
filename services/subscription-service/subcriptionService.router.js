import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { adminOnly, trainerOnly } from "../../middlewares/role.middleware.js";
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
  trainerCheckin,
  trainerCheckOut,
  getTrainerAssignedSubscriptions
  
} from "./subscriptionService.controller.js";

const router = Router();
router.post("/subscription-check-in/:subscriptionId",verifyJWT,  trainerCheckin);
router.post("/subscription-check-out/:subscriptionId",verifyJWT, trainerCheckOut);

router.get("/get-subscriptions-by-loc-id/:locationId", getSubscriptionsByLocationId);
router.post("/get-subscriptions-filter", filterAndSortSubscriptions);
router.post("/get-trainer-Assigned-Subscriptions-filters",verifyJWT, getTrainerAssignedSubscriptions);
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
