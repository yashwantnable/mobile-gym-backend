import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import multer from "../../middlewares/multer.middleware.js";
import { adminOnly } from "../../middlewares/role.middleware.js";
import { 
    createBusinessType,
    updateBusinessType,
    getAllBusinessType,
    getBusinessTypeById,
    deleteBusinessType,
    createTaxMaster,
    updateTaxMaster,
    getAllTaxMaster,
    getAllTax,
    getTaxMasterById,
    deleteTaxMaster,

    createTaxRegime,
    updateTaxRegime,
    getTaxRegimeById,
    getAllTaxRegime,
    getAllTaxRegimes,

    createDocumentMaster,
    updateDocumentMaster,
    getAllDocumentMaster,
    getDocumentMasterById,
    deleteDocumentMaster,

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

    createDocument,
    updateDocument,
    getAllDocument,
    getDocumentById,
    deleteDocument,
    createLanguage,
    updateLanguage,
    getAllLanguage,
    getLanguageById,
    deleteLanguage,
    createTranslation,
    updateTranslation,
    getAllTranslation,
    getTranslationById,
    
    createCancellationReason,
    updateCancellationReason,
    getAllCancellationReason,
    getCancellationReasonById,
    deleteCancellationReason,

    createRole,
    updateRole,
    getRoleById,
    getAllRole,
    getAllActiveRole,
    createPermission,
    updatePermission,
    getAllPermissions,
    getPermissionById,
    getAllActivePermission,
    createComponentType,
    updateComponentType,
    getComponentTypeById,
    getAllComponentType,
    getAllActiveComponentType,
    createComponent,
    updateComponent,
    getAllComponent,
    getAllComponentList,
    getComponentById,
    getAllActiveComponent,
    createRolePermission,
    updateRolePermission,
    getAllRolePermission,
    getRolePermission,

    createDeliveryRegion,
    getAllDeliveryRegions,
    getAllRegionWithoutPagination,
    getDeliveryRegionById,
    updateDeliveryRegion,
    deleteDeliveryRegion,

    createVehicalType,
    getAllVehicalTypes,
    getVehicalTypeById,
    updateVehicalType,
    deleteVehicalType,

    createDeliveryType,
    getAllDeliveryTypes,
    getAllDeliveryTypesWithPagination,
    updateDeliveryType,
    getDeliveryTypeById,
    deleteDeliveryType,
    createDeliveryFee,
    getAllDeliveryFee,
    getAllDeliveryFeeWithPagination,
    getDeliveryFeeById,
    updateDeliveryFee,
    deleteDeliveryFee,

} from "./master.controller.js";

const router = Router();


// routes for business type
router.route("/create-business-type").post(verifyJWT, adminOnly, multer.uploadSingle('default_image'), createBusinessType)
router.route("/update-business-type/:id").put(verifyJWT, adminOnly, multer.uploadSingle('default_image'),updateBusinessType)
router.route("/get-business-type/:id").get(verifyJWT, adminOnly, getBusinessTypeById)
router.route("/get-all-business-type").get(getAllBusinessType)
router.route("/delete-business-type/:id").delete(verifyJWT, adminOnly, deleteBusinessType)

// routes for Tax Master
router.route("/create-tax-master").post(verifyJWT, adminOnly, createTaxMaster)
router.route("/update-tax-master/:id").put(verifyJWT, adminOnly, updateTaxMaster)
router.route("/get-tax-master/:id").get(verifyJWT, adminOnly, getTaxMasterById)
router.route("/get-all-tax-master").post(verifyJWT, getAllTaxMaster)
router.route("/get-all-tax").get(verifyJWT, getAllTax)
router.route("/delete-tax-master/:id").delete(verifyJWT, adminOnly, deleteTaxMaster)

