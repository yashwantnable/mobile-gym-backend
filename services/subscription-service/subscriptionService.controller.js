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
  let {
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
    Address,
    isSingleClass
  } = req.body;

  // Convert "true"/"false" string to boolean
  isSingleClass = isSingleClass === 'true' || isSingleClass === true;
  isActive = isActive === 'true' || isActive === true;

  // Parse date (JSON string to array)
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
    price === undefined ||
    !parsedDate ||
    !trainer ||
    !startTime ||
    !endTime ||
    !Address
  ) {
    return res.status(400).json(new ApiError(400, "Missing required fields"));
  }

  if (typeof isSingleClass !== "boolean") {
    return res.status(400).json(new ApiError(400, "Invalid isSingleClass flag"));
  }

  if (!mongoose.Types.ObjectId.isValid(Address)) {
    return res.status(400).json(new ApiError(400, "Invalid Address ID"));
  }

  if (!Array.isArray(parsedDate)) {
    return res.status(400).json(new ApiError(400, "Date must be an array"));
  }

  if (isSingleClass && parsedDate.length !== 1) {
    return res.status(400).json(new ApiError(400, "Single class must have exactly one date"));
  }

  if (!isSingleClass && parsedDate.length !== 2) {
    return res.status(400).json(new ApiError(400, "Class duration must have exactly two dates"));
  }

  // Handle optional media upload
  let mediaUrl = null;
  const fileToProcess = req.file || (req.files?.media?.[0]);

  if (fileToProcess) {
    const uploadedMedia = await uploadOnCloudinary(fileToProcess.path);
    if (!uploadedMedia?.url) {
      return res.status(400).json(new ApiError(400, "Error uploading media"));
    }
    mediaUrl = uploadedMedia.url;
  }

  const newSubscription = await Subscription.create({
    name,
    categoryId,
    sessionType,
    trainer,
    price,
    Address,
    media: mediaUrl,
    description,
    date: parsedDate,
    startTime,
    endTime,
    isSingleClass,
    isActive,
    created_by: req.user?._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newSubscription, "Service created successfully"));
});


