import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import multer from "../../middlewares/multer.middleware.js";
import { adminOnly } from "../../middlewares/role.middleware.js";

import {
  createRole,
  updateRole,
  // getRoleById,
  getAllRole,
  getAllActiveRole,
  createTenure,
  getAllTenure,
  getSingleTenure,
  updateTenure,
  deleteTenure,

  createTaxMaster,
  updateTaxMaster,
  getAllTaxMaster,
  getAllTax,
  getTaxMasterById,
  deleteTaxMaster,

  createLocationMaster,
updateLocationMaster,
getAllLocationMasters,
getAllLocations,
getLocationsByCountryAndCity,
getLocationMasterById,
deleteLocationMaster,

  createCountry,
  updateCountry,
  getAllCountry,
  getCountryById,
  deleteAllCountry,
  createCity,
  updateCity,
  getAllCity,
  getCityById,
  deleteAllCities,

  createSession,
  getAllSessions,
  getSessionById,
  updateSession,
  deleteSession,
  getAllCategory,
  createCategory,
  deleteCategory,
  updateCategory,
  getSingleCategory,
  getSessionsByCategoryId,
} from "./master.controller.js";

const router = Router();

//Tenure MAsters
router.route("/create-tenure").post(verifyJWT, adminOnly, createTenure);
router.route("/get-all-tenure").get(verifyJWT, getAllTenure);
router.route("/get-tenure-by-id/:id").get(verifyJWT, getSingleTenure);
router.route("/update-tenure/:id").put(verifyJWT, adminOnly, updateTenure);
router.route("/delete-tenure/:id").delete(verifyJWT, adminOnly, deleteTenure);

// // routes for Tax Master
router.route("/create-tax-master").post(verifyJWT, adminOnly, createTaxMaster);
router
  .route("/update-tax-master/:id")
  .put(verifyJWT, adminOnly, updateTaxMaster);
router.route("/get-tax-master/:id").get(verifyJWT, adminOnly, getTaxMasterById);
router.route("/get-all-tax-master").post(verifyJWT, getAllTaxMaster);
router.route("/get-all-tax").get(verifyJWT, getAllTax);
router
  .route("/delete-tax-master-by-id/:id")
  .delete(verifyJWT, adminOnly, deleteTaxMaster);

// // routes for location Master
router.route("/create-location-master").post(verifyJWT, adminOnly, createLocationMaster);
router.route("/update-location-master/:id").put(verifyJWT, adminOnly, updateLocationMaster);
router.get("/get-location-by-country-city",verifyJWT,adminOnly,getLocationsByCountryAndCity);
router.route("/get-location-master/:id").get(verifyJWT, adminOnly, getLocationMasterById);
router.route("/get-all-location-master").post(verifyJWT, getAllLocationMasters);
router.route("/delete-location-master-by-id/:id").delete(verifyJWT, adminOnly, deleteLocationMaster);

//session masters
router
  .route("/create-session")
  .post(verifyJWT, adminOnly, multer.uploadSingle("image"), createSession);
router.route("/get-all-sessions").get(getAllSessions);
router.route("/get-session-by-id/:id").get(getSessionById);
router.get("/get-session-by-category-id/:categoryId",  getSessionsByCategoryId);

router
  .route("/update-session/:id")
  .put(verifyJWT, adminOnly, multer.uploadSingle("image"), updateSession);
router.route("/delete-session/:id").delete(verifyJWT, adminOnly, deleteSession);

//category masters
router.route("/create-category").post(verifyJWT,multer.uploadSingle("image"), adminOnly, createCategory);
router.route("/get-all-categories").get(getAllCategory);
router
  .route("/delete-category/:id")
  .delete(verifyJWT, adminOnly, deleteCategory);
router.route("/update-category/:id").put(verifyJWT,multer.uploadSingle("image"), adminOnly, updateCategory);
router.route("/get-category-by-id/:id").get(verifyJWT, getSingleCategory);

router.route("/create-role").post(createRole);
router.route("/update-role/:id").put(verifyJWT, adminOnly, updateRole);
router.route("/get-all-role").post(verifyJWT, getAllRole);
// router.route("/get-role-by-id/:id").get(verifyJWT, getRoleById);
router.route("/get-active-role").get(verifyJWT, getAllActiveRole);

// // routes for Country
router.route("/create-country").post(createCountry);
router.route("/update-country/:countryId").put(updateCountry);
router.route("/get-all-country").get(getAllCountry);
router.route("/get-country/:id").get(getCountryById);
router.route("/delete-all-country").delete(deleteAllCountry);

// // routes for City
router.route("/create-city").post(createCity);
router.route("/update-city/:cityId").put(updateCity);
router.route("/get-all-city/:countryId").get(getAllCity);
router.route("/get-city/:id").get(getCityById);
router.route("/delete-all-city").delete(deleteAllCities);



export default router;
