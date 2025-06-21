import mongoose from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../../utils/cloudinary.js";
import { City, Country, Breed, PetType, TaxMaster, ExtraCharge, Vaccine } from "../../models/master.model.js"
import { ServiceType } from "../../models/service.model.js";
import cities from "../../utils/seeds/cities.js";
import countries from "../../utils/seeds/countries.js"
import pagination from "../../utils/pagination.js"
import { UserRole } from "../../models/userRole.model.js";



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
    return res
      .status(400)
      .json(new ApiResponse(400, "No countries provided"));
  }

  const createdCountry = await Country.create(countries);

  return res
    .status(201)
    .json(new ApiResponse(201, createdCountry, "Country created successfully")
    );
})


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
    .json(new ApiResponse(200, allCountry, "Country fetched successfully")
    );
});


// get Country by Id
const getCountryById = asyncHandler(async (req, res) => {

  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const country = await Country.findById(req.params.id);

  if (!country) {
    return res
      .status(404)
      .json(new ApiError(404, "Country not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, country, "Country fetched successfully")
    );
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
    return res
      .status(400)
      .json(new ApiResponse(400, "No cities provided"));
  }

  const createdCity = await City.create(cities);

  return res
    .status(201)
    .json(new ApiResponse(201, createdCity, "City created successfully")
    );
})


//update city by city id
const updateCity = asyncHandler(async (req, res) => {
  const { cityId } = req.params;
  const updatedCityData = req.body;

  if (!cityId || cityId === "undefined") {
    return res.status(400).json(new ApiError(400, "City ID not provided"));
  }


  if (!updatedCityData || Object.keys(updatedCityData).length === 0) {
    return res.status(400).json(new ApiError(400, "No data provided to update"));
  }

  const city = await City.findById(cityId);

  if (!city) {
    return res.status(404).json(new ApiError(404, "City not found"));
  }


  // Update the city data
  const updatedCity = await City.findByIdAndUpdate(
    cityId,
    updatedCityData,
    { new: true }
  );

  return res.status(200).json(
    new ApiResponse(200, updatedCity, "City updated successfully")
  );
});


// get all City by country
const getAllCity = asyncHandler(async (req, res) => {

  if (req.params.countryId == "undefined" || !req.params.countryId) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }
  const allCity = await City.find({ country: req.params.countryId });

  return res
    .status(200)
    .json(new ApiResponse(200, allCity, "City fetched successfully")
    );
});


// get City by Id
const getCityById = asyncHandler(async (req, res) => {

  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const city = await City.findById(req.params.id);

  if (!city) {
    return res
      .status(404)
      .json(new ApiError(404, "City not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, city, "City fetched successfully")
    );
});


//deleteAllcities
const deleteAllCities = asyncHandler(async (req, res) => {

  await City.deleteMany({});

  return res
    .status(200)
    .json(new ApiResponse(200, null, "All cities deleted successfully"));
});




/////////////////////////////////////////////////////// SERVICE ////////////////////////////////////////////////////////
// Create ServiceType
const createServiceType = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const imageLocalPath = req.file?.path;

  const requiredFields = {
    name: (value) => value !== undefined && value !== null,
  };

  const missingFields = Object.entries(requiredFields)
    .filter(([field, checkFn]) => !checkFn(req.body[field]))
    .map(([field]) => field);

  if (missingFields.length > 0) {
    return res.status(400).json(new ApiError(400, `Missing or invalid fields: ${missingFields.join(", ")}`));
  }

  let image = null;
  if (imageLocalPath) {
    const uploadedImage = await uploadOnCloudinary(imageLocalPath);
    if (!uploadedImage?.url) {
      return res.status(400).json(new ApiError(400, "Error while uploading image"));
    }
    image = uploadedImage.url;
  }

  const serviceType = await ServiceType.create({
    name,
    description,
    image,
    created_by: req.user._id,
  });

  res.status(201).json(new ApiResponse(201, serviceType, "Service Type created successfully"));
});


