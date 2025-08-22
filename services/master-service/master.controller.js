import mongoose from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../../utils/cloudinary.js";
import {
  Category,
  City,
  Country,
  LocationMaster,
  TaxMaster,
  TenureModel,
} from "../../models/master.model.js";
import cities from "../../utils/seeds/cities.js";
import countries from "../../utils/seeds/countries.js";
import pagination from "../../utils/pagination.js";
import { UserRole } from "../../models/userRole.model.js";
import { Session } from "../../models/service.model.js";
import { Policy } from "../../models/policy.model.js";

// Create Tenure
const createTenure = asyncHandler(async (req, res) => {
  const { name, duration, description } = req.body;

  const requiredFields = { name, duration };

  const missingFields = Object.keys(requiredFields).filter(
    (field) => !requiredFields[field] || requiredFields[field] === "undefined"
  );

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json(
        new ApiError(400, `Missing required field: ${missingFields.join(", ")}`)
      );
  }

  const existingTenure = await TenureModel.findOne({ name });
  if (existingTenure) {
    return res.status(409).json(new ApiError(409, "Tenure already exists"));
  }

  const createdTenure = await TenureModel.create({
    name,
    duration,
    description,
    created_by: req.user?._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, createdTenure, "Tenure created successfully"));
});

// Get All Tenure
const getAllTenure = asyncHandler(async (req, res) => {
  const tenures = await TenureModel.find();
  return res
    .status(200)
    .json(new ApiResponse(200, tenures, "All tenures fetched successfully"));
});