// Update Subscription
const updateSubscription = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let {
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
    Address,
    isSingleClass,
  } = req.body;

  // Parse boolean string
  const parsedIsSingleClass = isSingleClass === "true" || isSingleClass === true;

  // Parse date array string
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
    !parsedDate ||
    !trainer ||
    !startTime ||
    !endTime ||
    !Address ||
    typeof parsedIsSingleClass !== "boolean"
  ) {
    return res.status(400).json(new ApiError(400, "Missing required fields"));
  }

  if (!mongoose.Types.ObjectId.isValid(Address)) {
    return res.status(400).json(new ApiError(400, "Invalid Address ID"));
  }

  if (!Array.isArray(parsedDate)) {
    return res.status(400).json(new ApiError(400, "Date must be an array"));
  }

  if (parsedIsSingleClass && parsedDate.length !== 1) {
    return res
      .status(400)
      .json(new ApiError(400, "Single class must have exactly one date"));
  }

  if (!parsedIsSingleClass && parsedDate.length !== 2) {
    return res
      .status(400)
      .json(new ApiError(400, "Class duration must have exactly two dates"));
  }

  // Find existing subscription
  const existing = await Subscription.findById(id);
  if (!existing) {
    return res.status(404).json(new ApiError(404, "Service not found"));
  }

  // Handle media update
  let mediaUrl = existing.media;
  const fileToProcess =
    req.file || (req.files && req.files.media && req.files.media[0]);

  if (fileToProcess) {
    if (existing.media) {
      await deleteFromCloudinary(existing.media);
    }

    const uploadedMedia = await uploadOnCloudinary(fileToProcess.path);
    if (!uploadedMedia?.url) {
      return res.status(400).json(new ApiError(400, "Error uploading media"));
    }
    mediaUrl = uploadedMedia.url;
  }

  const updatedSubscription = await Subscription.findByIdAndUpdate(
    id,
    {
      name,
      categoryId,
      sessionType,
      trainer,
      price,
      Address,
      media: mediaUrl,
      description,
      date: parsedDate,
      startTime,
      endTime,
      isSingleClass: parsedIsSingleClass,
      isActive,
      updated_by: req.user?._id,
    },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedSubscription, "Service updated successfully")
    );
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
    const { isExpired } = req.query;
    const now = new Date();

    let filter = {};

    if (isExpired === "true") {
      filter = {
        $expr: {
          $lt: [
            {
              $cond: [
                { $eq: [{ $size: "$date" }, 1] },
                { $arrayElemAt: ["$date", 0] },
                { $arrayElemAt: ["$date", 1] },
              ],
            },
            now,
          ],
        },
      };
    } else if (isExpired === "false") {
      filter = {
        $expr: {
          $gte: [
            {
              $cond: [
                { $eq: [{ $size: "$date" }, 1] },
                { $arrayElemAt: ["$date", 0] },
                { $arrayElemAt: ["$date", 1] },
              ],
            },
            now,
          ],
        },
      };
    }

    const subscriptions = await Subscription.find(filter)
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

    return res.status(200).json(
      new ApiResponse(
        200,
        enrichedSubscriptions,
        `All ${
          isExpired === "true"
            ? "expired"
            : isExpired === "false"
            ? "active"
            : ""
        } subscriptions fetched successfully with reviews and ratings`
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
    .populate("categoryId trainer sessionType Address")
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

const filterAndSortSubscriptions = asyncHandler(async (req, res) => {
  const {
    sortBy = "relevance",
    order = "desc",
    minPrice,
    maxPrice,
    categoryId,
    sessionTypeId,
    trainerId,
    isExpired,
    isSingleClass,
    location,
    page = 1,
    limit = 10,
  } = req.body || {};

  const now = new Date();

  // Auto-update expired subscriptions
  const allSubscriptions = await Subscription.find({}, { _id: 1, date: 1 });
  const expiredIds = allSubscriptions
    .filter((sub) => {
      const dates = sub.date || [];
      const lastDate = dates.length === 2 ? dates[1] : dates[0];
      return lastDate && new Date(lastDate) < now;
    })
    .map((sub) => sub._id);

  if (expiredIds.length > 0) {
    await Subscription.updateMany(
      { _id: { $in: expiredIds } },
      { $set: { isExpired: true } }
    );
  }

  const normalizeToArray = (input) =>
    Array.isArray(input) ? input : input ? [input] : [];

 const buildFilter = () => {
  const filter = {};

  if (isExpired !== undefined) {
    if (Array.isArray(isExpired)) {
      filter.isExpired = { $in: isExpired.map((v) => v === "true" || v === true) };
    } else {
      filter.isExpired = isExpired === "true" || isExpired === true;
    }
  }

  if (isSingleClass !== undefined) {
    if (Array.isArray(isSingleClass)) {
      filter.isSingleClass = {
        $in: isSingleClass.map((v) => v === "true" || v === true),
      };
    } else {
      filter.isSingleClass = isSingleClass === "true" || isSingleClass === true;
    }
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  if (categoryId) {
    const values = normalizeToArray(categoryId);
    if (values.length === 1) filter.categoryId = values[0];
    else filter.categoryId = { $in: values };
  }

  if (sessionTypeId) {
    const values = normalizeToArray(sessionTypeId);
    if (values.length === 1) filter.sessionType = values[0];
    else filter.sessionType = { $in: values };
  }

  if (trainerId) {
    const values = normalizeToArray(trainerId);
    if (values.length === 1) filter.trainer = values[0];
    else filter.trainer = { $in: values };
  }

  if (location) {
    const values = normalizeToArray(location);
    if (values.length === 1) filter.Address = values[0];
    else filter.Address = { $in: values };
  }

  return filter;
};
 

  let filter = buildFilter();
  const skip = (Number(page) - 1) * Number(limit);

  let subscriptions = await Subscription.find(filter)
    .populate("categoryId Address sessionType trainer")
    .skip(skip)
    .limit(Number(limit))
    .lean();

  // Fallback for isExpired=false
  if (
    subscriptions.length === 0 &&
    (isExpired === false || isExpired === "false")
  ) {
    delete filter.isExpired;
    filter.isExpired = { $ne: true };

    subscriptions = await Subscription.find(filter)
      .populate("categoryId Address sessionType trainer")
      .skip(skip)
      .limit(Number(limit))
      .lean();
  }

  const subscriptionIds = subscriptions.map((s) => s._id);
  const allReviews = await SubscriptionRatingReview.find({
    subscriptionId: { $in: subscriptionIds },
  }).lean();

  const reviewMap = {};
  for (const review of allReviews) {
    const subId = review.subscriptionId.toString();
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
      averageRating: Number(averageRating.toFixed(2)),
    };
  });

  // Sorting
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
    subscriptions.sort((a, b) =>
      order === "asc"
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  const totalCount = await Subscription.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subscriptions,
        pagination: {
          total: totalCount,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(totalCount / limit),
        },
      },
      "Filtered and sorted subscriptions"
    )
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

// Search Subscriptions by Name (for dropdown)
const searchSubscriptions = asyncHandler(async (req, res) => {
  const { keyword } = req.query;

  if (!keyword) {
    return res
      .status(400)
      .json(new ApiError(400, "Search keyword is required"));
  }

  const regex = new RegExp(keyword, "i");

  const subscriptions = await Subscription.find({ name: { $regex: regex } })
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

  const enriched = subscriptions.map((sub) => {
    const reviews = reviewMap[sub._id.toString()] || [];
    const totalReviews = reviews.length;
    const averageRating = totalReviews
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2)
      : "0.00";

    return {
      ...sub,
      reviews,
      totalReviews,
      averageRating,
    };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      enriched,
      "Subscriptions fetched with full details"
    )
  );
});

const getSubscriptionsByLocationId = asyncHandler(async (req, res) => {
  const { locationId } = req.params;

  if (!locationId) {
    return res.status(400).json(new ApiError(400, "Location ID is required"));
  }

  // Find subscriptions where Address._id === locationId
  const subscriptions = await Subscription.find({ Address: locationId })
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
    .sort({ createdAt: -1 })
    .lean();

  if (!subscriptions.length) {
    return res.status(200).json(
      new ApiResponse(200, [], "No subscriptions found for this location")
    );
  }

  const enriched = await enrichSubscriptionsWithReviews(subscriptions);

  return res.status(200).json(
    new ApiResponse(
      200,
      enriched,
      "Subscriptions fetched by Location ID"
    )
  );
});


export {
  getSubscriptionsByLocationId,
  searchSubscriptions,
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
