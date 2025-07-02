import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../../utils/cloudinary.js";
import { Subscription } from "../../models/subscription.model.js";
import { SubscriptionRatingReview } from "../../models/ratingReview.model.js";
import mongoose from "mongoose";
import { LocationMaster } from "../../models/master.model.js";

const enrichSubscriptionsWithReviews = async (subscriptions) => {
  const allReviews = await SubscriptionRatingReview.find({
    subscriptionId: { $in: subscriptions.map((s) => s._id) },
  }).lean();

  const reviewMap = {};
  for (const review of allReviews) {
    const subId = review.subscriptionId?.toString();
    if (!subId) continue;
    if (!reviewMap[subId]) reviewMap[subId] = [];
    reviewMap[subId].push(review);
  }

  return subscriptions.map((sub) => {
    const reviews = reviewMap[sub._id.toString()] || [];
    const totalReviews = reviews.length;
    const averageRating = totalReviews
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(
          2
        )
      : "0.00";

    return {
      ...sub,
      reviews,
      totalReviews,
      averageRating,
    };
  });
};

// Create Subscription
const createSubscription = asyncHandler(async (req, res) => {
  const {
    name,
    categoryId,
    price,
    trainer,
    sessionType,
    description,
    isActive,
    date,
    startTime,
    endTime,
    Address, // now expected to be an ObjectId
  } = req.body;

  // Parse and validate date
  let parsedDate = date;
  if (typeof date === "string") {
    try {
      parsedDate = JSON.parse(date);
    } catch {
      return res.status(400).json(new ApiError(400, "Invalid date format"));
    }
  }

  if (
    !name ||
    !categoryId ||
    !sessionType ||
    !price ||
    !parsedDate ||
    !trainer ||
    !startTime ||
    !endTime ||
    !Address
  ) {
    return res.status(400).json(new ApiError(400, "Missing required fields"));
  }

  // Validate date format
  if (
    !Array.isArray(parsedDate) ||
    (parsedDate.length !== 1 && parsedDate.length !== 2)
  ) {
    return res
      .status(400)
      .json(
        new ApiError(400, "Date must be a single date or a range of two dates")
      );
  }

  // Validate Address as ObjectId
  if (!mongoose.Types.ObjectId.isValid(Address)) {
    return res.status(400).json(new ApiError(400, "Invalid Address ID"));
  }

  // Handle media upload (if any)
  let mediaUrl = null;
  if (req.file || (req.files && req.files.media && req.files.media[0])) {
    const mediaPath = req.file ? req.file.path : req.files.media[0].path;
    const uploadedMedia = await uploadOnCloudinary(mediaPath);
    if (!uploadedMedia?.url) {
      return res.status(400).json(new ApiError(400, "Error uploading media"));
    }
    mediaUrl = uploadedMedia.url;
  }

  // Create the subscription
  const newServiceType = await Subscription.create({
    name,
    categoryId,
    sessionType,
    trainer,
    price,
    Address, // just the ObjectId
    media: mediaUrl,
    description,
    date: parsedDate,
    startTime,
    endTime,
    isActive: isActive !== undefined ? isActive : true,
    created_by: req.user?._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newServiceType, "Service created successfully"));
});

// Update Subscription
const updateSubscription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    categoryId,
    trainer,
    price,
    sessionType,
    description,
    isActive,
    date,
    startTime,
    endTime,
    Address, // now expected to be just an ObjectId
  } = req.body;

  // Parse and validate date
  let parsedDate = date;
  if (typeof parsedDate === "string") {
    try {
      parsedDate = JSON.parse(parsedDate);
    } catch {
      return res.status(400).json(new ApiError(400, "Invalid date format"));
    }
  }

  // Validate required fields
  if (
    !name ||
    !categoryId ||
    !sessionType ||
    !price ||
    !trainer ||
    !parsedDate ||
    !startTime ||
    !endTime ||
    !Address
  ) {
    return res.status(400).json(new ApiError(400, "Missing required fields"));
  }

  // Validate date format
  if (
    !Array.isArray(parsedDate) ||
    (parsedDate.length !== 1 && parsedDate.length !== 2)
  ) {
    return res
      .status(400)
      .json(
        new ApiError(400, "Date must be a single date or a range of two dates")
      );
  }

  // Validate Address ID
  if (!mongoose.Types.ObjectId.isValid(Address)) {
    return res.status(400).json(new ApiError(400, "Invalid Address ID"));
  }

  // Check if service exists
  const service = await Subscription.findById(id);
  if (!service) {
    return res.status(404).json(new ApiError(404, "Service not found"));
  }

  // Handle media update
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

  // Update the subscription
  const updatedService = await Subscription.findByIdAndUpdate(
    id,
    {
      name,
      categoryId,
      sessionType,
      trainer,
      price,
      Address, // only the ObjectId
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

  return res
    .status(200)
    .json(new ApiResponse(200, updatedService, "Service updated successfully"));
});

