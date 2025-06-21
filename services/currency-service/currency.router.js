import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import {
    createCurrency,
    updateCurrency,
    getAllCurrency,
    getCurrencyById,
    deleteCurrency,
    createOrUpdateExchange,
    getAllExchanges,
    getExchangeById,
    deleteExchange
} from "./currency.controller.js";

const router = Router();

router.route("/create-currency").post(verifyJWT, createCurrency);
router.route("/update-currency/:id").put(verifyJWT, updateCurrency);
router.route("/get-currency-by-id/:id").get(verifyJWT, getCurrencyById);
router.route("/get-all-currencies").get(verifyJWT, getAllCurrency);
router.route("/delete-currency/:id").delete(verifyJWT, deleteCurrency);
router.route("/createOrUpdateExchange").post(verifyJWT, createOrUpdateExchange);
router.route("/getExchangeById/:id").get(verifyJWT, getExchangeById);
router.route("/getAllExchanges").get(verifyJWT, getAllExchanges);
router.route("/deleteExchange/:id").delete(verifyJWT, deleteExchange);

export default router;