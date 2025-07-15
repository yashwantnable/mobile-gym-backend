import { Router } from "express";
import multer from "../../middlewares/multer.middleware.js"
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { adminOnly } from "../../middlewares/role.middleware.js";
import {customerOnly} from "../../middlewares/role.middleware.js"
import{
    updateUserStatus,
    createUser,
    updateUser,
    getAllUser,
    getUserById,
    deleteUser,
    // getAllCustomerService,
    getAllSubserviceByService,
    getSubserviceBySubServiceId,
    createAddress,
    updateAddress,
    getAllAddress,
    getAddressById,
    deleteAddress,
    createSubscriptionRatingReview,
    updateSubscriptionRatingReview,
    createTrainerRatingReview,
    updateTrainerRatingReview,
    getAllTrainerReviews,
    getTrainerRatingReviewByUser,
    calculateCartTotal,
    getAdminDetails,
    getAllNotification,
    updateNotification,
    updateAllNotification,
    getAllSubscriptionRatingReviews,
    getSubscriptionRatingReviewByUser,
    getAllSubscriptionsRatingReviews,
} from "./user.controller.js"

import {getAllArticals, getArticalById} from "../../services/admin-service/admin.controller.js"

const router = Router();

router.route("/update-user-status/:userId").patch(verifyJWT, adminOnly, updateUserStatus)
router.route("/create-user").post(verifyJWT, multer.uploadSingle("profile_image"), createUser);
router.route("/get-all-user").get(verifyJWT,  getAllUser);
router.route("/get-userby-id/:id").get(verifyJWT,  getUserById);
router.route("/update-user").put(verifyJWT, multer.uploadSingle("profile_image"), updateUser);
router.route("/delete-user/:id").delete(verifyJWT, adminOnly, deleteUser);

// router.route("/get-all-services").get(getAllCustomerService);
router.route("/get-all-sub-service/:serviceId").get(getAllSubserviceByService);
router.route("/get-sub-service/:subServiceId").get(getSubserviceBySubServiceId);

// routes for address
router.route("/create-address").post(verifyJWT, customerOnly, createAddress);
router.route("/update-address/:id").put(verifyJWT, customerOnly, updateAddress);
router.route("/get-address-by-id/:id").get(verifyJWT, customerOnly, getAddressById);
router.route("/get-all-address").get(verifyJWT, customerOnly, getAllAddress);
router.route("/delete-address/:id").delete(verifyJWT, customerOnly, deleteAddress);

router.route("/create-subscription-rating-review").post(verifyJWT,customerOnly,createSubscriptionRatingReview);
router.route("/update-subscription-review/:subscriptionId").put(verifyJWT,customerOnly, updateSubscriptionRatingReview);
// router.route("/delete-trainer-review-images/:id").patch(verifyJWT, customerOnly, updateTrainerRatingReview);
router.route("/get-rating-review/:subscriptionId").get(verifyJWT,getSubscriptionRatingReviewByUser);
router.route("/get-all-subscription-rating-review/:subscriptionId").get(getAllSubscriptionRatingReviews);
router.route("/get-all-subscription-rating-review").get(getAllSubscriptionsRatingReviews);

router.route("/create-trainer-rating-review").post(verifyJWT,customerOnly,createTrainerRatingReview);
router.route("/update-trainer-review/:trainerId").put(verifyJWT,customerOnly, updateTrainerRatingReview);
router.route("/get-trainer-review/:trainerId").get(verifyJWT, getTrainerRatingReviewByUser);
router.route("/get-all-trainer-reviews").get(verifyJWT, getAllTrainerReviews);


router.route("/cart-total-price-calculate").post(verifyJWT,customerOnly,calculateCartTotal);

router.route("/get-all-articals").get(verifyJWT, getAllArticals);
router.route("/get-artical/:id").get(verifyJWT, getArticalById);
router.route("/get-admin-details").get(getAdminDetails);

//notification
router.route("/get-all-notification").get(verifyJWT, getAllNotification);
router.route("/update-notification/:id").put(verifyJWT, updateNotification);
router.route("/update-all-notification").put(verifyJWT, updateAllNotification);
router.route("/cancel-by-customer/::orderDetailsId").put(verifyJWT, updateAllNotification);

export default router



