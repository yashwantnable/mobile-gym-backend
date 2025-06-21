import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import multer from "../../middlewares/multer.middleware.js"
import {
    customercreatePet,
    customerupdatePet,
    customerfindPetById,
    customerfindAllPets,
    customerdeletePet
} from "./customerPet.controller.js"


const router = Router()

router.route("/customerCreatePet").post(verifyJWT, multer.uploadFields([{ name: "image", maxCount: 10 },{ name: "document", maxCount: 10 },]),customercreatePet);
router.route("/customerUpdatePet/:petId").put(verifyJWT, multer.uploadFields([{ name: "image", maxCount: 10 },{ name: "document", maxCount: 10 },]),customerupdatePet);
router.route("/customerFindPetById/:petId").get(verifyJWT, customerfindPetById)
router.route("/customerFindallpet").post(verifyJWT, customerfindAllPets)
router.route("/customerDeletePet/:petId").delete(verifyJWT, customerdeletePet)

export default router;