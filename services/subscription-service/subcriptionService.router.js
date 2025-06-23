import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { adminOnly } from "../../middlewares/role.middleware.js";
import multer from "../../middlewares/multer.middleware.js";
import {
    createServiceType,
    getAllServiceTypes,
    getServiceTypeById,
    updateServiceType,
    deleteServiceType,
} from "./subscriptionService.controller.js"


const router = Router()

router.route("/create-subscription").post(verifyJWT, adminOnly, multer.uploadSingle("image"), createServiceType)
router.route("/update-subscription/:id").put(verifyJWT, adminOnly, multer.uploadSingle("image"), updateServiceType)
router.route("/get-subscription-by-id/:id").get(verifyJWT, adminOnly, getServiceTypeById)
router.route("/get-all-subscription").post(verifyJWT, adminOnly, getAllServiceTypes)
router.route("/delete-subscription:id").delete(verifyJWT, adminOnly, deleteServiceType)

export default router;