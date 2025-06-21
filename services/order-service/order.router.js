import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";

import {
    createOrder,
    updateOrder,
    getAllOrder,
    getAllOrderDetails
} from "../order-service/order.controller.js"

const router = Router();

router.route('/create-order').post(verifyJWT, createOrder);
router.route('/update-order').put(verifyJWT, updateOrder);
router.route('/get-all-order').get(verifyJWT, getAllOrder);
router.route('/get-order-detail/:orderId').get(verifyJWT, getAllOrderDetails);

export default router