// Get all ServiceTypes
const getAllServiceTypes = asyncHandler(async (req, res) => {
  const serviceTypes = await ServiceType.find();
  res.status(200).json(new ApiResponse(200, serviceTypes, "Service Types fetched successfully"));
});


// Get ServiceType by ID
const getServiceTypeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json(new ApiError(400, "Service Type ID is required"));
  }
  const serviceType = await ServiceType.findById(id);
  if (!serviceType) {
    return res.status(404).json(new ApiError(404, "Service Type not found"));
  }
  res.status(200).json(new ApiResponse(200, serviceType, "Service Type fetched successfully"));
})


// Update ServiceType
const updateServiceType = asyncHandler(async (req, res) => {
  if (!req.params.id || req.params.id == "undefined") {
    return res.status(400).json(new ApiError(400, "ID not provided"));
  }

  if (Object.keys(req.body).length === 0 && !req.file) {
    return res.status(400).json(new ApiError(400, "No data provided to update"));
  }

  const { name, description } = req.body;
  const imageLocalPath = req.file?.path;

  if (name && name.trim() === "") {
    return res.status(400).json(new ApiError(400, "Service Type name cannot be empty"));
  }

  const existingService = await ServiceType.findById(req.params.id);
  if (!existingService) {
    return res.status(404).json(new ApiError(404, "Service Type not found"));
  }

  let image = existingService.image;
  if (imageLocalPath) {
    try {
      const [deleteResult, uploadResult] = await Promise.all([
        existingService.image ? deleteFromCloudinary(existingService.image) : Promise.resolve(),
        uploadOnCloudinary(imageLocalPath)
      ]);
      if (!uploadResult?.url) {
        return res.status(400).json(new ApiError(400, "Error while uploading image"));
      }
      image = uploadResult.url;
    } catch (error) {
      return res.status(500).json(new ApiError(500, "Image handling failed"));
    }
  }

const updatedServiceType = await ServiceType.findByIdAndUpdate(
    req.params.id,
    { name, description, image, updated_by: req.user._id },
    { new: true }
  );
    return res.status(200).json(new ApiResponse(200, updatedServiceType, "Service Type updated successfully"));
});


// Delete ServiceType
const deleteServiceType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const serviceType = await ServiceType.findByIdAndDelete(id);
  if (!serviceType) {
    return res.status(404).json(new ApiError(404, "Service Type not found"));
  }
  res.status(200).json(new ApiResponse(200, "Service Type deleted successfully"));
});



////////////////////////////////////////////////////// BREED ////////////////////////////////////////////////////////
//Create Breed
const createBreed = asyncHandler(async (req, res) => {
  console.log("req.body", req.body)

  const { petTypeId, name } = req.body;
  const created_by = req.user?._id || null;

  if (!petTypeId || !name) {
    throw new ApiError(400, "petTypeId and name are required");
  }

  const petType = await PetType.findById(petTypeId);
  if (!petType) {
    throw new ApiError(404, "Pet Type not found");
  }

  const breed = await Breed.create({
    petTypeId,
    name: name.toLowerCase(),
    created_by,
  });

  res.status(201).json(new ApiResponse(201, breed, "Breed created successfully"));
});


//update Breed
const updateBreed = asyncHandler(async (req, res) => {
  console.log("req.params", req.params);
  console.log("req.body", req.body);

  try {
    const { breedId } = req.params;
    const { petTypeId, name } = req.body;
    const updated_by = req.user?._id || null;

    const breedExists = await Breed.findById(breedId);
    if (!breedExists) {
      throw new ApiError(404, "Breed not found");
    }

    if (petTypeId) {
      const petTypeExists = await PetType.findById(petTypeId);
      if (!petTypeExists) {
        throw new ApiError(404, "Pet Type not found");
      }
    }

    const updateData = { updated_by };
    if (petTypeId) updateData.petTypeId = petTypeId;
    if (name) updateData.name = name.toLowerCase();

    const updatedBreed = await Breed.findByIdAndUpdate(breedId, updateData, { new: true });

    res.status(200).json(new ApiResponse(200, updatedBreed, "Breed updated successfully"));
  } catch (error) {
    console.error("Error updating breed:", error);
    return res.status(500).json(new ApiError(500, error.message || "Internal Server Error")); 
  }
});