// Get all ServiceTypes
// const getAllSubscription = asyncHandler(async (req, res) => {
//   const services = await Subscription.find().populate("categoryId city country sessionType trainer");
//   return res.status(200).json(new ApiResponse(200, services, "All services fetched successfully"));
// });

// const getAllSubscription = asyncHandler(async (req, res) => {
//   try {
//     const subscriptions = await Subscription.find()
//       .populate("categoryId sessionType trainer Address")
//       .lean();

//     if (!subscriptions.length) {
//       return res
//         .status(200)
//         .json(new ApiResponse(200, [], "No subscriptions found"));
//     }

//     const allReviews = await SubscriptionRatingReview.find({
//       subscriptionId: { $in: subscriptions.map((s) => s._id) },
//     }).lean();

//     const reviewMap = {};
//     for (const review of allReviews) {
//       const subId = review.subscriptionId?.toString();
//       if (!subId) continue;
//       if (!reviewMap[subId]) reviewMap[subId] = [];
//       reviewMap[subId].push(review);
//     }

//     const enrichedSubscriptions = subscriptions.map((sub) => {
//       const reviews = reviewMap[sub._id.toString()] || [];
//       const totalReviews = reviews.length;
//       const averageRating = totalReviews
//         ? (
//             reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
//           ).toFixed(2)
//         : "0.00";

//       return {
//         ...sub,
//         reviews,
//         totalReviews,
//         averageRating,
//       };
//     });

//     return res
//       .status(200)
//       .json(
//         new ApiResponse(
//           200,
//           enrichedSubscriptions,
//           "All services fetched successfully with reviews and ratings"
//         )
//       );
//   } catch (error) {
//     console.error("Error fetching subscriptions:", error);
//     return res
//       .status(500)
//       .json(new ApiError(500, "Failed to fetch subscriptions"));
//   }
// });
const getAllSubscription = asyncHandler(async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate([
        { path: "categoryId" },
        { path: "sessionType" },
        { path: "trainer" },
        {
          path: "Address",
          populate: [
            { path: "city", select: "name" },
            { path: "country", select: "name" },
          ],
        },
      ])
      .lean();

    if (!subscriptions.length) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No subscriptions found"));
    }

    const allReviews = await SubscriptionRatingReview.find({
      subscriptionId: { $in: subscriptions.map((s) => s._id) },
    }).lean();

    const reviewMap = {};
    for (const review of allReviews) {
      const subId = review.subscriptionId?.toString();
      if (!subId) continue;
      if (!reviewMap[subId]) reviewMap[subId] = [];
      reviewMap[subId].push(review);
    }

    const enrichedSubscriptions = subscriptions.map((sub) => {
      const reviews = reviewMap[sub._id.toString()] || [];
      const totalReviews = reviews.length;
      const averageRating = totalReviews
        ? (
            reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
          ).toFixed(2)
        : "0.00";

      return {
        ...sub,
        reviews,
        totalReviews,
        averageRating,
      };
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          enrichedSubscriptions,
          "All services fetched successfully with reviews and ratings"
        )
      );
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Failed to fetch subscriptions"));
  }
});


