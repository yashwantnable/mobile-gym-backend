import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { adminOnly } from "../../middlewares/role.middleware.js";
import { 
    createTimeslot,
    updateTimeslot,
    getTimeslotById,
    getAllTimeslots,
    getFreeGroomers,
    markOfficeHoliday,
    markGroomerHoliday,
    getAvailableTimeSlots,
    deleteTimeSlot
} from "./timeSlot.controller.js"


const router = Router()

router.route("/createTimeslot").post(verifyJWT, adminOnly, createTimeslot)
router.route("/updateTimeslot/:timeslotId").put(verifyJWT, adminOnly, updateTimeslot)
router.route("/getTimeslotById/:timeslotId").get(verifyJWT, getTimeslotById)
router.route("/getAllTimeslots").post(verifyJWT, getAllTimeslots)
router.route("/getFreeGroomers").post(verifyJWT, getFreeGroomers)
router.route("/deleteTimeslot/:timeslotId").delete(verifyJWT, adminOnly, deleteTimeSlot)

router.route("/getAvailableTimeSlots/:subServiceId").post(verifyJWT, getAvailableTimeSlots)
router.route("/markOfficeHoliday").post(verifyJWT, markOfficeHoliday)
router.route("/markGroomerHoliday").post(verifyJWT, markGroomerHoliday)


export default router