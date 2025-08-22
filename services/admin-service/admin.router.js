import { Router } from "express";
import multer from "../../middlewares/multer.middleware.js";
import upload from "../../middlewares/multer.middleware.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import {adminOnly} from "../../middlewares/role.middleware.js"

import {
      createPet,
      updatePet,
      findPetById,
      findAllPets,
      deletePet,
      createPromoCode,
      getPromoCodeById,
      updatePromoCode,
      deletePromoCode,
      getAllPromoCodes,
      getAllOrder,
      getDashboardData,
      getPetCountByType,
      getMonthWiseData,
      getPlannerDashboard,
      getAvailableGroomers,
      createArtical,
      getAllArticals,
      getArticalById,
      updateArtical,
      deleteArtical,
      getAvailableGroomersforBooking
} from "./admin.controller.js"

import {getAllSubscriptionRatingReviewsById} from "../../services/user-service/user.controller.js"

const router = Router()



router.route("/create-pet").post(verifyJWT, upload.uploadAny(),createPet);
router.route("/updatePet/:petId").put(verifyJWT, upload.uploadAny(), updatePet);
router.route("/findPetById/:petId").get(verifyJWT, findPetById)
router.route("/findallpet").post(verifyJWT, findAllPets)
router.route("/deletePet/:petid").delete(verifyJWT, deletePet)

router.route("/create-promo-code").post(verifyJWT,multer.uploadSingle("image"), createPromoCode);
router.route("/update-promo-code/:id").put(verifyJWT,multer.uploadSingle("image"),  updatePromoCode);
router.route("/get-promo-code-by-id/:id").get(verifyJWT, getPromoCodeById)
router.route("/get-all-promo-codes").post(verifyJWT, getAllPromoCodes)
router.route("/delete-promo-code/:id").delete(verifyJWT, deletePromoCode)

router.route("/get-all-subservice-rating-review/:subServiceId").get(verifyJWT,adminOnly,getAllSubscriptionRatingReviewsById);
router.route("/get-all-orders").get(verifyJWT,adminOnly,getAllOrder);


// Dashboard admin routes
router.route("/get-dashboard-details").get(verifyJWT,adminOnly,getDashboardData);
router.route("/get-pet-count-by-type").get(verifyJWT,adminOnly,getPetCountByType);
router.route("/get-month-wise-data").get(verifyJWT,adminOnly,getMonthWiseData);


//planner admin
router.route("/get-planner-dashboard").post(verifyJWT,adminOnly,getPlannerDashboard);
router.route("/get-all-available-groomers").post(verifyJWT,adminOnly,getAvailableGroomers);
router.route("/get-all-available-groomers-booking").post(verifyJWT,adminOnly,getAvailableGroomersforBooking);

// artical
router.route("/create-artical").post(verifyJWT, adminOnly, multer.uploadSingle("image"), createArtical);

router.route("/get-all-articals").get(verifyJWT, adminOnly, getAllArticals);

router.route("/get-artical/:id").get(verifyJWT, adminOnly, getArticalById);

router.route("/update-artical/:id").put(verifyJWT, adminOnly, multer.uploadSingle("image"), updateArtical);

router.route("/delete-artical/:id").delete(verifyJWT, adminOnly, deleteArtical);

export default router;