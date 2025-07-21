import { Router } from "express";
import { activatePackage, createPackageBooking, getAllPackageBookings, getCustomersByPackageId, getMyJoinedClasses, getPackageBookingById, getPackageBookingsByUserId, joinClassWithPackage, markClassAttendance } from "./packageBooking.controller.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";


const router = Router();

router.post("/create-package-booking", verifyJWT, createPackageBooking);
router.get("/package-booking-activation/:bookingId", verifyJWT, activatePackage);
router.post("/package-booking-join-class", verifyJWT, joinClassWithPackage);
router.get("/get-all-package-booking", verifyJWT, getAllPackageBookings); 
router.get("/get-package-booking-by-id/:id", verifyJWT, getPackageBookingById); 
router.get("/get-package-booking-by-user-id/:userId", verifyJWT, getPackageBookingsByUserId); 
router.get("/get-customers-by-package--id/:packageId", verifyJWT, getCustomersByPackageId); 
router.get("/get-all-joined-classes-user", verifyJWT,   getMyJoinedClasses); 
router.post("/mark-attendance", verifyJWT, markClassAttendance);

export default router;