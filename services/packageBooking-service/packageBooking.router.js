import { Router } from "express";
import { activatePackage, createPackageBooking, getAllPackageBookings, getPackageBookingById, getPackageBookingsByUserId, joinClassWithPackage } from "./packageBooking.controller.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";


const router = Router();

router.post("/create-package-booking", verifyJWT, createPackageBooking);
router.get("/package-booking-activation/:bookingId", verifyJWT, activatePackage);
router.post("/package-booking-join-class", verifyJWT, joinClassWithPackage);
router.get("/get-all-package-booking", verifyJWT, getAllPackageBookings); 
router.get("/get-package-booking-by-id/:id", verifyJWT, getPackageBookingById); 
router.get("/get-package-booking-by-user-id/:userId", verifyJWT, getPackageBookingsByUserId); 

export default router;