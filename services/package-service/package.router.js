import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { adminOnly } from "../../middlewares/role.middleware.js";
import multer from "../../middlewares/multer.middleware.js";

import {
  createPackage,
  updatePackage,
  deletePackage,
  getAllPackages,
  getPackageById,
} from "./package.controller.js";

const router = Router();

// Admin protected routes
router.post("/create-package", verifyJWT, adminOnly, multer.uploadSingle("image"), createPackage);
router.put("/update-package/:id", verifyJWT, adminOnly, multer.uploadSingle("image"), updatePackage);
router.delete("/delete-package/:id", verifyJWT, adminOnly, deletePackage);

// Public routes
router.get("/get-all-packages", getAllPackages);
router.get("/get-package-by-id/:id", getPackageById);

export default router;