// Get Subscription by ID
const getSubscriptionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sub = await Subscription.findById(id)
    .populate("categoryId trainer sessionType")
    .lean();

  if (!sub) {
    return res.status(404).json(new ApiError(404, "Service not found"));
  }

  const enriched = await enrichSubscriptionsWithReviews([sub]);

  return res
    .status(200)
    .json(new ApiResponse(200, enriched[0], "Service fetched successfully"));
});

// get subscription by dates
const getSubscriptionsByDate = asyncHandler(async (req, res) => {
  const { date } = req.body;

  if (
    !date ||
    !Array.isArray(date) ||
    (date.length !== 1 && date.length !== 2)
  ) {
    return res
      .status(400)
      .json(new ApiError(400, "Date must be an array with 1 or 2 items"));
  }

  let query;
  if (date.length === 1) {
    query = {
      $or: [
        { date: { $eq: date[0] } },
        {
          $and: [
            { "date.0": { $lte: date[0] } },
            { "date.1": { $gte: date[0] } },
          ],
        },
      ],
    };
  } else {
    const [fromDate, toDate] = date;
    query = {
      $or: [
        {
          $and: [
            { "date.0": { $lte: toDate } },
            { "date.1": { $gte: fromDate } },
          ],
        },
        { date: { $gte: fromDate, $lte: toDate } },
      ],
    };
  }

  const subscriptions = await Subscription.find(query).populate(
    "categoryId sessionType trainer"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, subscriptions, "Subscriptions fetched by date"));
});

// Get Subscriptions by Category ID
const getSubscriptionsByCategoryId = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  if (!categoryId) {
    return res.status(400).json(new ApiError(400, "Category ID is required"));
  }

  const subscriptions = await Subscription.find({ categoryId })
    .populate("categoryId trainer sessionType")
    .sort({ createdAt: -1 })
    .lean();

  if (!subscriptions.length) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, [], "No subscriptions found for this category")
      );
  }

  const enriched = await enrichSubscriptionsWithReviews(subscriptions);

  return res
    .status(200)
    .json(
      new ApiResponse(200, enriched, "Subscriptions fetched by category ID")
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

  const subscriptions = await Subscription.find({
    Address: {
      $near: {
        $geometry: { type: "Point", coordinates: [lon, lat] },
        $maxDistance: parseInt(maxDistance),
      },
    },
  })
    .populate("categoryId sessionType trainer")
    .lean();

  const enriched = await enrichSubscriptionsWithReviews(subscriptions);

  return res
    .status(200)
    .json(new ApiResponse(200, enriched, "Subscriptions near your Address"));
});

// getSubscriptionsByUserMiles
const getSubscriptionsByUserMiles = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { coordinates, miles = 5 } = req.body;

    // 1. Validate coordinates
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({ message: "Valid coordinates [longitude, latitude] are required." });
    }

    const [lon, lat] = coordinates.map(Number);
    const distanceInMeters = miles * 1609.34;

    // 2. Step 1: Find nearby LocationMaster documents
    const nearbyLocations = await LocationMaster.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lon, lat],
          },
          $maxDistance: distanceInMeters,
        },
      },
    }).select("_id");

    const locationIds = nearbyLocations.map(loc => loc._id);

    if (locationIds.length === 0) {
      await session.commitTransaction();
      session.endSession();
      return res.status(200).json(new ApiResponse(200, [], `No subscriptions found within ${miles} mile(s).`));
    }

    // 3. Step 2: Find subscriptions with matching Address IDs
    const subscriptions = await Subscription.find({
      Address: { $in: locationIds },
    })
      .populate("categoryId sessionType trainer Address")
      .session(session)
      .lean();

    // 4. Step 3: Enrich with reviews if needed
    const enriched = await enrichSubscriptionsWithReviews(subscriptions);

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json(
      new ApiResponse(200, enriched, `Subscriptions within ${miles} mile(s) from your location`)
    );

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Get Subscriptions by Coordinates failed:", error);
    return res.status(500).json({
      message: "Failed to fetch subscriptions",
      error: error.message,
    });
  }
});


