import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { adminOnly } from "../../middlewares/role.middleware.js";
import multer from "../../middlewares/multer.middleware.js";
import {
    createSubService,
    updateSubService,
    getSubServiceById,
    getAllSubService,
    deleteSubService
} from "./subService.controller.js"


const router = Router()

router.route("/createSubService").post(verifyJWT, adminOnly, multer.uploadSingle("image"), createSubService)
router.route("/updateSubService/:subServiceId").put(verifyJWT, adminOnly, multer.uploadSingle("image"), updateSubService)
router.route("/getSubServiceById/:subServiceId").get(verifyJWT, adminOnly, getSubServiceById)
router.route("/getAllSubService").post(verifyJWT, adminOnly, getAllSubService)
router.route("/deleteSubService/:subServiceId").delete(verifyJWT, adminOnly, deleteSubService)

export default router;