//find Breed
const getBreedById = asyncHandler(async (req, res) => {
  console.log("req.params", req.params)
  console.log("req.body", req.body)

  const { id } = req.params;

  const breed = await Breed.findById(id).populate("petTypeId", "name");
  if (!breed) {
    throw new ApiError(404, "Breed not found");
  }

  res.status(200).json(new ApiResponse(200, breed));
})


//find All Breed
const getAllBreed = asyncHandler(async (req, res) => {
  console.log("req.body", req.body);

  let { filter = {}, sortOrder = -1 } = req.body;

  if (filter?.petTypeId) {
    filter.petTypeId = new mongoose.Types.ObjectId(filter.petTypeId);
  }

  const breeds = await Breed.find(filter)
    .sort({ createdAt: sortOrder })
    .populate("petTypeId", "name"); 

  res.status(200).json(new ApiResponse(200, breeds));
});


//delete breed
const deleteBreed = asyncHandler(async (req, res) => {
 
  const { id } = req.params;

  const breed = await Breed.findByIdAndDelete(id);
  if (!breed) {
    throw new ApiError(404, "Breed not found");
  }

  res.status(200).json(new ApiResponse(200, null, "Breed deleted successfully"));
})


//////////////////////////////////////////////////// PET TYPE /////////////////////////////////////////////////////////////
// Create PetType
const createPetType = asyncHandler(async (req, res) => {
  console.log("req.params", req.params)
  console.log("req.body", req.body)

  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Pet type name is required.' });
    }

    const existingType = await PetType.findOne({ name: name.toLowerCase() });
    if (existingType) {
      return res.status(400).json({ message: 'Pet type already exists.' });
    }

    const newPetType = new PetType({
      name: name.toLowerCase(),
      created_by: req.user?._id || null,
    });

    await newPetType.save();

    res.status(201).json({ message: 'Pet type created successfully.', data: newPetType });
  } catch (error) {
    res.status(500).json({ message: 'Server error while creating pet type.', error: error.message });
  }
});


// Update PetType
const updatePetType = asyncHandler(async (req, res) => {
  console.log("req.params", req.params);
  console.log("req.body", req.body);

  try {
    const { PetTypeId } = req.params;
    const { name } = req.body;

    const updatedData = {};
    if (name) updatedData.name = name.toLowerCase();

    const petType = await PetType.findByIdAndUpdate(
      PetTypeId,
      updatedData,
      { new: true }
    );

    if (!petType) {
      return res.status(404).json({ message: 'Pet type not found.' });
    }

    res.status(200).json({ message: 'Pet type updated successfully.', data: petType });
  } catch (error) {
    res.status(500).json({ message: 'Server error while updating pet type.', error: error.message });
  }
});


// Get single PetType by ID
const getPetType = asyncHandler(async (req, res) => {
  console.log("req.params", req.params)
  console.log("req.body", req.body)

  try {
    const { id } = req.params;

    const petType = await PetType.findById(id);
    if (!petType) {
      return res.status(404).json({ message: 'Pet type not found.' });
    }

    res.status(200).json({ data: petType });
  } catch (error) {
    res.status(500).json({ message: 'Server error while retrieving pet type.', error: error.message });
  }
});