// Get Single Tenure
const getSingleTenure = asyncHandler(async (req, res) => {
  if (!req.params.id || req.params.id === "undefined") {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const tenure = await TenureModel.findById(req.params.id);
  if (!tenure) {
    return res.status(404).json(new ApiError(404, "Tenure not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tenure, "Tenure fetched successfully"));
});

// Update Tenure
const updateTenure = asyncHandler(async (req, res) => {
  if (!req.params.id || req.params.id === "undefined") {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  if (Object.keys(req.body).length === 0) {
    return res
      .status(400)
      .json(new ApiError(400, "No data provided to update"));
  }

  const { name, duration, description } = req.body;

  const updatedTenure = await TenureModel.findByIdAndUpdate(
    req.params.id,
    { name, duration, description, updated_by: req.user?._id },
    { new: true }
  );

  if (!updatedTenure) {
    return res.status(404).json(new ApiError(404, "Tenure not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTenure, "Tenure updated successfully"));
});

// Delete Tenure
const deleteTenure = asyncHandler(async (req, res) => {
  if (!req.params.id || req.params.id === "undefined") {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const deleted = await TenureModel.findByIdAndDelete(req.params.id);
  if (!deleted) {
    return res.status(404).json(new ApiError(404, "Tenure not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Tenure deleted successfully"));
});

/////////////////////////////////////////////////////// Catagory ////////////////////////////////////////////////////////
// create Catagory
const createCategory = asyncHandler(async (req, res) => {
  console.log("req.body", req.body);

  const { cName, description } = req.body;
  const imageLocalPath = req.file?.path;

  const requiredFields = { cName,description };
  const missingFields = Object.keys(requiredFields).filter(
    (field) => !requiredFields[field] || requiredFields[field] === "undefined"
  );

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json(
        new ApiError(400, `Missing required field: ${missingFields.join(", ")}`)
      );
  }

  const existingCategory = await Category.findOne({ cName });
  if (existingCategory) {
    return res
      .status(409)
      .json(new ApiError(409, `Category is created already`));
  }

  // Upload image if provided
  let image = null;
  if (imageLocalPath) {
    const uploadedImage = await uploadOnCloudinary(imageLocalPath);
    if (!uploadedImage?.url) {
      return res
        .status(400)
        .json(new ApiError(400, "Error while uploading image"));
    }
    image = uploadedImage.url;
  }

  const createdCategory = await Category.create({
    cName,
    description,
    image,
  });

  console.log("createdCategory:", createdCategory);

  return res
    .status(201)
    .json(
      new ApiResponse(201, createdCategory, "Category created successfully")
    );
});

// get all Catagory
const getAllCategory = asyncHandler(async (req, res) => {
  const allCategories = await Category.find({});
  res
    .status(200)
    .json(
      new ApiResponse(200, allCategories, "all Categories fetched successfully")
    );
});

const deleteCategory = asyncHandler(async (req, res) => {
  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const deleteCategory = await Category.findByIdAndDelete(req.params.id);

  if (!deleteCategory) {
    return res.status(404).json(new ApiError(404, "Category not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Category deleted successfully"));
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id || id === "undefined") {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  if (Object.keys(req.body).length === 0 && !req.file) {
    return res
      .status(400)
      .json(new ApiError(400, "No data provided to update"));
  }

  const { cName,description } = req.body;
  const imageLocalPath = req.file?.path;

  let image = null;
  if (imageLocalPath) {
    const uploadedImage = await uploadOnCloudinary(imageLocalPath);
    if (!uploadedImage?.url) {
      return res
        .status(400)
        .json(new ApiError(400, "Error while uploading image"));
    }
    image = uploadedImage.url;
  }

  const updateFields = {
    updated_by: req.user?._id,
  };

  if (cName) updateFields.cName = cName;
  if (description) updateFields.description = description;
  if (image) updateFields.image = image;

  const updatedCategory = await Category.findByIdAndUpdate(
    id,
    updateFields,
    { new: true }
  );

  if (!updatedCategory) {
    return res.status(404).json(new ApiError(404, "Category not found"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedCategory, "Category updated successfully")
    );
});


//get single category
const getSingleCategory = asyncHandler(async (req, res) => {
  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json(new ApiError(404, "Category not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, category, "Category fetched successfully"));
});

/////////////////////////////////////////////////////// ROLE ////////////////////////////////////////////////////////
// Create role
const createRole = asyncHandler(async (req, res) => {
  console.log("req.body", req.body);

  const { name, role_id, active } = req.body;

  const requiredFields = { name, role_id };

  const missingFields = Object.keys(requiredFields).filter(
    (field) => !requiredFields[field] || requiredFields[field] === "undefined"
  );

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json(
        new ApiError(400, `Missing required field: ${missingFields.join(", ")}`)
      );
  }

  const existingRole = await UserRole.findOne({ role_id });
  if (existingRole) {
    return res
      .status(409)
      .json(new ApiError(409, `Role with role_id ${role_id} already exists`));
  }

  const createdRole = await UserRole.create({
    name,
    role_id,
    active,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, createdRole, "Role created successfully"));
});

// Update role
const updateRole = asyncHandler(async (req, res) => {
  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  if (Object.keys(req.body).length === 0) {
    return res
      .status(400)
      .json(new ApiError(400, "No data provided to update"));
  }

  const { name, role_id, active } = req.body;

  const updatedRole = await UserRole.findByIdAndUpdate(
    req.params.id,
    {
      name,
      role_id,
      active,
    },
    { new: true }
  );

  if (!updatedRole) {
    return res.status(404).json(new ApiError(404, "Role not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedRole, "Role updated successfully"));
});

// get all Role
const getAllRole = asyncHandler(async (req, res) => {
  const { search = "" } = req.query;
  const { filter = {}, page, limit, sortOrder } = req.body;

  let searchCondition = {};

  if (search && search !== "undefined") {
    const regex = new RegExp(search, "i");
    searchCondition = {
      $or: [{ name: { $regex: regex } }],
    };
  }

  const combinedFilter = {
    ...filter,
    ...searchCondition,
  };

  const aggregations = [
    {
      $match: combinedFilter,
    },
  ];

  const { newOffset, newLimit, totalPages, totalCount, newSortOrder } =
    await pagination(UserRole, page, limit, sortOrder, aggregations);

  let allRoles = [];

  if (totalCount > 0) {
    allRoles = await UserRole.aggregate([
      ...aggregations,
      {
        $sort: { _id: newSortOrder },
      },
      {
        $skip: newOffset,
      },
      {
        $limit: newLimit,
      },
    ]).exec();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { allRoles, page, limit, totalPages, totalCount },
          "Cancellation Reason fetched successfully"
        )
      );
  } else {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { allRoles, page, limit, totalPages, totalCount },
          "Cancellation Reason not found"
        )
      );
  }
});

// Get role by id
const getRoleById = asyncHandler(async (req, res) => {
  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const role = await UserRole.findById(req.params.id);

  if (!role) {
    return res.status(404).json(new ApiError(404, "Role not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, role, "Role fetched successfully"));
});

// Get all active permission
const getAllActiveRole = asyncHandler(async (req, res) => {
  const role = await UserRole.find({ active: true }).sort({ _id: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, role, "Role fetched successfully"));
});

///////////////////////////////////////////////////// COUNTRY /////////////////////////////////////////////////
// create country
const createCountry = asyncHandler(async (req, res) => {
  if (!Array.isArray(countries) || countries.length === 0) {
    return res.status(400).json(new ApiResponse(400, "No countries provided"));
  }

  const createdCountry = await Country.create(countries);

  return res
    .status(201)
    .json(new ApiResponse(201, createdCountry, "Country created successfully"));
});

//UpdateCountry
const updateCountry = asyncHandler(async (req, res) => {
  const { countryId } = req.params;
  const updatedCountryData = req.body;

  if (!updatedCountryData || Object.keys(updatedCountryData).length === 0) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "No data provided to update"));
  }

  const country = await Country.findById(countryId);

  if (!country) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Country not found"));
  }

  const updatedCountry = await Country.findByIdAndUpdate(
    countryId,
    updatedCountryData,
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedCountry, "Country updated successfully"));
});

// get all country
const getAllCountry = asyncHandler(async (req, res) => {
  const allCountry = await Country.find();

  return res
    .status(200)
    .json(new ApiResponse(200, allCountry, "Country fetched successfully"));
});

// get Country by Id
const getCountryById = asyncHandler(async (req, res) => {
  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const country = await Country.findById(req.params.id);

  if (!country) {
    return res.status(404).json(new ApiError(404, "Country not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, country, "Country fetched successfully"));
});

//deleteallcountry
const deleteAllCountry = asyncHandler(async (req, res) => {
  await Country.deleteMany({});

  return res
    .status(200)
    .json(new ApiResponse(200, null, "All country deleted successfully"));
});

//////////////////////////////////////////////////////// CITY ////////////////////////////////////////////////////////
// createcity
const createCity = asyncHandler(async (req, res) => {
  if (!Array.isArray(cities) || cities.length === 0) {
    return res.status(400).json(new ApiResponse(400, "No cities provided"));
  }

  const createdCity = await City.create(cities);

  return res
    .status(201)
    .json(new ApiResponse(201, createdCity, "City created successfully"));
});

//update city by city id
const updateCity = asyncHandler(async (req, res) => {
  const { cityId } = req.params;
  const updatedCityData = req.body;

  if (!cityId || cityId === "undefined") {
    return res.status(400).json(new ApiError(400, "City ID not provided"));
  }

  if (!updatedCityData || Object.keys(updatedCityData).length === 0) {
    return res
      .status(400)
      .json(new ApiError(400, "No data provided to update"));
  }

  const city = await City.findById(cityId);

  if (!city) {
    return res.status(404).json(new ApiError(404, "City not found"));
  }

  // Update the city data
  const updatedCity = await City.findByIdAndUpdate(cityId, updatedCityData, {
    new: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, updatedCity, "City updated successfully"));
});

// get all City by country
const getAllCity = asyncHandler(async (req, res) => {
  if (req.params.countryId == "undefined" || !req.params.countryId) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }
  const allCity = await City.find({ country: req.params.countryId });

  return res
    .status(200)
    .json(new ApiResponse(200, allCity, "City fetched successfully"));
});

// get City by Id
const getCityById = asyncHandler(async (req, res) => {
  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const city = await City.findById(req.params.id);

  if (!city) {
    return res.status(404).json(new ApiError(404, "City not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, city, "City fetched successfully"));
});

//deleteAllcities
const deleteAllCities = asyncHandler(async (req, res) => {
  await City.deleteMany({});

  return res
    .status(200)
    .json(new ApiResponse(200, null, "All cities deleted successfully"));
});

/////////////////////////////////////////////////////// SERVICE ////////////////////////////////////////////////////////
// Create Session
const createSession = asyncHandler(async (req, res) => {
  const { categoryId, sessionName, description  } = req.body;
  const imageLocalPath = req.file?.path;
  console.log("req.body:", req.body);

  if (!categoryId || !sessionName || !description ) {
    return res
      .status(400)
      .json(
        new ApiError(400, `Missing or invalid fields: all fields are required`)
      );
  }

  let image = null;
  if (imageLocalPath) {
    const uploadedImage = await uploadOnCloudinary(imageLocalPath);
    if (!uploadedImage?.url) {
      return res
        .status(400)
        .json(new ApiError(400, "Error while uploading image"));
    }
    image = uploadedImage.url;
  }

  const session = await Session.create({
    categoryId,
    sessionName,
    image,
    description,
    created_by: req.user._id,
  });

  res
    .status(201)
    .json(new ApiResponse(201, session, "Session created successfully"));
});

// Update Session
const updateSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { sessionName, categoryId, description  } = req.body;
  const imageLocalPath = req.file?.path;

  if (!id || id === "undefined") {
    return res.status(400).json(new ApiError(400, "Session ID not provided"));
  }

  if (!sessionName && !categoryId && !imageLocalPath && !description ) {
    return res
      .status(400)
      .json(new ApiError(400, "No data provided to update"));
  }

  const existingSession = await Session.findById(id);
  if (!existingSession) {
    return res.status(404).json(new ApiError(404, "Session not found"));
  }

  let image = existingSession.image;

  if (imageLocalPath) {
    try {
      if (existingSession.image) {
        await deleteFromCloudinary(existingSession.image);
      }

      const uploadedImage = await uploadOnCloudinary(imageLocalPath);
      if (!uploadedImage?.url) {
        return res.status(400).json(new ApiError(400, "Image upload failed"));
      }

      image = uploadedImage.url;
    } catch (error) {
      return res.status(500).json(new ApiError(500, "Image handling failed"));
    }
  }

  const updatedSession = await Session.findByIdAndUpdate(
    id,
    {
      sessionName: sessionName || existingSession.sessionName,
      description: description || existingSession.description,
      categoryId: categoryId || existingSession.categoryId,
      image,
      updated_by: req.user._id,
    },
    { new: true }
  );

  res
    .status(200)
    .json(new ApiResponse(200, updatedSession, "Session updated successfully"));
});

// Get getAllSessions
const getAllSessions = asyncHandler(async (req, res) => {
  const session = await Session.find().populate("categoryId");
  res
    .status(200)
    .json(new ApiResponse(200, session, "Session fetched successfully"));
});

// Get Session by ID
const getSessionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json(new ApiError(400, "Session ID is required"));
  }

  const session = await Session.findById(id).populate("categoryId");
  if (!session) {
    return res.status(404).json(new ApiError(404, "Session not found"));
  }

  res
    .status(200)
    .json(new ApiResponse(200, session, "Session fetched successfully"));
});



// Delete Session
const deleteSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await Session.findById(id);
  if (!session) {
    return res.status(404).json(new ApiError(404, "Session not found"));
  }

  if (session.image) {
    await deleteFromCloudinary(session.image);
  }

  await Session.findByIdAndDelete(id);

  res
    .status(200)
    .json(new ApiResponse(200, null, "Session deleted successfully"));
});

// Get Sessions by categoryId
const getSessionsByCategoryId = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  if (!categoryId) {
    return res.status(400).json(new ApiError(400, "Category ID is required"));
  }

  const sessions = await Session.find({ categoryId }).populate("categoryId");

  if (!sessions.length) {
    return res
      .status(404)
      .json(new ApiResponse(200, [], "No sessions found for this category"));
  }

  res
    .status(200)
    .json(new ApiResponse(200, sessions, "Sessions fetched successfully"));
});

////////////////////////////////////////////////////// BREED ////////////////////////////////////////////////////////
// CREATE Location Master
const createLocationMaster = asyncHandler(async (req, res) => {
  const { streetName, country, city, landmark = '', is_active = true, location } = req.body;

  if (!streetName || !Array.isArray(location) || location.length !== 2) {
    return res.status(400).json(
      new ApiError(400, "Missing or invalid required fields: streetName and location")
    );
  }

  const [lat, lng] = location.map(Number);
  const geoLocation = {
    type: "Point",
    coordinates: [lng, lat], // GeoJSON format: [lng, lat]
  };

  const createdLocation = await LocationMaster.create({
    streetName,
    country,
    city,
    landmark,
    is_active,
    location: geoLocation,
    created_by: req.user?._id,
  });

  return res.status(201).json(
    new ApiResponse(201, createdLocation, "Location Master created successfully")
  );
});




// UPDATE Location Master
const updateLocationMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { streetName, country, city, landmark, is_active, location } = req.body;

  if (!id || id === "undefined") {
    return res.status(400).json(new ApiError(400, "Missing required parameter: id"));
  }

  if (!Object.keys(req.body).length) {
    return res.status(400).json(new ApiError(400, "No data provided to update"));
  }

  let geoLocation;
  if (Array.isArray(location) && location.length === 2) {
    const [lat, lng] = location.map(Number);
    geoLocation = {
      type: "Point",
      coordinates: [lng, lat],
    };
  }

  const updateData = {
    ...(streetName && { streetName }),
    ...(country && { country }),
    ...(city && { city }),
    ...(landmark && { landmark }),
    ...(typeof is_active !== 'undefined' && { is_active }),
    ...(geoLocation && { location: geoLocation }),
    updated_by: req.user?._id,
  };

  const updatedLocation = await LocationMaster.findByIdAndUpdate(id, updateData, { new: true });

  if (!updatedLocation) {
    return res.status(404).json(new ApiError(404, "Location Master not found"));
  }

  return res.status(200).json(
    new ApiResponse(200, updatedLocation, "Location Master updated successfully")
  );
});



const getLocationsByCountryAndCity = asyncHandler(async (req, res) => {
  const { country, city } = req.query;

  if (!country) {
    return res.status(400).json(new ApiError(400, "Country is required"));
  }

  const filter = {
    country: country,
  };

  if (city) {
    // Check if city is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(city)) {
      filter.city = city;
    } else {
      // Match city name case-insensitively
      filter.city = { $regex: new RegExp(`^${city}$`, "i") };
    }
  }

  const locations = await LocationMaster.find(filter)
    .populate("country")
    .exec();

  if (!locations.length) {
    return res
      .status(404)
      .json(new ApiError(404, "No locations found for the given criteria"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, locations, "Locations fetched successfully"));
});

// GET ALL Location Masters (with pagination)
const getAllLocationMasters = asyncHandler(async (req, res) => {
  const { search = "" } = req.query;
  const { filter, page, limit, sortOrder } = req.body;

  if (filter?.country) {
    filter.country = new mongoose.Types.ObjectId(filter.country);
  }

  if (filter?.city) {
    filter.city = new mongoose.Types.ObjectId(filter.city);
  }

  let searchCondition = {};
  if (search && search !== "undefined") {
    const regex = new RegExp(search, "i");
    searchCondition = {
      $or: [
        { streetName: { $regex: regex } },
        { landmark: { $regex: regex } },
        { "Country.name": { $regex: regex } },
        { "City.name": { $regex: regex } },
      ],
    };
  }

  const combinedFilter = {
    ...filter,
    ...searchCondition,
  };

  const aggregations = [
    {
      $lookup: {
        from: "countries",
        localField: "country",
        foreignField: "_id",
        as: "Country",
      },
    },
    {
      $unwind: {
        path: "$Country",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "cities",
        localField: "city",
        foreignField: "_id",
        as: "City",
      },
    },
    {
      $unwind: {
        path: "$City",
        preserveNullAndEmptyArrays: true,
      },
    },
    { $match: combinedFilter },
  ];

  const {
    newOffset,
    newLimit,
    totalPages,
    totalCount,
    newSortOrder,
  } = await pagination(LocationMaster, page, limit, sortOrder, aggregations);

  let allLocationMasters = [];

  if (totalCount > 0) {
    allLocationMasters = await LocationMaster.aggregate([
      ...aggregations,
      { $project: { country: 0, city: 0 } }, // Hide original ObjectIds
      { $sort: { _id: newSortOrder } },
      { $skip: newOffset },
      { $limit: newLimit },
    ]).exec();
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { allLocationMasters, page, limit, totalPages, totalCount },
      totalCount
        ? "Location Master fetched successfully"
        : "No Location Master found"
    )
  );
});


// GET All Location Masters (no pagination)
const getAllLocations = asyncHandler(async (req, res) => {
  const allLocations = await LocationMaster.find().populate("country city");
  return res
    .status(200)
    .json(new ApiResponse(200, allLocations, "Locations fetched successfully"));
});

// GET Location Master by ID
const getLocationMasterById = asyncHandler(async (req, res) => {
  if (!req.params.id || req.params.id === "undefined") {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const location = await LocationMaster.findById(req.params.id).populate(
    "country"
  );

  if (!location) {
    return res.status(404).json(new ApiError(404, "Location Master not found"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, location, "Location Master fetched successfully")
    );
});

// DELETE Location Master
const deleteLocationMaster = asyncHandler(async (req, res) => {
  if (!req.params.id || req.params.id === "undefined") {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const location = await LocationMaster.findByIdAndDelete(req.params.id);

  if (!location) {
    return res.status(404).json(new ApiError(404, "Location Master not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Location Master deleted successfully"));
});

// create tax master
const createTaxMaster = asyncHandler(async (req, res) => {
  const { name, rate, country, is_active } = req.body;

  const requiredFields = {
    name,
    rate,
  };

  const missingFields = Object.keys(requiredFields).filter(
    (field) => !requiredFields[field] || requiredFields[field] === "undefined"
  );

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json(
        new ApiError(400, `Missing required field: ${missingFields.join(", ")}`)
      );
  }

  // if (country) {
  //   const countryExists = await Country.findById(country);
  //   if (!countryExists) {
  //     return res.status(404).json(new ApiError(404, "Country not found"));
  //   }
  // }

  const createdTaxMaster = await TaxMaster.create({
    name,
    rate,
    country,
    is_active,
    created_by: req.user?._id,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(201, createdTaxMaster, "TaxMaster created successfully")
    );
});

// update Tax Master
const updateTaxMaster = asyncHandler(async (req, res) => {
  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  if (Object.keys(req.body).length === 0) {
    return res
      .status(400)
      .json(new ApiError(400, "No data provided to update"));
  }

  const { name, rate, country, is_active } = req.body;

  // if (country) {
  //   const countryExists = await Country.findById(country);
  //   if (!countryExists) {
  //     return res.status(404).json(new ApiError(404, "Country not found"));
  //   }
  // }

  const updatedTaxMaster = await TaxMaster.findByIdAndUpdate(
    req.params.id,
    {
      name,
      rate,
      country,
      is_active,
      updated_by: req.user?._id,
    },
    { new: true }
  );

  if (!updatedTaxMaster) {
    return res.status(404).json(new ApiError(404, "Tax Master not found"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedTaxMaster, "Tax Master updated successfully")
    );
});

// get all Tax Master
const getAllTaxMaster = asyncHandler(async (req, res) => {
  const { search = "" } = req.query;
  const { filter, page, limit, sortOrder } = req.body;

  if (filter?.country) {
    filter.country = new mongoose.Types.ObjectId(filter.country);
  }

  let searchCondition = {};

  if (search && search !== "undefined") {
    const regex = new RegExp(search, "i");
    searchCondition = {
      $or: [
        { name: { $regex: regex } },
        { rate: { $regex: regex } },
        { "Country.name": { $regex: regex } },
      ],
    };
  }

  const combinedFilter = {
    ...filter,
    ...searchCondition,
  };

  const aggregations = [
    {
      $lookup: {
        from: "countries",
        localField: "country",
        foreignField: "_id",
        as: "Country",
      },
    },
    {
      $unwind: {
        path: "$Country",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: combinedFilter,
    },
  ];

  const { newOffset, newLimit, totalPages, totalCount, newSortOrder } =
    await pagination(TaxMaster, page, limit, sortOrder, aggregations);

  let allTaxMaster = [];

  if (totalCount > 0) {
    allTaxMaster = await TaxMaster.aggregate([
      ...aggregations,
      {
        $project: {
          country: 0,
        },
      },
      {
        $sort: { _id: newSortOrder },
      },
      {
        $skip: newOffset,
      },
      {
        $limit: newLimit,
      },
    ]).exec();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { allTaxMaster, page, limit, totalPages, totalCount },
          "Tax Master fetched successfully"
        )
      );
  } else {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { allTaxMaster, page, limit, totalPages, totalCount },
          "No Tax master found"
        )
      );
  }
});

// get all tax without pagination
const getAllTax = asyncHandler(async (req, res) => {
  const allTax = await TaxMaster.find().populate("country");

  return res
    .status(200)
    .json(new ApiResponse(200, allTax, "Tax fetched successfully"));
});

// Get Tax Master by ID
const getTaxMasterById = asyncHandler(async (req, res) => {
  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const taxMaster = await TaxMaster.findById(req.params.id).populate("country");

  if (!taxMaster) {
    return res.status(404).json(new ApiError(404, "Tax master not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, taxMaster, "Tax master fetched successfully"));
});

// delete tax master
const deleteTaxMaster = asyncHandler(async (req, res) => {
  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const taxMaster = await TaxMaster.findByIdAndDelete(req.params.id);

  if (!taxMaster) {
    return res.status(404).json(new ApiError(404, "Tax Master not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Tax Master deleted successfully"));
});



// ✅ Create Policy (Terms or Privacy)
const createPolicy = asyncHandler(async (req, res) => {
  const { type, title, content, version } = req.body;

  if (!type || !title || !content) {
    return res.status(400).json(new ApiError(400, "Missing required fields"));
  }

  const policy = await Policy.create({
    type,     // e.g. "terms" or "privacy"
    title,
    content,
    version,  // optional versioning if you want to track changes
  });

  return res
    .status(201)
    .json(new ApiResponse(201, policy, `${type} created successfully`));
});

// ✅ Update Policy
const updatePolicy = asyncHandler(async (req, res) => {
  const { policyId } = req.params;
  const { title, content, version } = req.body;

  const updatedPolicy = await Policy.findByIdAndUpdate(
    policyId,
    { title, content, version },
    { new: true }
  );

  if (!updatedPolicy) {
    return res.status(404).json(new ApiError(404, "Policy not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedPolicy, "Policy updated successfully"));
});


// ✅ Get all policies
const getAllPolicies = asyncHandler(async (req, res) => {
  const policies = await Policy.find().sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, policies, "Policies fetched successfully"));
});

// ✅ Get latest Terms
const getLatestTerms = asyncHandler(async (req, res) => {
  try {
    const terms = await Policy.findOne({ type: "TERMS" }).sort({ createdAt: -1 });

    if (!terms) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "No Terms & Conditions found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, terms, "Latest Terms fetched successfully"));
  } catch (error) {
    console.error("Error fetching latest terms:", error);
    throw new ApiError(500, "Internal server error while fetching terms");
  }
});

// ✅ Get latest Privacy Policy
const getLatestPrivacy = asyncHandler(async (req, res) => {
  const privacy = await Policy.findOne({ type: "PRIVACY" }).sort({
    createdAt: -1,
  });

  if (!privacy) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Privacy Policy not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, privacy, "Latest Privacy Policy fetched"));
});

// ✅ Delete Policy
const deletePolicy = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const policy = await Policy.findByIdAndDelete(id);

  if (!policy) {
    throw new ApiError(404, "Policy not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Policy deleted successfully"));
});




export {
  createPolicy,
  getAllPolicies,
  getLatestTerms,
  getLatestPrivacy,
  updatePolicy,
  deletePolicy,
  createLocationMaster,
  updateLocationMaster,
  getAllLocationMasters,
  getAllLocations,
  getLocationsByCountryAndCity,
  getLocationMasterById,
  deleteLocationMaster,
  createTenure,
  getAllTenure,
  getSingleTenure,
  updateTenure,
  deleteTenure,
  
  getSessionsByCategoryId,
  createSession,
  getAllSessions,
  getSessionById,
  updateSession,
  deleteSession,
  createCategory,
  getAllCategory,
  deleteCategory,
  updateCategory,
  getSingleCategory,
  createRole,
  updateRole,
  // getRoleById,
  getAllRole,
  getAllActiveRole,
  createTaxMaster,
  updateTaxMaster,
  getAllTaxMaster,
  getAllTax,
  getTaxMasterById,
  deleteTaxMaster,
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

  // createSubscription,
  // getAllSubscription,
  // getSubscriptionById,
  // updateSubscription,
  // deleteSubscription,

  // createBreed,
  // updateBreed,
  // getBreedById,
  // getAllBreed,
  // deleteBreed,

  // createPetType,
  // updatePetType,
  // getPetType,
  // getAllPetTypes,
  // deletePetType,

  // createExtraCharge,
  // updateExtraCharge,
  // getExtraChargeById,
  // getAllExtraCharges,
  // deleteExtraCharge,

  // createVaccine,
  // getAllVaccines,
  // getVaccineById,
  // updateVaccine,
  // deleteVaccine
};