// get subscription by trainer id
const getSubscriptionsByTrainerId = asyncHandler(async (req, res) => {
  const { trainerId } = req.params;

  if (!trainerId) {
    return res.status(400).json(new ApiError(400, "Trainer ID is required"));
  }

  const subscriptions = await Subscription.find({ trainer: trainerId })
    .populate("categoryId sessionType trainer")
    .sort({ createdAt: -1 })
    .lean();

  if (!subscriptions.length) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, [], "No subscriptions found for this trainer")
      );
  }

  const enriched = await enrichSubscriptionsWithReviews(subscriptions);

  return res
    .status(200)
    .json(
      new ApiResponse(200, enriched, "Subscriptions fetched by trainer ID")
    );
});

// sort by relevance, price, rating filtration
const filterAndSortSubscriptions = asyncHandler(async (req, res) => {
  const {
    sortBy = "relevance",
    order = "desc",
    minPrice,
    maxPrice,
    categoryId,
    sessionTypeId,
    trainerId,
    page = 1,
    limit = 10,
  } = req.body;

  const filter = {};

  if (minPrice) filter.price = { ...filter.price, $gte: Number(minPrice) };
  if (maxPrice) filter.price = { ...filter.price, $lte: Number(maxPrice) };
  if (categoryId) filter.categoryId = categoryId;
  if (sessionTypeId) filter.sessionType = sessionTypeId;
  if (trainerId) filter.trainer = trainerId;

  const skip = (Number(page) - 1) * Number(limit);

  let subscriptions = await Subscription.find(filter)
    .populate("categoryId Address sessionType trainer")
    .skip(skip)
    .limit(Number(limit))
    .lean();

  // Get all ratings for the current page of subscriptions
  const allReviews = await SubscriptionRatingReview.find({
    subscriptionId: { $in: subscriptions.map((s) => s._id) },
  }).lean();

  const reviewMap = {};
  for (const review of allReviews) {
    const subId = review.subscriptionId?.toString();
    if (!reviewMap[subId]) reviewMap[subId] = [];
    reviewMap[subId].push(review);
  }

  subscriptions = subscriptions.map((sub) => {
    const reviews = reviewMap[sub._id.toString()] || [];
    const totalReviews = reviews.length;
    const averageRating = totalReviews
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    return {
      ...sub,
      reviews,
      totalReviews,
      averageRating: averageRating.toFixed(2),
    };
  });

  // Sort logic
  if (sortBy === "price") {
    subscriptions.sort((a, b) =>
      order === "asc" ? a.price - b.price : b.price - a.price
    );
  } else if (sortBy === "rating") {
    subscriptions.sort((a, b) =>
      order === "asc"
        ? a.averageRating - b.averageRating
        : b.averageRating - a.averageRating
    );
  } else {
    // default relevance: sort by createdAt
    subscriptions.sort((a, b) =>
      order === "asc"
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  // Total count for pagination metadata
  const totalCount = await Subscription.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(200, {
      subscriptions,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / limit),
      },
    }, "Filtered and sorted subscriptions")
  );
});


// get Subscriptions By SessionType-Id
const getSubscriptionsBySessionTypeId = asyncHandler(async (req, res) => {
  const { sessionTypeId } = req.params;

  if (!sessionTypeId) {
    return res
      .status(400)
      .json(new ApiError(400, "Session Type ID is required"));
  }

  const subscriptions = await Subscription.find({ sessionType: sessionTypeId })
    .populate("categoryId sessionType trainer")
    .populate("Address")
    .lean();

  if (!subscriptions.length) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, [], "No subscriptions found for this session type")
      );
  }

  const enriched = await enrichSubscriptionsWithReviews(subscriptions);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        enriched,
        "Subscriptions by session type fetched successfully"
      )
    );
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
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Service deleted successfully"));
});

export {
  filterAndSortSubscriptions,
  getSubscriptionsByCategoryId,
  createSubscription,
  getSubscriptionsByCoordinates,
  getSubscriptionsByUserMiles,
  getAllSubscription,
  getSubscriptionById,
  getSubscriptionsByDate,
  updateSubscription,
  deleteSubscription,
  getSubscriptionsByTrainerId,
  getSubscriptionsBySessionTypeId,
};