// Get all PetTypes
const getAllPetTypes = asyncHandler(async (req, res) => {
  console.log("req.params", req.params)
  console.log("req.body", req.body)

  try {
    const petTypes = await PetType.find().sort({ name: 1 });

    res.status(200).json({ data: petTypes });
  } catch (error) {
    res.status(500).json({ message: 'Server error while retrieving pet types.', error: error.message });
  }
});


// Delete PetType
const deletePetType = asyncHandler(async (req, res) => {
 
  try {
    const { id } = req.params;

    const breedExists = await Breed.findOne({ petTypeId: id });

    if (breedExists) {
      return res.status(203).json({ 
        message: 'Cannot delete pet type. It is referenced in one or more breeds.' 
      });
    }
    const petType = await PetType.findByIdAndDelete(id);
    if (!petType) {
      return res.status(404).json({ message: 'Pet type not found.' });
    }

    res.status(200).json({ message: 'Pet type deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error while deleting pet type.', error: error.message });
  }
});

// create tax master
const createTaxMaster = asyncHandler(async (req, res) => {
  const { name, rate, country, is_active } = req.body;

  const requiredFields = {
    name, rate
  };
  
  const missingFields = Object.keys(requiredFields).filter(field => !requiredFields[field] || requiredFields[field] === 'undefined');
  
  if (missingFields.length > 0) {
    return res.status(400).json(new ApiError(400, `Missing required field: ${missingFields.join(', ')}`));
  }

  if (country) {
    const countryExists = await Country.findById(country);
    if (!countryExists) {
      return res.status(404).json(new ApiError(404, "Country not found"));
    }
  }

  const createdTaxMaster = await TaxMaster.create({
    name,
    rate,
    country,
    is_active,
    created_by: req.user?._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, createdTaxMaster, "TaxMaster created successfully")
    );
});


// update Tax Master
const updateTaxMaster = asyncHandler(async (req, res) => {

  if (req.params.id =="undefined" || !req.params.id) {
      return res.status(400).json(new ApiError(400, "id not provided"));
  }

  if (Object.keys(req.body).length === 0) {
      return res.status(400).json(new ApiError(400, "No data provided to update"))
  } 

  const { name, rate, country, is_active } = req.body;

  if (country) {
    const countryExists = await Country.findById(country);
    if (!countryExists) {
      return res.status(404).json(new ApiError(404, "Country not found"));
    }
  }

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
    return res
    .status(404)
    .json(new ApiError(404, "Tax Master not found"));
    
  }

  return res
    .status(200)
    .json(new ApiResponse(200,updatedTaxMaster,"Tax Master updated successfully")
    );
});


