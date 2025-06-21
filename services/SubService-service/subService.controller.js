import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../../utils/cloudinary.js";
import { SubServiceType } from "../../models/subService.model.js";


//createsubservice
const createSubService = asyncHandler(async (req, res) => {
  console.log("req.body", req.body);

  try {
    const { serviceTypeId, groomingDetails } = req.body;
    const rawName = req.body.name;

    const name = rawName?.trim().toLowerCase();

    let parsedDetails;
    try {
      parsedDetails = JSON.parse(groomingDetails);
    } catch (err) {
      return res.status(400).json(new ApiError(400, "Invalid groomingDetails format"));
    }

    if (!name || !serviceTypeId || !Array.isArray(parsedDetails) || parsedDetails.length === 0) {
      return res.status(400).json(new ApiError(400, "Missing required fields"));
    }

    const weightTypes = parsedDetails.map(detail => detail.weightType.trim().toLowerCase());
    const uniqueWeightTypes = new Set(weightTypes);
    if (weightTypes.length !== uniqueWeightTypes.size) {
      return res.status(400).json(new ApiError(400, "Duplicate groomingDetails"));
    }

    const existingSubService = await SubServiceType.findOne({ serviceTypeId, name });
    if (existingSubService) {
      const existingDetails = existingSubService.groomingDetails || [];

      const isDuplicate = parsedDetails.every((newDetail) =>
        existingDetails.some((existingDetail) =>
          existingDetail.weightType === newDetail.weightType &&
          existingDetail.price === newDetail.price &&
          existingDetail.description === newDetail.description
        )
      );

      if (isDuplicate) {
        return res.status(400).json(new ApiError(400, "Duplicate subservice already exists"));
      }
    }

    let imageUrl = null;
    if (req.file || (req.files && req.files.image && req.files.image[0])) {
      const imagePath = req.file ? req.file.path : req.files.image[0].path;
      const uploadedImage = await uploadOnCloudinary(imagePath);
      if (!uploadedImage?.url) {
        return res.status(400).json(new ApiError(400, "Error uploading image"));
      }
      imageUrl = uploadedImage.url;
    }

    const newSubService = await SubServiceType.create({
      serviceTypeId,
      name,
      image: imageUrl,
      groomingDetails: parsedDetails,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, newSubService, "SubService created successfully"));
  } catch (error) {
    console.log("Error------", error);
  
    if (error.code === 11000) {
      return res.status(400).json(
        new ApiError(400, "A sub-service with name already exists")
      );
    }
  
    return res.status(400).json(new ApiError(400, error.message || "Something went wrong"));
  }
});


//updatesubservice
const updateSubService = asyncHandler(async (req, res) => {
  console.log("req.body", req.body);

  try {
    const { subServiceId } = req.params;

    const subService = await SubServiceType.findById(subServiceId);
    if (!subService) {
      return res.status(404).json(new ApiError(404, "SubService not found"));
    }

    const { serviceTypeId, groomingDetails } = req.body;
    const rawName = req.body.name;

    const name = rawName?.trim().toLowerCase();

    let parsedDetails;
    try {
      parsedDetails = JSON.parse(groomingDetails);
    } catch {
      return res.status(400).json(new ApiError(400, "Invalid groomingDetails JSON format"));
    }

    if (!name || !serviceTypeId || !Array.isArray(parsedDetails) || parsedDetails.length === 0) {
      return res.status(400).json(new ApiError(400, "Missing or invalid required fields"));
    }

    const weightTypes = parsedDetails.map(detail => detail.weightType.trim().toLowerCase());
    const uniqueWeightTypes = new Set(weightTypes);
    if (weightTypes.length !== uniqueWeightTypes.size) {
      return res.status(400).json(new ApiError(400, "Duplicate weightType found"));
    }

    const duplicateSubService = await SubServiceType.findOne({
      _id: { $ne: subServiceId },
      serviceTypeId,
      name,
    });

    if (duplicateSubService) {
      return res.status(400).json(new ApiError(400, "subservice with same name already exist"));
    }

    let imageUrl = subService.image;

    if (req.file || req.files?.image?.[0]?.path) {
      if (subService.image) {
        await deleteFromCloudinary(subService.image);
      }

      const imagePath = req.file ? req.file.path : req.files.image[0].path;
      const uploadedImage = await uploadOnCloudinary(imagePath);

      if (!uploadedImage?.url) {
        return res.status(400).json(new ApiError(400, "Error uploading image"));
      }

      imageUrl = uploadedImage.url;
    }

    const updatedSubService = await SubServiceType.findByIdAndUpdate(
      subServiceId,
      {
        serviceTypeId,
        name,
        image: imageUrl,
        groomingDetails: parsedDetails,
      },
      { new: true }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, updatedSubService, "SubService updated successfully"));
  } catch (error) {
    console.log("Error------", error);
  
    if (error.code === 11000) {
      return res.status(400).json(
        new ApiError(400, "A sub-service with name already exists.")
      );
    }
  
    return res.status(400).json(new ApiError(400, error.message || "Something went wrong"));
  }
});


//getSubServicebyID
const getSubServiceById = asyncHandler(async (req, res) => {
  console.log("req.params...", req.params)

  try {
    const { subServiceId } = req.params

    const subService = await SubServiceType.findById(subServiceId)

    if (!subService) {
      return res.status(404).json(new ApiError(404, "No SubService found"));
    }

    return res.status(200).json(new ApiResponse(200, subService, "subService fetched successfully"))
  } catch (error) {
    console.error("Find pet error:", error);
    return res.status(500).json(new ApiError(500, "An unexpected error occurred"));
  }
})


//getallSubService
const getAllSubService = asyncHandler(async (req, res) => {
  console.log("req.body", req.body);

  try {
    const { search = "" } = req.query;
    const { filter = {}, serviceId, sortOrder = -1 } = req.body;

    let searchCondition = {};

    if (search && search !== "undefined") {
      const regex = new RegExp(search, "i");
      searchCondition.name = { $regex: regex };
    }

    if (serviceId) {
      searchCondition.serviceTypeId = serviceId;
    }

    const finalQuery = {
      ...searchCondition,
      ...filter,
    };

    const subServices = await SubServiceType.find(finalQuery)
      .sort({ createdAt: sortOrder })
      .populate("serviceTypeId");

    return res.status(200).json(
      new ApiResponse(200, subServices, "Subservices fetched successfully")
    );
  } catch (error) {
    console.log("findAllSubService Error:", error);
    return res.status(500).json(
      new ApiError(500, error.message || "Internal Server Error")
    );
  }
});


//deleteSubService
const deleteSubService = asyncHandler(async (req, res) => {
  try {
    const { subServiceId } = req.params;

    if (!subServiceId || subServiceId === "undefined") {
      return res
        .status(400)
        .json(new ApiError(400, "SubService ID not provided"));
    }

    const subService = await SubServiceType.findById(subServiceId);
    if (!subService) {
      return res
        .status(404)
        .json(new ApiError(404, "SubService not found"));
    }

    if (subService.image) {
      try {
        await deleteFromCloudinary(subService.image);
      } catch (cloudErr) {
        console.error("Cloudinary deletion failed:", cloudErr);
      }
    }

    await SubServiceType.findByIdAndDelete(subServiceId);

    return res.status(200).json(
      new ApiResponse(200, {}, "SubService deleted successfully")
    );
  } catch (error) {
    console.log("deleteSubService Error:", error);
    return res
      .status(500)
      .json(new ApiError(500, error.message || "Internal Server Error"));
  }
});

export {
  createSubService,
  updateSubService,
  getSubServiceById,
  getAllSubService,
  deleteSubService
}