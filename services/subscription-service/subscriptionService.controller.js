import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../../utils/cloudinary.js";
import { Subscription } from "../../models/subscription.model.js";

// Create Subscription
const createServiceType = asyncHandler(async (req, res) => {
  const { name, categoryId, sessionType, duration, price, subscriptionLink, description,location, isActive } = req.body;

  if (!name || !categoryId || !sessionType || !duration || !price) {
    return res.status(400).json(new ApiError(400, "Missing required fields"));
  }

  let mediaUrl = null;
  if (req.file || (req.files && req.files.media && req.files.media[0])) {
    const mediaPath = req.file ? req.file.path : req.files.media[0].path;
   console.log("media path",mediaPath)
     console.log(" req.file", req.file)
    const uploadedMedia = await uploadOnCloudinary(mediaPath);
    if (!uploadedMedia?.url) {
      return res.status(400).json(new ApiError(400, "Error uploading media"));
    }
    mediaUrl = uploadedMedia.url;
  }

  if (isActive && (!categoryId || !sessionType)) {
    return res.status(400).json(new ApiError(400, "Cannot publish without category and session type"));
  }

  const newServiceType = await Subscription.create({
    name,
    categoryId,
    sessionType,
    duration,
    price,
    location,
    subscriptionLink,
    media: mediaUrl,
    description,
    isActive: isActive !== undefined ? isActive : true,
    created_by: req.user?._id,
  });

  return res.status(201).json(new ApiResponse(201, newServiceType, "Service created successfully"));
});

// Get all ServiceTypes
const getAllServiceTypes = asyncHandler(async (req, res) => {
  const services = await Subscription.find().populate("categoryId sessionType duration");
  return res.status(200).json(new ApiResponse(200, services, "All services fetched successfully"));
});

// Get Subscription by ID
const getServiceTypeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const service = await Subscription.findById(id).populate("categoryId sessionType");
  if (!service) {
    return res.status(404).json(new ApiError(404, "Service not found"));
  }
  return res.status(200).json(new ApiResponse(200, service, "Service fetched successfully"));
});

// Update Subscription
const updateServiceType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, categoryId, sessionType, duration, price, subscriptionLink, description,location, isActive } = req.body;

  const service = await Subscription.findById(id);
  if (!service) {
    return res.status(404).json(new ApiError(404, "Service not found"));
  }

  let mediaUrl = service.media;
  if (req.file || (req.files && req.files.media && req.files.media[0])) {
    if (service.media) {
      await deleteFromCloudinary(service.media);
    }
    const mediaPath = req.file ? req.file.path : req.files.media[0].path;
    const uploadedMedia = await uploadOnCloudinary(mediaPath);
    if (!uploadedMedia?.url) {
      return res.status(400).json(new ApiError(400, "Error uploading media"));
    }
    mediaUrl = uploadedMedia.url;
  }

  if (isActive && (!categoryId || !sessionType)) {
    return res.status(400).json(new ApiError(400, "Cannot publish without category and session type"));
  }

  const updatedService = await Subscription.findByIdAndUpdate(
    id,
    {
      name,
      categoryId,
      sessionType,
      duration,
      price,
      subscriptionLink,
      media: mediaUrl,
      location,
      description,
      isActive,
      updated_by: req.user?._id,
    },
    { new: true }
  );

  return res.status(200).json(new ApiResponse(200, updatedService, "Service updated successfully"));
});

// Delete Subscription
const deleteServiceType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const service = await Subscription.findById(id);
  if (!service) {
    return res.status(404).json(new ApiError(404, "Service not found"));
  }
  if (service.media) {
    await deleteFromCloudinary(service.media);
  }
  await Subscription.findByIdAndDelete(id);
  return res.status(200).json(new ApiResponse(200, {}, "Service deleted successfully"));
});

export {
  createServiceType,
  getAllServiceTypes,
  getServiceTypeById,
  updateServiceType,
  deleteServiceType,
}; 