// get all Tax Master
const getAllTaxMaster = asyncHandler(async (req, res) => {
  const { search = '' } = req.query;
  const { filter, page, limit, sortOrder } = req.body; 

  if (filter?.country) {
    filter.country = new mongoose.Types.ObjectId(filter.country);
  }

  let searchCondition = {};

  if (search && search !== 'undefined') {
    const regex = new RegExp(search, 'i');
    searchCondition = {
      $or: [
        { name: { $regex: regex } },              
        { rate: { $regex: regex } },
        { 'Country.name': { $regex: regex } } 
      ]
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
        path: '$Country',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: combinedFilter  
    }
  ];

  const { newOffset, newLimit, totalPages, totalCount, newSortOrder } = await pagination(TaxMaster, page, limit, sortOrder, aggregations);

  let allTaxMaster = [];

  if (totalCount > 0) {
    allTaxMaster = await TaxMaster.aggregate([
      ...aggregations,
      {
        $project: {
          country: 0,
        }
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

    return res.status(200).json(new ApiResponse(200, { allTaxMaster, page, limit, totalPages, totalCount }, "Tax Master fetched successfully"));
  } else {
    return res.status(200).json(new ApiResponse(200, { allTaxMaster, page, limit, totalPages, totalCount }, "No Tax master found"));
  }

});


// get all tax without pagination
const getAllTax = asyncHandler(async (req, res) => {
  const allTax = await TaxMaster.find()
  .populate("country")

  return res
    .status(200).json(new ApiResponse(200, allTax, "Tax fetched successfully"));
});


// Get Tax Master by ID
const getTaxMasterById = asyncHandler(async (req, res) => {

  if (req.params.id =="undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const taxMaster = await TaxMaster.findById(req.params.id).populate('country');

  if (!taxMaster) {
    return res
    .status(404)
    .json(new ApiError(404, "Tax master not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, taxMaster, "Tax master fetched successfully")
    );
});


// delete tax master
const deleteTaxMaster = asyncHandler(async (req, res) => {

  if (req.params.id =="undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const taxMaster = await TaxMaster.findByIdAndDelete(req.params.id);

  if (!taxMaster) {
    return res
    .status(404)
    .json(new ApiError(404, "Tax Master not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Tax Master deleted successfully"));
});

// const createExtraCharge = asyncHandler(async (req, res) => {
//   console.log("req.body", req.body);

//   const { extraprice } = req.body;
//   const created_by = req.user?._id || null;

//   if (extraprice === undefined || extraprice === null) {
//     throw new ApiError(400, "Extraprice is required");
//   }

//   const existingCharge = await ExtraCharge.findOne();
//   if (existingCharge) {
//     throw new ApiError(400, "An extra charge already exists. You can update or delete it.");
//   }

//   const extraCharge = await ExtraCharge.create({
//     extraprice,
//     created_by,
//   });

//   res
//     .status(201)
//     .json(new ApiResponse(201, extraCharge, "Extra charge created successfully"));
// });

// // Update ExtraCharge
// const updateExtraCharge = asyncHandler(async (req, res) => {
//   console.log("req.params", req.params);
//   console.log("req.body", req.body);

//   const { id } = req.params;
//   const { extraprice } = req.body;
//   const updated_by = req.user?._id || null;

//   const extraCharge = await ExtraCharge.findById(id);
//   if (!extraCharge) {
//     throw new ApiError(404, "Extra charge not found");
//   }

//   const updateData = { updated_by };
//   if (extraprice !== undefined) updateData.extraprice = extraprice;

//   const updatedExtraCharge = await ExtraCharge.findByIdAndUpdate(id, updateData, {
//     new: true,
//   });

//   res
//     .status(200)
//     .json(new ApiResponse(200, updatedExtraCharge, "Extra charge updated successfully"));
// });

// Get ExtraCharge by ID

/**-*** */
const createExtraCharge = asyncHandler(async (req, res) => {
  const { extraprice, is_default = false } = req.body;
  const created_by = req.user?._id || null;

  if (extraprice === undefined || extraprice === null) {
    throw new ApiError(400, "Extraprice is required");
  }

  const extraCharge = await ExtraCharge.create({
    extraprice,
    is_default,
    created_by,
  });

  res
    .status(201)
    .json(new ApiResponse(201, extraCharge, "Extra charge created successfully"));
});

// Update ExtraCharge
const updateExtraCharge = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { extraprice, is_default } = req.body;
  const updated_by = req.user?._id || null;

  const extraCharge = await ExtraCharge.findById(id);
  if (!extraCharge) {
    throw new ApiError(404, "Extra charge not found");
  }

  const updateData = { updated_by };
  if (extraprice !== undefined) updateData.extraprice = extraprice;
  if (is_default !== undefined) updateData.is_default = is_default;

  const updatedExtraCharge = await ExtraCharge.findByIdAndUpdate(id, updateData, {
    new: true,
  });

  res
    .status(200)
    .json(new ApiResponse(200, updatedExtraCharge, "Extra charge updated successfully"));
});

const getExtraChargeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const extraCharge = await ExtraCharge.findById(id)
    .populate("created_by", "name")
    .populate("updated_by", "name");

  if (!extraCharge) {
    throw new ApiError(404, "Extra charge not found");
  }

  res.status(200).json(new ApiResponse(200, extraCharge));
});

// Get All ExtraCharges
const getAllExtraCharges = asyncHandler(async (req, res) => {
  console.log("req.body", req.body);

  let { filter = {}, sortOrder = -1 } = req.body;

  const extraCharges = await ExtraCharge.find(filter)
    // .sort({ createdAt: sortOrder })
    // .populate("created_by", "name")
    // .populate("updated_by", "name");

  res.status(200).json(new ApiResponse(200, extraCharges));
});

// Delete ExtraCharge
const deleteExtraCharge = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const extraCharge = await ExtraCharge.findByIdAndDelete(id);
  if (!extraCharge) {
    throw new ApiError(404, "Extra charge not found");
  }

  res.status(200).json(new ApiResponse(200, null, "Extra charge deleted successfully"));
});

// VACCINE CONTROLLER

// Create Vaccine
const createVaccine = asyncHandler(async (req, res) => {
  const { name, manufacturer } = req.body;

  const requiredFields = {
    name: (value) => value !== undefined && value !== null && value.trim() !== "",
    manufacturer: (value) => value !== undefined && value !== null && value.trim() !== "",
  };

  const missingFields = Object.entries(requiredFields)
    .filter(([field, checkFn]) => !checkFn(req.body[field]))
    .map(([field]) => field);

  if (missingFields.length > 0) {
    return res.status(400).json(
      new ApiError(400, `Missing or invalid fields: ${missingFields.join(", ")}`)
    );
  }

  const vaccine = await Vaccine.create({
    name,
    manufacturer,
    created_by: req.user?._id || null,
  });

  res
    .status(201)
    .json(new ApiResponse(201, vaccine, "Vaccine created successfully"));
});

// Get all Vaccines
const getAllVaccines = asyncHandler(async (req, res) => {
  const vaccines = await Vaccine.find();
  if(!vaccines){
    return res.status(400).json(
      new ApiError(400, `vaccome not found`)
    );
  }
  res
    .status(200)
    .json(new ApiResponse(200, vaccines, "Vaccines fetched successfully"));
});

// Get Vaccine by ID
const getVaccineById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json(new ApiError(400, "Vaccine ID is required"));
  }

  const vaccine = await Vaccine.findById(id);
  if (!vaccine) {
    return res.status(404).json(new ApiError(404, "Vaccine not found"));
  }

  res
    .status(200)
    .json(new ApiResponse(200, vaccine, "Vaccine fetched successfully"));
});