// routes for Tax regime
router.route("/create-tax-regime").post(verifyJWT, adminOnly, createTaxRegime)
router.route("/update-tax-regime/:id").put(verifyJWT, adminOnly, updateTaxRegime)
router.route("/get-tax-regime/:id").get(verifyJWT, getTaxRegimeById)
router.route("/get-all-tax-regime").post(verifyJWT, getAllTaxRegime)
router.route("/get-all-tax-regime").get(verifyJWT, getAllTaxRegimes)

// routes for Document Master
router.route("/create-document-master").post(verifyJWT, adminOnly, createDocumentMaster)
router.route("/update-document-master/:id").put(verifyJWT, adminOnly, updateDocumentMaster)
router.route("/get-document-master/:id").get(verifyJWT, adminOnly, getDocumentMasterById)
router.route("/get-all-document-master").post(verifyJWT, adminOnly, getAllDocumentMaster)
router.route("/delete-document-master/:id").delete(verifyJWT, adminOnly, deleteDocumentMaster)

// routes for Country
router.route("/create-country").post(createCountry)
router.route("/update-country/:countryId").put(updateCountry)
router.route("/get-all-country").get(getAllCountry)
router.route("/get-country/:id").get(getCountryById)
router.route("/delete-all-country").delete(deleteAllCountry)

// routes for City
router.route("/create-city").post(createCity)
router.route("/update-city/:cityId").put(updateCity)                                  
router.route("/get-all-city/:countryId").get(getAllCity)                                  
router.route("/get-city/:id").get(getCityById)
router.route("/delete-all-city").delete(deleteAllCities)


// routes for Document
router.route("/create-document").post(verifyJWT, multer.uploadSingle('image'), createDocument)
router.route("/update-document/:id").put(verifyJWT, multer.uploadSingle('image'), updateDocument)
router.route("/get-document/:id").get(verifyJWT, getDocumentById)
router.route("/get-all-document/:userId?").get(verifyJWT, getAllDocument)
router.route("/delete-document/:id").delete(verifyJWT, deleteDocument)

// routes for Language 
router.route("/create-language").post(verifyJWT, adminOnly, createLanguage)
router.route("/update-language/:id").put(verifyJWT, adminOnly, updateLanguage)
router.route("/get-all-language").get(verifyJWT, adminOnly, getAllLanguage)
router.route("/get-language/:id").get(verifyJWT, adminOnly, getLanguageById)
router.route("/delete-language/:id").delete(verifyJWT, adminOnly, deleteLanguage)

// routes for Translation 
router.route("/create-translation").post(verifyJWT, adminOnly, createTranslation)
router.route("/update-translation").put(verifyJWT, adminOnly, updateTranslation)
router.route("/get-all-translation").get(verifyJWT, adminOnly, getAllTranslation)
router.route("/get-translation/:id").get(verifyJWT, adminOnly, getTranslationById)

// routes for cancellation reason 
router.route("/create-cancellation-reason").post(verifyJWT, adminOnly, createCancellationReason)
router.route("/update-cancellation-reason/:id").put(verifyJWT, adminOnly, updateCancellationReason)
router.route("/get-all-cancellation-reason").post(verifyJWT, adminOnly, getAllCancellationReason)
router.route("/get-cancellation-reason/:id").get(verifyJWT, adminOnly, getCancellationReasonById)
router.route("/delete-cancellation-reason/:id").delete(verifyJWT, adminOnly, deleteCancellationReason)

//routes for user role 
router.route("/create-role").post(verifyJWT, adminOnly, createRole)
router.route("/update-role/:id").put(verifyJWT, adminOnly, updateRole)
router.route("/get-all-role").post(verifyJWT, getAllRole)
router.route("/get-role-by-id/:id").get(verifyJWT, getRoleById)
router.route("/get-active-role").get(verifyJWT, getAllActiveRole)

