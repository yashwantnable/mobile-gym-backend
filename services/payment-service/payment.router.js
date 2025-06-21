import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import {createPayment} from "../../services/payment-service/payment.controller.js"

const router = Router()

router.route("/create-payment").post(verifyJWT, createPayment)


export default router