// Update Vaccine
const updateVaccine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, manufacturer } = req.body;

  if (!id || id === "undefined") {
    return res.status(400).json(new ApiError(400, "ID not provided"));
  }

  if (Object.keys(req.body).length === 0) {
    return res.status(400).json(new ApiError(400, "No data provided to update"));
  }

  if (name && name.trim() === "") {
    return res.status(400).json(new ApiError(400, "Vaccine name cannot be empty"));
  }

  if (manufacturer && manufacturer.trim() === "") {
    return res.status(400).json(new ApiError(400, "Manufacturer cannot be empty"));
  }

  const existingVaccine = await Vaccine.findById(id);
  if (!existingVaccine) {
    return res.status(404).json(new ApiError(404, "Vaccine not found"));
  }

  existingVaccine.name = name || existingVaccine.name;
  existingVaccine.manufacturer = manufacturer || existingVaccine.manufacturer;
  await existingVaccine.save();

  res
    .status(200)
    .json(new ApiResponse(200, existingVaccine, "Vaccine updated successfully"));
});

// Delete Vaccine
const deleteVaccine = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const vaccine = await Vaccine.findByIdAndDelete(id);
  if (!vaccine) {
    return res.status(404).json(new ApiError(404, "Vaccine not found"));
  }

  res.status(200).json(new ApiResponse(200, null, "Vaccine deleted successfully"));
});

export {
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
};