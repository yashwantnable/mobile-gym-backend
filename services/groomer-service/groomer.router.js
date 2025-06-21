import { Router } from "express";
import multer from "../../middlewares/multer.middleware.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { adminOnly,groomerOnly } from "../../middlewares/role.middleware.js";

import {
  createGroomer,
  getAllGroomers,
  getGroomerById,
  updateGroomer,
  deleteGroomer,
  updateGroomerStatus,

  createVaccineSchedule,
  updateVaccineSchedule,
  getVaccineScheduleById,
  getAllVaccineSchedules,
  deleteVaccineSchedule,
  getAllOrders,
  getAllAssignedJobs,
  getOrderDetailsById,
  // updateBookingStatus,
  updateGroomerProfileByGroomer,
  groomerCheckin,
  initiateCheckout,
  completeCheckout
} from "./groomer.controller.js";

const router = Router();

router.route("/update-groomer-status/:groomerId").patch(verifyJWT, adminOnly, updateGroomerStatus);
router.route("/create-groomer").post(verifyJWT, adminOnly, multer.uploadSingle("profile_image"), createGroomer);
router.route("/get-all-groomers").get(verifyJWT, adminOnly, getAllGroomers);
router.route("/get-groomerby-id/:id").get(verifyJWT, adminOnly, getGroomerById);
router.route("/update-groomer/:id").put(verifyJWT, adminOnly, multer.uploadSingle("profile_image"), updateGroomer);
router.route("/delete-groomer/:id").delete(verifyJWT, adminOnly, deleteGroomer);

//vaccine schedule
router.route("/create-vaccine-schedule").post(verifyJWT, groomerOnly, createVaccineSchedule);
router.route("/update-vaccine-schedule/:id").put(verifyJWT, groomerOnly, updateVaccineSchedule);
router.route("/get-vaccine-schedule/:id").get(verifyJWT, groomerOnly, getVaccineScheduleById);
router.route("/get-all-vaccine-schedules").get(verifyJWT, groomerOnly, getAllVaccineSchedules);
router.route("/delete-vaccine-schedule/:id").delete(verifyJWT, groomerOnly, deleteVaccineSchedule);

//get all orders
router.route("/get-all-orders").get(verifyJWT, groomerOnly, getAllOrders);

//get all assigned job
router.route("/get-all-assigned-jobs").post(verifyJWT, getAllAssignedJobs);
router.route("/get-all-order-by-id/:id").get(verifyJWT, getOrderDetailsById);
// router.route("/groomer-checkin-checkout/:orderDetailsId").post(verifyJWT, updateBookingStatus);
router.route("/update-groomer-profile-by-groomer/:id").put(verifyJWT, multer.uploadSingle("profile_image"), updateGroomerProfileByGroomer);

router.route("/checkin/:orderDetailsId").post(verifyJWT, groomerCheckin);
router.route("/initiate-checkout/:orderDetailsId").post(verifyJWT, initiateCheckout);
router.route("/complete-checkout/:orderDetailsId").post(verifyJWT, completeCheckout);

export default router;
