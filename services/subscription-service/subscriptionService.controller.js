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
import haversine from "haversine-distance";
import { LocationMaster } from "../../models/master.model.js";
import { SubscriptionBooking } from "../../models/booking.model.js";

const haversineDistance = (coords1, coords2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;

  const R = 6371000; // meters
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

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

const parseTime = (timeStr = "") => {
  const [h = 0, m = 0] = timeStr.split(":").map(Number);
  return { h, m };
};

const isFutureDateTime = (dateISO, timeStr) => {
  const now = new Date();
  const date = new Date(dateISO);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (date < today) return false;
  if (date.toDateString() === now.toDateString()) {
    const { h, m } = parseTime(timeStr);
    date.setHours(h, m, 0, 0);
    return date > now;
  }

  return true;
};

const validateDateAndTime = ({
  parsedDate,
  startTime,
  endTime,
  isSingleClass,
}) => {
  for (const d of parsedDate) {
    if (!isFutureDateTime(d, startTime)) {
      throw new ApiError(400, "Date/time must be in the future");
    }
  }

  if (!isSingleClass && new Date(parsedDate[1]) < new Date(parsedDate[0])) {
    throw new ApiError(400, "End date must be on or after start date");
  }

  const { h: sh, m: sm } = parseTime(startTime);
  const { h: eh, m: em } = parseTime(endTime);
  if (eh < sh || (eh === sh && em <= sm)) {
    throw new ApiError(400, "endTime must be after startTime");
  }
};

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
    isSingleClass,
  } = req.body;

  const customer = req.user._id;

  isSingleClass = isSingleClass === "true" || isSingleClass === true;
  isActive = isActive === "true" || isActive === true;

  let parsedDate = date;
  if (typeof parsedDate === "string") {
    try {
      parsedDate = JSON.parse(parsedDate);
    } catch {
      return res.status(400).json(new ApiError(400, "Invalid date format"));
    }
  }

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
    return res
      .status(400)
      .json(new ApiError(400, "Invalid isSingleClass flag"));
  }

  if (!mongoose.Types.ObjectId.isValid(Address)) {
    return res.status(400).json(new ApiError(400, "Invalid Address ID"));
  }

  if (!Array.isArray(parsedDate)) {
    return res.status(400).json(new ApiError(400, "Date must be an array"));
  }

  if (isSingleClass && parsedDate.length !== 1) {
    return res
      .status(400)
      .json(new ApiError(400, "Single class must have exactly one date"));
  }

  if (!isSingleClass && parsedDate.length !== 2) {
    return res
      .status(400)
      .json(new ApiError(400, "Class duration must have exactly two dates"));
  }

  validateDateAndTime({ parsedDate, startTime, endTime, isSingleClass });

  // 🔒 Check if this class was already joined through a package
  const alreadyJoinedViaPackage = await PackageBooking.findOne({
    customer,
    "joinClasses.className": name,
  });

  if (alreadyJoinedViaPackage) {
    return res.status(400).json(
      new ApiError(
        400,
        "You have already joined this class through a package"
      )
    );
  }

  // 🔽 Upload media
  let mediaUrl = null;
  const fileToProcess = req.file || req.files?.media?.[0];

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
    .json(
      new ApiResponse(201, newSubscription, "Service created successfully")
    );
});


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

  const parsedIsSingleClass = isSingleClass === "true" || isSingleClass === true;

  let parsedDate = date;
  if (typeof parsedDate === "string") {
    try {
      parsedDate = JSON.parse(parsedDate);
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

  validateDateAndTime({
    parsedDate,
    startTime,
    endTime,
    isSingleClass: parsedIsSingleClass,
  });

  const existing = await Subscription.findById(id);
  if (!existing) {
    return res.status(404).json(new ApiError(404, "Service not found"));
  }

  let mediaUrl = existing.media;
  const fileToProcess = req.file || req.files?.media?.[0];

  if (fileToProcess) {
    if (existing.media) await deleteFromCloudinary(existing.media);
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

  // Notify all subscribed customers
  const subscribedUsers = await SubscriptionBooking.find({
    subscriptionId: id,
    status: "active",
  }).populate("customer");

  for (const sub of subscribedUsers) {
    await NotificationService.sendToCustomer({
      userId: sub.customer._id,
      title: "Subscription Updated 🔄",
      message: `The subscription "${updatedSubscription.name}" has been updated. Please review the new schedule.`,
      type: "Subscription",
    });

    // Optional: Real-time socket emit
    io.to(sub.customer._id.toString()).emit("notification:new", {
      title: "Subscription Updated 🔄",
      message: `The subscription "${updatedSubscription.name}" has been updated.`,
    });
  }

  // Notify assigned trainer (if any)
  if (updatedSubscription.trainer) {
    await NotificationService.sendToTrainer({
      userId: updatedSubscription.trainer,
      title: "Subscription Updated ✏️",
      message: `Your subscription "${updatedSubscription.name}" has been modified.`,
      type: "Subscription",
    });

    // Optional: Real-time socket emit
    io.to(updatedSubscription.trainer.toString()).emit("notification:new", {
      title: "Subscription Updated ✏️",
      message: `Your subscription "${updatedSubscription.name}" has been modified.`,
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedSubscription, "Service updated successfully"));
});


// trainer check in

const trainerCheckin = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  console.log("req.params:",req.params);
  console.log("req.body:",req.body);
  console.log("req.user._id:",req.user._id);
  
  try {
    const { subscriptionId } = req.params;
    const { status, trainerLocation } = req.body;
    const trainerId = req.user._id;
    if (status !== "CHECKIN") {
      return res.status(400).json({ message: "Status must be 'CHECKIN'" });
    }

    // Fetch subscription with Address populated
    const subscription = await Subscription.findById(subscriptionId)
      .populate({ path: "Address", select: "location" }) 
      .session(session);
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    // Ensure Address is populated
    if (!subscription.Address || !subscription.Address.location?.coordinates) {
      return res.status(400).json({ message: "Subscription address or location data is missing" });
    }

    if (subscription.trainerStatus === "CHECKED_IN") {
      return res.status(400).json({ message: "Already checked in" });
    }

    // Check if current user is the assigned trainer
    if (!subscription.trainer || subscription.trainer.toString() !== trainerId.toString()) {
      return res.status(403).json({ message: "Unauthorized trainer" });
    }

    // Validate trainerLocation
    if (
      !trainerLocation ||
      !Array.isArray(trainerLocation) ||
      trainerLocation.length !== 2
    ) {
      return res.status(400).json({
        message: "trainerLocation must be a [lng, lat] array",
      });
    }

    const trainerPoint = { type: "Point", coordinates: trainerLocation };
    const customerLocation = subscription.Address.location;
const PROXIMITY_THRESHOLD = parseFloat(process.env.PROXIMITY_THRESHOLD) || 100;

    // Proximity Check using $geoNear
    const proximityCheck = await LocationMaster.aggregate([
      {
        $geoNear: {
          near: trainerPoint,
          distanceField: "distance",
          maxDistance: PROXIMITY_THRESHOLD,
          query: { _id: subscription.Address._id },
          spherical: true,
        },
      },
      { $limit: 1 },
    ]).session(session);

    // Fallback using haversine if geoNear fails
    if (proximityCheck.length === 0) {
      const distance = haversine(
        { lat: trainerLocation[1], lon: trainerLocation[0] },
        {
          lat: customerLocation.coordinates[1],
          lon: customerLocation.coordinates[0],
        }
      );
      if (distance > PROXIMITY_THRESHOLD) {
        return res.status(400).json({
          message: `Too far. You are ${distance.toFixed(2)}m away. Must be within ${PROXIMITY_THRESHOLD}m.`,
        });
      }
    }

    // Update trainer's location & subscription status
    await User.findByIdAndUpdate(
      trainerId,
      { location: trainerPoint, userStatus: "BUSY" },
      { session }
    );

    subscription.trainerStatus = "CHECKED_IN";
    subscription.checkInAt = new Date();
    await subscription.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Notify the customer
    try {
      if (subscription.created_by) {
        await sendNotification(subscription.created_by.toString(), {
          title: "Trainer Checked In",
          body: "Your trainer has arrived.",
          data: {
            subscriptionId: subscription._id.toString(),
            status: "CHECKED_IN",
          },
        });
      }
    } catch (notifErr) {
      console.error("Notification send failed:", notifErr);
    }

    return res.status(200).json({
      message: "Successfully checked in",
      status: "CHECKED_IN",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Trainer check-in failed:", error);
    return res.status(500).json({
      message: "Check-in failed",
      error: error.message,
    });
  }
});


const trainerCheckOut = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const subscription = await Subscription.findById(id);
  if (!subscription) {
    return res.status(404).json(new ApiError(404, "Subscription not found"));
  }

  const classEnd = new Date(subscription.date[0]);
  const [endHour, endMin] = subscription.endTime.split(":").map(Number);
  classEnd.setHours(endHour, endMin, 0, 0);

  const now = new Date();
  const earliestCheckout = new Date(classEnd.getTime() + 30 * 60 * 1000);

  if (now < earliestCheckout) {
    return res.status(400).json(new ApiError(400, "Check-out not allowed yet"));
  }

  subscription.trainerStatus = "COMPLETED";
  await subscription.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Trainer checked out successfully"));
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

    return res
      .status(200)
      .json(
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
    if (
      !coordinates ||
      !Array.isArray(coordinates) ||
      coordinates.length !== 2
    ) {
      return res.status(400).json({
        message: "Valid coordinates [longitude, latitude] are required.",
      });
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

    const locationIds = nearbyLocations.map((loc) => loc._id);

    if (locationIds.length === 0) {
      await session.commitTransaction();
      session.endSession();
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            [],
            `No subscriptions found within ${miles} mile(s).`
          )
        );
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

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          enriched,
          `Subscriptions within ${miles} mile(s) from your location`
        )
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

// controllers/subscription.controller.ts
const getSubscriptionsByTrainerId = asyncHandler(async (req, res) => {
  const { trainerId } = req.params;
  const { isExpired } = req.query; // ←  ?isExpired=true / false / all

  if (!trainerId) {
    return res.status(400).json(new ApiError(400, "Trainer ID is required"));
  }

  // base filter
  const filter = { trainer: trainerId };

  // refine based on query
  // * ?isExpired=false  → only active
  // * ?isExpired=true   → only expired
  // * not provided      → all
  if (isExpired === "false") filter.isExpired = false;
  else if (isExpired === "true") filter.isExpired = true;

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
    limit = 100,
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
        filter.isExpired = {
          $in: isExpired.map((v) => v === "true" || v === true),
        };
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
        filter.isSingleClass =
          isSingleClass === "true" || isSingleClass === true;
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

  return res
    .status(200)
    .json(
      new ApiResponse(200, enriched, "Subscriptions fetched with full details")
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
    return res
      .status(200)
      .json(
        new ApiResponse(200, [], "No subscriptions found for this location")
      );
  }

  const enriched = await enrichSubscriptionsWithReviews(subscriptions);

  return res
    .status(200)
    .json(
      new ApiResponse(200, enriched, "Subscriptions fetched by Location ID")
    );
});

const getTrainerAssignedSubscriptions = asyncHandler(async (req, res) => {
  const trainerId = req.user._id;

  const {
    sortBy = "relevance",
    order = "desc",
    minPrice,
    maxPrice,
    categoryId,
    sessionTypeId,
    location,
    isExpired,
    isSingleClass,
    page = 1,
    limit = 100,
  } = req.body || {};

  const now = new Date();

  // Auto-mark expired subscriptions
  const allSubs = await Subscription.find({ trainer: trainerId }, { _id: 1, date: 1 });
  const expiredIds = allSubs
    .filter((s) => {
      const dates = s.date || [];
      const lastDate = dates.length === 2 ? dates[1] : dates[0];
      return lastDate && new Date(lastDate) < now;
    })
    .map((s) => s._id);

  if (expiredIds.length) {
    await Subscription.updateMany(
      { _id: { $in: expiredIds } },
      { $set: { isExpired: true } }
    );
  }

  const normalize = (v) => (Array.isArray(v) ? v : v ? [v] : []);

  const filter = { trainer: trainerId };

  if (isExpired !== undefined) {
    if (Array.isArray(isExpired)) {
      filter.isExpired = {
        $in: isExpired.map((v) => v === "true" || v === true),
      };
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

  const categories = normalize(categoryId);
  if (categories.length === 1) filter.categoryId = categories[0];
  else if (categories.length > 1) filter.categoryId = { $in: categories };

  const sessionTypes = normalize(sessionTypeId);
  if (sessionTypes.length === 1) filter.sessionType = sessionTypes[0];
  else if (sessionTypes.length > 1) filter.sessionType = { $in: sessionTypes };

  const locations = normalize(location);
  if (locations.length === 1) filter.Address = locations[0];
  else if (locations.length > 1) filter.Address = { $in: locations };

  const skip = (Number(page) - 1) * Number(limit);

  let subscriptions = await Subscription.find(filter)
    .populate("categoryId Address sessionType trainer")
    .skip(skip)
    .limit(Number(limit))
    .lean();

  // Fallback: retry without `isExpired` filter if no result
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
  const reviews = await SubscriptionRatingReview.find({
    subscriptionId: { $in: subscriptionIds },
  }).lean();

  const reviewMap = {};
  for (const r of reviews) {
    const id = r.subscriptionId.toString();
    if (!reviewMap[id]) reviewMap[id] = [];
    reviewMap[id].push(r);
  }

  subscriptions = subscriptions.map((sub) => {
    const subReviews = reviewMap[sub._id.toString()] || [];
    const totalReviews = subReviews.length;
    const avgRating = totalReviews
      ? subReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    return {
      ...sub,
      reviews: subReviews,
      totalReviews,
      averageRating: Number(avgRating.toFixed(2)),
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
      "Trainer subscriptions fetched with filters"
    )
  );
});

const getTrainerClassStats = asyncHandler(async (req, res) => {
  const trainerId = req.user._id;
  const now = new Date();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // Fetch all classes
  const allClasses = await Subscription.find({ trainer: trainerId }).lean();

  // Update expired classes if needed
  const expiredIds = allClasses
    .filter((s) => {
      const dates = s.date || [];
      const lastDate = dates.length === 2 ? dates[1] : dates[0];
      return lastDate && new Date(lastDate) < now;
    })
    .map((s) => s._id);

  if (expiredIds.length > 0) {
    await Subscription.updateMany(
      { _id: { $in: expiredIds } },
      { $set: { isExpired: true } }
    );
  }

  // Re-fetch after updating
  const updatedClasses = await Subscription.find({ trainer: trainerId }).lean();

  // Initialize counters
  let totalClasses = 0;
  let totalSingleClasses = 0;
  let totalExpired = 0;
  let totalNonExpired = 0;
  let totalToday = 0;
  let totalUpcoming = 0;

  for (const cls of updatedClasses) {
    totalClasses++;

    if (cls.isSingleClass) totalSingleClasses++;
    if (cls.isExpired) totalExpired++;
    else totalNonExpired++;

    const [startDateStr, endDateStr] = cls.date || [];
    if (!startDateStr) continue;

    const startDate = new Date(startDateStr);
    const endDate = endDateStr ? new Date(endDateStr) : startDate;

    // Strip time to compare only date part
    const format = (d) => d.toISOString().split("T")[0];
    const startStr = format(startDate);
    const endStr = format(endDate);

    if (todayStr >= startStr && todayStr <= endStr) {
      totalToday++;
    } else if (todayStr < startStr) {
      totalUpcoming++;
    }
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalClasses,
        totalSingleClasses,
        totalExpired,
        totalNonExpired,
        totalToday,
        totalUpcoming,
      },
      "Trainer class stats fetched successfully"
    )
  );
});




export {
  getTrainerClassStats,
  getTrainerAssignedSubscriptions,
  trainerCheckin,
  trainerCheckOut,
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