//routes for permission
router.route("/create-permission").post(verifyJWT, adminOnly, createPermission)
router.route("/update-permission/:id").put(verifyJWT, adminOnly, updatePermission)
router.route("/get-all-permission").post(verifyJWT, getAllPermissions)
router.route("/get-permission-by-id/:id").get(verifyJWT, getPermissionById)
router.route("/get-all-active-permission").get(verifyJWT, getAllActivePermission)

//routes for component type
router.route("/create-component-type").post(verifyJWT, adminOnly, createComponentType)
router.route("/update-component-type/:id").put(verifyJWT, adminOnly, updateComponentType)
router.route("/get-all-component-type").post(verifyJWT, getAllComponentType)
router.route("/get-component-type/:id").get(verifyJWT, getComponentTypeById)
router.route("/get-active-component-type").get(verifyJWT, getAllActiveComponentType)

//routes for component
router.route("/create-component").post(verifyJWT, adminOnly, createComponent)
router.route("/update-component/:id").put(verifyJWT, adminOnly, updateComponent)
router.route("/get-all-component").post(verifyJWT, getAllComponent)
router.route("/get-all-component-list").get(verifyJWT, getAllComponentList)
router.route("/get-component/:id").get(verifyJWT, getComponentById)
router.route("/get-active-component").get(verifyJWT, getAllActiveComponent)

//routes for role permission
router.route("/create-role-permission").post(verifyJWT, adminOnly, createRolePermission)
router.route("/update-role-permission/:id").put(verifyJWT, adminOnly, updateRolePermission)
router.route("/get-all-role-permission").post(verifyJWT, getAllRolePermission)
router.route("/get-role-permission/:roleId").get(verifyJWT, getRolePermission)

//delivery region
router.route('/create-delivery-region').post(verifyJWT, createDeliveryRegion);
router.route('/update-delivery-region/:id').put(verifyJWT, updateDeliveryRegion);
router.route('/get-delivery-region-by-id/:id').get(verifyJWT, getDeliveryRegionById);
router.route('/get-all-delivery-regions').post(verifyJWT, getAllDeliveryRegions);
router.route('/get-all-delivery-regions-without-pagination').get(verifyJWT, getAllRegionWithoutPagination);
router.route('/delete-delivery-region/:id').delete(verifyJWT, deleteDeliveryRegion);
 
//vehical type
router.route('/create-vehical-type').post(verifyJWT, createVehicalType);
router.route('/update-vehical-type/:id').put(verifyJWT, updateVehicalType);
router.route('/get-vehical-type-by-id/:id').get(verifyJWT, getVehicalTypeById);
router.route('/get-all-vehical-types').post(verifyJWT, getAllVehicalTypes);
router.route('/delete-vehical-type/:id').delete(verifyJWT, deleteVehicalType);
 
//delivery type
router.route('/create-delivery-type').post(verifyJWT, createDeliveryType);
router.route('/get-all-delivery-types').get(verifyJWT, getAllDeliveryTypes);
router.route('/get-all-delivery-types-with-pagination').post(verifyJWT, getAllDeliveryTypesWithPagination);
router.route('/get-delivery-type-by-id/:id').get(verifyJWT, getDeliveryTypeById);
router.route('/update-delivery-type/:id').put(verifyJWT, updateDeliveryType);
router.route('/delete-delivery-type/:id').delete(verifyJWT, deleteDeliveryType);

//delivery fee
router.route('/create-delivery-fee').post(verifyJWT, createDeliveryFee);
router.route('/update-delivery-fee/:id').put(verifyJWT, updateDeliveryFee);
router.route('/get-all-delivery-fee').get(verifyJWT, getAllDeliveryFee);
router.route('/get-all-delivery-fee-with-pagination').post(verifyJWT, getAllDeliveryFeeWithPagination);
router.route('/get-delivery-fee-by-id/:id').get(verifyJWT, getDeliveryFeeById);
router.route('/delete-delivery-fee/:id').delete(verifyJWT, deleteDeliveryFee);



export default router;                                                                                                                                                                                  