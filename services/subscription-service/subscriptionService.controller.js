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
    trainer,
    sessionType,
    description,
    city, country, streetName,
    isActive,
    date,
    startTime,
    endTime,
    location
  } = req.body;

  let parsedDate = date;
  if (typeof date === 'string') {
    try {
      parsedDate = JSON.parse(date);
    } catch {
      return res.status(400).json(new ApiError(400, "Invalid date format"));
    }
  }

  // Parse location if string (from FormData)
  let parsedLocation = location;
  if (typeof location === 'string') {
    try {
      parsedLocation = JSON.parse(location);
    } catch {
      return res.status(400).json(new ApiError(400, "Invalid location format"));
    }
  }

  // Validate required fields
  if (!name || !categoryId || !sessionType || !price || !parsedDate || !trainer || !startTime || !endTime) {
    return res.status(400).json(new ApiError(400, "Missing required fields"));
  }

  if (!Array.isArray(parsedDate) || (parsedDate.length !== 1 && parsedDate.length !== 2)) {
    return res.status(400).json(new ApiError(400, "Date must be a single date or a range of two dates"));
  }

  if (
    !parsedLocation?.type ||
    parsedLocation.type !== "Point" ||
    !Array.isArray(parsedLocation.coordinates) ||
    parsedLocation.coordinates.length !== 2
  ) {
    return res.status(400).json(new ApiError(400, "Invalid location coordinates"));
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

  const newServiceType = await Subscription.create({
    name,
    categoryId,
    sessionType,
    trainer,
    price,
    city,
    country,
    streetName,
    location: parsedLocation,
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
  const {
    name, categoryId, trainer, price, sessionType, description,
    country, city, streetName, isActive,
    date, startTime, endTime,
    location
  } = req.body;

  let parsedDate = date;
  if (typeof date === 'string') {
    try {
      parsedDate = JSON.parse(date);
    } catch {
      return res.status(400).json(new ApiError(400, "Invalid date format"));
    }
  }

  let parsedLocation = location;
  if (typeof location === 'string') {
    try {
      parsedLocation = JSON.parse(location);
    } catch {
      return res.status(400).json(new ApiError(400, "Invalid location format"));
    }
  }

  if (!name || !categoryId || !sessionType || !price || !trainer || !parsedDate || !country || !city || !streetName || !startTime || !endTime) {
    return res.status(400).json(new ApiError(400, "Missing required fields"));
  }

  if (!Array.isArray(parsedDate) || (parsedDate.length !== 1 && parsedDate.length !== 2)) {
    return res.status(400).json(new ApiError(400, "Date must be a single date or a range of two dates"));
  }

  if (
    !parsedLocation?.type ||
    parsedLocation.type !== "Point" ||
    !Array.isArray(parsedLocation.coordinates) ||
    parsedLocation.coordinates.length !== 2
  ) {
    return res.status(400).json(new ApiError(400, "Invalid location coordinates"));
  }

  const service = await Subscription.findById(id);
  if (!service) {
    return res.status(404).json(new ApiError(404, "Service not found"));
  }

  let mediaUrl = service.media;
  if (req.file || (req.files && req.files.media && req.files.media[0])) {
    if (service.media) await deleteFromCloudinary(service.media);
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
      trainer,
      price,
      city,
      country,
      streetName,
      location: parsedLocation,
      media: mediaUrl,
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
  const services = await Subscription.find().populate("categoryId city country sessionType trainer");
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

// getSubscriptionsByCoordinates
const getSubscriptionsByCoordinates = asyncHandler(async (req, res) => {
  const { latitude, longitude, maxDistance = 5000 } = req.query;

  if (!latitude || !longitude) {
    return res
      .status(400)
      .json(new ApiError(400, "Latitude and longitude are required"));
  }

  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  const nearbySubscriptions = await Subscription.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lon, lat], // GeoJSON format: [longitude, latitude]
        },
        $maxDistance: parseInt(maxDistance), // distance in meters
      },
    },
  }).populate("categoryId city country sessionType trainer");

  return res.status(200).json(
    new ApiResponse(
      200,
      nearbySubscriptions,
      "Subscriptions near your location"
    )
  );
});



export {
  getSubscriptionsByCategoryId,
  createSubscription,
  getSubscriptionsByCoordinates,
  getAllSubscription,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
}; 