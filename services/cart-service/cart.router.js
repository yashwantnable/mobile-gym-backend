import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import {customerOnly} from "../../middlewares/role.middleware.js"
import {
    createCartItem,
    getAllCartItems,
    deleteCartItem
} from "./cart.controller.js";

const router = Router();

router.route("/create-cart").post(verifyJWT,createCartItem);
router.route("/get-all-cart").get(verifyJWT,getAllCartItems);
router.route("/delete-cart-item/:cartId").delete(verifyJWT,deleteCartItem);


export default router