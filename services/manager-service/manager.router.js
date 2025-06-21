import { Router } from "express";
import multer from "../../middlewares/multer.middleware.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { adminOnly } from "../../middlewares/role.middleware.js";

import {
    createManager,
    updateManager,
    getAllManagers,
    getManagerById,
    deleteManager
} from "../manager-service/manager.controller.js"
const router = Router();


router.route("/create-manager").post(verifyJWT, adminOnly, multer.uploadSingle("profile_image"), createManager);
router.route("/get-all-manager").get(verifyJWT, adminOnly, getAllManagers);
router.route("/get-manager-by-id/:id").get(verifyJWT, adminOnly, getManagerById);
router.route("/update-manger/:id").put(verifyJWT, adminOnly, multer.uploadSingle("profile_image"), updateManager);
router.route("/delete-manager/:id").delete(verifyJWT, adminOnly, deleteManager);


export default router;