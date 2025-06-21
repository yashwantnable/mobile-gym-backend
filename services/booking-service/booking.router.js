import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { 
    createManualBooking,
    updateManualBooking,
    getAllBookings,
    getBookingById,
    deleteBooking
} from "./booking.controller.js";

const router = Router();


router.route("/create-manual-booking").post(verifyJWT, createManualBooking);
router.route("/update-booking/:bookingId").put(verifyJWT, updateManualBooking);
router.route("/get-all-bookings").get(verifyJWT, getAllBookings);
router.route("/get-booking/:bookingId").get(verifyJWT, getBookingById);
router.route("/delete-booking/:bookingId").delete(verifyJWT, deleteBooking);
// router.route("/confirmTimeslotBooking/:timeslotId").post(verifyJWT, confirmTimeslotBooking)

export default router;