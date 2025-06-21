import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import multer from "../../middlewares/multer.middleware.js";
import { adminOnly } from "../../middlewares/role.middleware.js";

import {
  createRole,
  updateRole,
  getRoleById,
  getAllRole,
  getAllActiveRole,
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
  createServiceType,
  getAllServiceTypes,
  getServiceTypeById,
  updateServiceType,
  deleteServiceType,
  createBreed,
  updateBreed,
  getBreedById,
  getAllBreed,
  deleteBreed,
  createPetType,
  updatePetType,
  getPetType,
  getAllPetTypes,
  deletePetType,
  createTaxMaster,
  updateTaxMaster,
  getAllTaxMaster,
  getAllTax,
  getTaxMasterById,
  deleteTaxMaster,
  createExtraCharge,
  updateExtraCharge,
  getExtraChargeById,
  getAllExtraCharges,
  deleteExtraCharge,
  createVaccine,
  getAllVaccines,
  getVaccineById,
  updateVaccine,
  deleteVaccine
} from "./master.controller.js";

const router = Router();



router.route("/create-role").post(verifyJWT, adminOnly, createRole);
router.route("/update-role/:id").put(verifyJWT, adminOnly, updateRole);
router.route("/get-all-role").post(verifyJWT, getAllRole);
router.route("/get-role-by-id/:id").get(verifyJWT, getRoleById);
router.route("/get-active-role").get(verifyJWT, getAllActiveRole);

// routes for Country
router.route("/create-country").post(createCountry);
router.route("/update-country/:countryId").put(updateCountry);
router.route("/get-all-country").get(getAllCountry);
router.route("/get-country/:id").get(getCountryById);
router.route("/delete-all-country").delete(deleteAllCountry);

// routes for City
router.route("/create-city").post(createCity);
router.route("/update-city/:cityId").put(updateCity);
router.route("/get-all-city/:countryId").get(getAllCity);
router.route("/get-city/:id").get(getCityById);
router.route("/delete-all-city").delete(deleteAllCities);

//service route
router.route("/create-service").post(verifyJWT,adminOnly, multer.uploadSingle("image"), createServiceType);
router.route("/get-all-services").get(verifyJWT, adminOnly, getAllServiceTypes);
router.route("/get-service/:id").get(verifyJWT,adminOnly, getServiceTypeById);
router.route("/update-service/:id").put(verifyJWT, adminOnly, multer.uploadSingle("image"), updateServiceType);
router.route("/delete-service/:id").delete(verifyJWT, adminOnly, deleteServiceType);

//Breed route
router.route("/create-breed").post(createBreed);
router.route("/update-breed/:breedId").put(updateBreed);
router.route("/get-all-breed").get(getAllBreed);
router.route("/get-breed/:breedId").get(getBreedById);
router.route("/delete-breed/:id").delete(deleteBreed);

//Petype route
router.route("/create-petType").post(createPetType);
router.route("/update-PetType/:PetTypeId").put(updatePetType);
router.route("/get-all-PetType").get(getAllPetTypes);
router.route("/get-PetType/:PetTypeId").get(getPetType);
router.route("/delete-PetType/:id").delete(deletePetType);


// routes for Tax Master
router.route("/create-tax-master").post(verifyJWT, adminOnly, createTaxMaster)
router.route("/update-tax-master/:id").put(verifyJWT, adminOnly, updateTaxMaster)
router.route("/get-tax-master/:id").get(verifyJWT, adminOnly, getTaxMasterById)
router.route("/get-all-tax-master").post(verifyJWT, getAllTaxMaster)
router.route("/get-all-tax").get(verifyJWT, getAllTax)
router.route("/delete-tax-master-by-id/:id").delete(verifyJWT, adminOnly, deleteTaxMaster)


// extra price
router.route("/create-extra-charge").post(verifyJWT, adminOnly,createExtraCharge);
router.route("/update-extra-charge/:id").put(verifyJWT, adminOnly,updateExtraCharge);
router.route("/get-extra-charge/:id").get(verifyJWT, adminOnly,getExtraChargeById);
router.route("/get-all-extra-charges").get(verifyJWT, adminOnly,getAllExtraCharges);
router.route("/delete-extra-charge/:id").delete(verifyJWT, adminOnly,deleteExtraCharge);

// vaccine type
router.route("/create-vaccine").post(verifyJWT, adminOnly,createVaccine);
router.route("/update-vaccine/:id").put(verifyJWT, adminOnly,updateVaccine);
router.route("/get-vaccine/:id").get(verifyJWT, adminOnly,getVaccineById);
router.route("/get-all-vaccine").get(verifyJWT, adminOnly,getAllVaccines);
router.route("/delete-vaccine/:id").delete(verifyJWT, adminOnly,deleteVaccine);

export default router;
