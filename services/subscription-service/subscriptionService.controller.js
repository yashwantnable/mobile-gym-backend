import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../../utils/cloudinary.js";
import { Subscription } from "../../models/subscription.model.js";

// Create Subscription
const createSubscription = asyncHandler(async (req, res) => {
  const {
    name,
    categoryId,
    price,
    sessionType,
    description,
    city,country,streetName,
    isActive,
    date, 
    startTime,
    endTime
  } = req.body;

  let parsedDate = date;
  if (typeof date === 'string') {
    try {
      parsedDate = JSON.parse(date);
    } catch (err) {
      return res.status(400).json(new ApiError(400, "Invalid date format"));
    }
  }

  if (!name || !categoryId ||!sessionType|| !price || !parsedDate || !startTime || !endTime) {
    return res.status(400).json(new ApiError(400, "Missing required fields"));
  }

  if (!Array.isArray(parsedDate) || (parsedDate.length !== 1 && parsedDate.length !== 2)) {
    return res.status(400).json(new ApiError(400, "Date must be a single date or a range of two dates"));
  }

  let mediaUrl = null;
  if (req.file || (req.files && req.files.media && req.files.media[0])) {
    const mediaPath = req.file ? req.file.path : req.files.media[0].path;
    const uploadedMedia = await uploadOnCloudinary(mediaPath);
    if (!uploadedMedia?.url) {
      return res.status(400).json(new ApiError(400, "Error uploading media"));
    }
    mediaUrl = uploadedMedia.url;
  }

  // ✅ Create Subscription
  const newServiceType = await Subscription.create({
    name,
    categoryId,
    sessionType,
    price,
    city,country,streetName,
    media: mediaUrl,
    description,
    date: parsedDate, 
    startTime,
    endTime,
    isActive: isActive !== undefined ? isActive : true,
    created_by: req.user?._id,
  });

  return res.status(201).json(new ApiResponse(201, newServiceType, "Service created successfully"));
});

// Update Subscription
const updateSubscription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, categoryId, price,sessionType, description, country,city,streetName, isActive, date, startTime, endTime } = req.body;

  // Parse date if it's a JSON string
  let parsedDate = date;
  if (typeof date === 'string') {
    try {
      parsedDate = JSON.parse(date);
    } catch (err) {
      return res.status(400).json(new ApiError(400, "Invalid date format"));
    }
  }

  // Validate required fields
  if (!name || !categoryId ||!sessionType|| !price || !parsedDate|| !country||!city||!streetName|| !startTime || !endTime) {
    return res.status(400).json(new ApiError(400, "Missing required fields"));
  }

  if (!Array.isArray(parsedDate) || (parsedDate.length !== 1 && parsedDate.length !== 2)) {
    return res.status(400).json(new ApiError(400, "Date must be a single date or a range of two dates"));
  }

  // Fetch existing subscription to get media URL
  const service = await Subscription.findById(id);
  if (!service) {
    return res.status(404).json(new ApiError(404, "Service not found"));
  }

  let mediaUrl = service.media;
  if (req.file || (req.files && req.files.media && req.files.media[0])) {
    // Delete existing media from Cloudinary
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

  const updatedService = await Subscription.findByIdAndUpdate(
    id,
    {
      name,
      categoryId,
      sessionType,
      price,
      media: mediaUrl,
      city,country,streetName,
      description,
      isActive,
      date: parsedDate,
      startTime,
      endTime,
      updated_by: req.user?._id,
    },
    { new: true }
  );

  return res.status(200).json(new ApiResponse(200, updatedService, "Service updated successfully"));
});


// Get all ServiceTypes
const getAllSubscription = asyncHandler(async (req, res) => {
  const services = await Subscription.find().populate("categoryId city country sessionType");
  return res.status(200).json(new ApiResponse(200, services, "All services fetched successfully"));
});

// Get Subscription by ID
const getSubscriptionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const service = await Subscription.findById(id).populate("categoryId");
  if (!service) {
    return res.status(404).json(new ApiError(404, "Service not found"));
  }
  return res.status(200).json(new ApiResponse(200, service, "Service fetched successfully"));
});



// Delete Subscription
const deleteSubscription = asyncHandler(async (req, res) => {
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


// Get Subscriptions by Category ID
const getSubscriptionsByCategoryId = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  if (!categoryId) {
    return res.status(400).json(new ApiError(400, "Category ID is required"));
  }

  const subscriptions = await Subscription.find({ categoryId })
    .populate("categoryId")
    .sort({ createdAt: -1 });

  if (!subscriptions.length) {
    return res.status(200).json(
      new ApiResponse(200, [], "No subscriptions found for this category")
    );
  }

  return res.status(200).json(
    new ApiResponse(200, subscriptions, "Subscriptions fetched by category ID")
  );
});


export {
  getSubscriptionsByCategoryId,
  createSubscription,
  getAllSubscription,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
}; 