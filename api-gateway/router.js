import { Router } from "express";
import userRouter from "../services/user-service/user.router.js";
import masterRouter from "../services/master-service/master.router.js";
import authRouter from "../services/auth-service/auth.router.js";
import petRouter from "../services/Pet-service/pet.router.js"
import subserviceRouter from "../services/SubService-service/subService.router.js"
import breedRouter from "../services/master-service/master.router.js"
import petTypeRouter from "../services/master-service/master.router.js"
import trainerRouter from "../services/trainer-service/trainer.router.js"
import adminRouter from "../services/admin-service/admin.router.js"
import managerRouter from "../services/manager-service/manager.router.js"
import timeslotRouter from "../services/timeSlot-service/timeSlot.router.js"
import cartRouter from "../services/cart-service/cart.router.js";
import currencyRouter from "../services/currency-service/currency.router.js";
import orderRouter from "../services/order-service/order.router.js"
import paymentRouter from "../services/payment-service/payment.router.js"
import bookingrouter from "../services/booking-service/booking.router.js";


const router = Router();

router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/master", masterRouter);
router.use("/pet", petRouter);
router.use("/subservice", subserviceRouter)
router.use("/breed", breedRouter)
router.use("/petType", petTypeRouter)
router.use("/trainer", trainerRouter)
router.use("/admin", adminRouter)
router.use("/manager", managerRouter)
router.use("/timeslot", timeslotRouter)
router.use("/cart", cartRouter)
router.use("/currency", currencyRouter)
router.use("/order", orderRouter)
router.use("/payment", paymentRouter)
router.use("/booking", bookingrouter)

export default router;
