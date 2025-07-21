import { User } from "../../models/user.model.js";
import { UserRole } from "../../models/userRole.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../../utils/cloudinary.js";
import {VaccineSchedule} from "../../models/vaccineSchedule.model.js"
import {PetRegistration} from "../../models/pet.model.js"
// import {Vaccine} from "../../models/master.model.js"
import {OrderDetails} from "../../models/order.model.js"
import {TimeSlot} from "../../models/timeslot.model.js"
import {Booking} from "../../models/booking.model.js"
import mongoose from "mongoose";
import pagination from "../../utils/pagination.js"
import { Address } from "../../models/user.model.js";
import { sendNotification } from "../../middlewares/firebase.middleware.js";
import haversine from "haversine-distance";
import admin from 'firebase-admin';
const firestore = admin.firestore();
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import { TrainerRatingReview } from "../../models/trainerRatingReview.model.js";

// Create trainer
const createTrainer = asyncHandler(async (req, res) => {
  console.log("req.body", req.body)

  const {
    email, first_name, last_name, phone_number, gender, address, age, country, city, specialization, experience, experienceYear, password
  } = req.body;

  const imageLocalPath = req.file?.path;

  const requiredFields = { email, first_name, phone_number, password };

  const missingFields = Object.keys(requiredFields).filter(
    (field) => !requiredFields[field] || requiredFields[field] === "undefined"
  );

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json(new ApiError(400, `Missing required field: ${missingFields.join(", ")}`));
  }

  const existedUser = await User.findOne({ $or: [{ email }, { phone_number }] });

  if (existedUser) {
    return res.status(400).json(new ApiError(400, "Email or Phone already exists"));
  }

  const trainerRole = await UserRole.findOne({ name: "trainer" });

  if (!trainerRole) {
    return res.status(400).json(new ApiError(400, "Trainer role not found"));
  }

  let profile_image = null;
  if (imageLocalPath) {
    const uploadedImage = await uploadOnCloudinary(imageLocalPath);
    if (!uploadedImage?.url) {
      return res.status(400).json(new ApiError(400, "Error while uploading image"));
    }
    profile_image = uploadedImage.url;
  }

  let serviceProvider = [];

  if (req.body.serviceProvider) {
    if (typeof req.body.serviceProvider === 'string') {
      try {
        serviceProvider = JSON.parse(req.body.serviceProvider);
      } catch (err) {
        return res.status(400).json(new ApiError(400, "Invalid serviceProvider format"));
      }
    } else if (Array.isArray(req.body.serviceProvider)) {
      serviceProvider = req.body.serviceProvider;
    }
  }

  const trainer = await User.create({
    uid: req.user?.uid || "",
    email,
    user_role: trainerRole._id,
    first_name,
    last_name,
    phone_number,
    gender,
    age,
    country,
    profile_image,
    city,
    address,
    specialization,
    experience,
    experienceYear,
    serviceProvider,
    password,
    status: "Pending",
  });

  const createdtrainer = await User.findById(trainer._id)
    .select("-password -refreshToken -otp -otp_time -uid")
    .populate("user_role country city");

  res.status(201).json(new ApiResponse(201, createdtrainer, "trainer registered successfully"));
});


const getAllTrainer = asyncHandler(async (req, res) => {
  // 1. Fetch all users with role "trainer"
  const users = await User.find()
    .populate("user_role country city")
    .select("-password -refreshToken -otp -otp_time");

  const trainers = users.filter(
    (user) => user.user_role && user.user_role.name === "trainer"
  );

  // 2. Get average rating and total reviews for all trainers
  const ratingsData = await TrainerRatingReview.aggregate([
    {
      $group: {
        _id: "$trainer",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  // 3. Convert ratingsData to a map for faster lookup
  const ratingsMap = {};
  ratingsData.forEach((data) => {
    ratingsMap[data._id.toString()] = {
      averageRating: data.averageRating.toFixed(1), // round to 1 decimal
      totalReviews: data.totalReviews,
    };
  });

  // 4. Merge rating info with trainers
  const trainersWithRatings = trainers.map((trainer) => {
    const ratingInfo = ratingsMap[trainer._id.toString()] || {
      averageRating: 0,
      totalReviews: 0,
    };
    return {
      ...trainer.toObject(),
      averageRating: ratingInfo.averageRating,
      totalReviews: ratingInfo.totalReviews,
    };
  });

  // 5. Send response
  res
    .status(200)
    .json(new ApiResponse(200, trainersWithRatings, "Trainers fetched successfully"));
});



// Get trainer By ID
const getTrainerrById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) return res.status(400).json(new ApiError(400, "trainer ID is required"));

  const trainer = await User.findById(id)
    .populate("user_role country city")
    .select("-password -refreshToken -otp -otp_time");

  if (!trainer) return res.status(404).json(new ApiError(404, "trainer not found"));

  if (trainer.user_role.name !== "trainer") {
    return res.status(403).json(new ApiError(403, "User is not a trainer"));
  }

  res.status(200).json(new ApiResponse(200, trainer, "trainer fetched successfully"));
});


// Update trainer
const updateTrainer = asyncHandler(async (req, res) => {
  const trainerId = req.params.id;

  if (!trainerId || trainerId === "undefined") {
    return res.status(400).json(new ApiError(400, "Trainer ID not provided"));
  }

  const existingTrainer = await User.findById(trainerId);
  if (!existingTrainer) {
    return res.status(404).json(new ApiError(404, "Trainer not found"));
  }

  // Handle image upload if new image is provided
  const imageLocalPath = req.file?.path;
  let profile_image = existingTrainer.profile_image;

  if (imageLocalPath) {
    const [_, uploadResult] = await Promise.all([
      profile_image ? deleteFromCloudinary(profile_image) : Promise.resolve(),
      uploadOnCloudinary(imageLocalPath),
    ]);

    if (!uploadResult?.url) {
      return res.status(400).json(new ApiError(400, "Image upload failed"));
    }
    profile_image = uploadResult.url;
  }

  // Hash password if present in update
  if (req.body.password) {
    req.body.password = await bcrypt.hash(req.body.password, 10);
  }

  const updatedTrainer = await User.findByIdAndUpdate(
    trainerId,
    { ...req.body, profile_image },
    { new: true, runValidators: true, context: "query" } // run validators and allow hooks if needed
  ).populate("user_role country city");

  res
    .status(200)
    .json(new ApiResponse(200, updatedTrainer, "Trainer updated successfully"));
});


/**--------- */
const updateTrainerProfileByTrainer = asyncHandler(async (req, res) => {
  const trainerId = req.params.id;

  if (!trainerId || trainerId === "undefined") {
    return res.status(400).json(new ApiError(400, "trainer ID not provided"));
  }

  const existingtrainer = await User.findById(trainerId).populate("user_role");

  if (!existingtrainer) {
    return res.status(404).json(new ApiError(404, "trainer not found"));
  }

  if (
    !existingtrainer.user_role ||
    existingtrainer.user_role.role_id !== 2 ||
    existingtrainer.user_role.name !== "trainer"
  ) {
    return res.status(403).json(new ApiError(403, "User is not authorized as a trainer"));
  }

  const imageLocalPath = req.file?.path;
  let profile_image = existingtrainer.profile_image;

  if (imageLocalPath) {
    const [_, uploadResult] = await Promise.all([
      existingtrainer.profile_image
        ? deleteFromCloudinary(existingtrainer.profile_image)
        : Promise.resolve(),
      uploadOnCloudinary(imageLocalPath),
    ]);

    if (!uploadResult?.url) {
      return res.status(400).json(new ApiError(400, "Image upload failed"));
    }

    profile_image = uploadResult.url;
  }

  // Only allowed fields
  const allowedFields = {
    first_name: req.body.first_name ?? existingtrainer.first_name,
    last_name: req.body.last_name ?? existingtrainer.last_name,
    address: req.body.address ?? existingtrainer.address,
    phone_number: req.body.phone_number ?? existingtrainer.phone_number,
    experience: req.body.experience ?? existingtrainer.experience,
    userStatus: req.body.userStatus ?? existingtrainer.userStatus,
    country: req.body.country ?? existingtrainer.country,
    city: req.body.city ?? existingtrainer.city,
    age: req.body.age ?? existingtrainer.age,
    gender: req.body.gender ?? existingtrainer.gender,
    profile_image,
  };

  const updatedtrainer = await User.findByIdAndUpdate(
    trainerId,
    allowedFields,
    { new: true }
  ).populate("user_role country city");

  res.status(200).json(new ApiResponse(200, updatedtrainer, "trainer profile updated successfully"));
});



// Delete trainer
const deleteTrainer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id || id === "undefined") {
    return res.status(400).json(new ApiError(400, "trainer ID not provided"));
  }

  const trainer = await User.findById(id);

  if (!trainer) {
    return res.status(404).json(new ApiError(404, "trainer not found"));
  }

  if (trainer.profile_image) {
    await deleteFromCloudinary(trainer.profile_image);
  }

  await User.findByIdAndDelete(id);

  res.status(200).json(new ApiResponse(200, "trainer deleted successfully"));
});


// Update trainer Status
const updateTrainerStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!req.params.trainerId || req.params.trainerId === "undefined") {
    return res.status(400).json(new ApiError(400, "trainer ID not provided"));
  }

  const trainer = await User.findById(req.params.trainerId);
  if (!trainer) {
    return res.status(404).json(new ApiError(404, "trainer not found"));
  }

  if (trainer.user_role.name !== "trainer") {
    return res.status(403).json(new ApiError(403, "User is not a trainer"));
  }

  const updatedtrainer = await User.findByIdAndUpdate(
    req.params.trainerId,
    { $set: { status } },
    { new: true }
  ).select("-password -refreshToken -otp -otp_time");

  res.status(200).json(new ApiResponse(200, updatedtrainer, "trainer status updated successfully"));
});


// const getAllOrders = asyncHandler(async (req, res) => {
//   try {
//     const trainerId = req.user?._id;
//     console.log("trainerId----------->",trainerId);
    
//     if (!trainerId) {
//       return res.status(401).json(new ApiError(401, "Unauthorized - trainer token required"));
//     }

//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const tomorrow = new Date(today);
//     tomorrow.setDate(today.getDate() + 1);

//     const dateFilter = {
//       $gte: today,
//       $lte: tomorrow
//     };

//     // Fetch orderDetails for this trainer for today and tomorrow
//     const orderDetails = await OrderDetails.find({
//       trainer: trainerId
//     })
//       .populate({
//         path: 'order',
//         populate: { path: 'created_by', select: 'first_name last_name' }
//       })
//       .populate('orderDetails.serviceId', 'name')
//       .populate('orderDetails.subServiceId', 'name')
//       .populate('orderDetails.petTypeId', 'petName')
//       .populate('orderDetails.timeslot')
//       .lean();

//     const ordersData = orderDetails
//       .filter(detail => {
//         const slotDate = detail.orderDetails?.date;
//         return slotDate && new Date(slotDate) >= today && new Date(slotDate) <= tomorrow;
//       })
//       .map(detail => ({
//         bookingDate: detail.orderDetails.date,
//         startTime: detail.orderDetails.timeslot?.startTime,
//         endTime: detail.orderDetails.timeslot?.endTime,
//         customerName: detail.order?.created_by
//           ? `${detail.order.created_by.first_name} ${detail.order.created_by.last_name || ''}`.trim()
//           : "",
//         petName: detail.orderDetails.petTypeId?.petName || "",
//         ServiceType: detail.orderDetails.serviceId?.name || "",
//         subServiceType: detail.orderDetails.subServiceId?.name || "",
//         status: detail.status || "CONFIRMED",
//         orderId: detail.order?._id || null,
//         orderDetailId: detail._id,
//         type: "ORDER"
//       }));

//     // Fetch bookings for this trainer for today and tomorrow
//     const bookings = await Booking.find({
//       trainer: trainerId,
//       date: dateFilter
//     })
//       .populate('customer', 'first_name last_name')
//       .populate('pet', 'petName')
//       .populate('serviceType', 'name')
//       .populate('subService', 'name')
//       .populate('timeSlot')
//       .lean();

//     const bookingsData = bookings.map(booking => ({
//       bookingDate: booking.date,
//       startTime: booking.timeSlot?.startTime,
//       endTime: booking.timeSlot?.endTime,
//       customerName: booking.customer
//         ? `${booking.customer.first_name} ${booking.customer.last_name || ''}`.trim()
//         : "",
//       petName: booking.pet?.petName || "",
//       ServiceType: booking.serviceType?.name || "",
//       subServiceType: booking.subService?.name || "",
//       status: booking.status || "Pending",
//       orderId: booking.orderId || null,
//       orderDetailId: booking.orderDetailsId || null,
//       bookingId: booking._id,
//       type: "BOOKING"
//     }));

//     const combinedData = [...ordersData, ...bookingsData];

//     return res
//       .status(200)
//       .json(new ApiResponse(200, combinedData, "trainer's current and upcoming orders and bookings retrieved"));

//   } catch (err) {
//     console.error("getAllOrders Error:", err);
//     res.status(500).json(new ApiError(500, "Failed to fetch orders and bookings"));
//   }
// });
/**---- */

const getAllOrders = asyncHandler(async (req, res) => {
  try {
    const trainerId = req.user._id;

    // Dates: today and tomorrow
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch orderDetails where bookingStatus is "NOT_STARTED"
    const orderDetails = await OrderDetails.find({
      trainer: trainerId,
      'orderDetails.date': { $gte: today, $lte: tomorrow },
      bookingStatus: 'NOT_STARTED'
    })
      .populate({
        path: 'order',
        populate: { path: 'created_by', select: 'first_name last_name' }
      })
      .populate('trainer', 'first_name last_name phone_number')
      .populate('orderDetails.serviceId', 'name')
      .populate('orderDetails.subServiceId', 'name')
      .populate('orderDetails.petTypeId', 'petName')
      .populate('orderDetails.timeslot')
      .lean();

    const orderData = [];

    for (const detail of orderDetails) {
      const timeslot = detail.orderDetails.timeslot;
      orderData.push({
        bookingDate: detail.orderDetails.date,
        startTime: timeslot?.startTime || null,
        endTime: timeslot?.endTime || null,
        customerName: detail.order?.created_by
          ? `${detail.order.created_by.first_name} ${detail.order.created_by.last_name || ''}`.trim()
          : "",
        petName: detail.orderDetails.petTypeId?.petName || "",
        ServiceType: detail.orderDetails.serviceId?.name || "",
        subServiceType: detail.orderDetails.subServiceId?.name || "",
        status: detail.status,
        bookingStatus: detail.bookingStatus,
        orderId: detail.order?._id || null,
        orderDetailId: detail._id,
        type: "ORDER"
      });
    }

    // Fetch bookings where status is "NOT_STARTED"
    const bookings = await Booking.find({
      trainer: trainerId,
      date: { $gte: today, $lte: tomorrow },
      bookingStatus: 'NOT_STARTED'
    })
      .populate('customer', 'first_name last_name')
      .populate('pet', 'petName')
      .populate('serviceType', 'name')
      .populate('subService', 'name')
      .populate('timeSlot')
      .lean();

    for (const booking of bookings) {
      const timeslot = booking.timeSlot;
      orderData.push({
        bookingDate: booking.date,
        startTime: timeslot?.startTime || null,
        endTime: timeslot?.endTime || null,
        customerName: booking.customer
          ? `${booking.customer.first_name} ${booking.customer.last_name || ''}`.trim()
          : "",
        petName: booking.pet?.petName || "",
        ServiceType: booking.serviceType?.name || "",
        subServiceType: booking.subService?.name || "",
        status: booking.status,
        bookingStatus: booking.bookingStatus,
        orderId: booking.orderId || null,
        orderDetailId: booking.orderDetailsId || null,
        bookingId: booking._id,
        type: "BOOKING"
      });
    }

    return res.status(200).json(
      new ApiResponse(200, orderData, "trainer's NOT_STARTED orders and bookings retrieved")
    );

  } catch (err) {
    console.error("getAllOrdersFortrainer error:", err);
    return res.status(500).json(new ApiError(500, "Failed to fetch orders and bookings"));
  }
});

// get all assigned jobs
// const getAllAssignedJobs = asyncHandler(async (req, res) => {
//   const { page = 1, limit = 10, sortOrder = -1 } = req.body;
//   const trainerId = new mongoose.Types.ObjectId(req.user._id);
//   // const trainerId = req.user._id
// console.log("trainerId------------->",trainerId);

//   const skip = (page - 1) * limit;

//   // Total count of matching records
//   const totalCountResult = await OrderDetails.aggregate([
//     { $match: { trainer: trainerId } },
//     { $count: "totalCount" },
//   ]);
// console.log("totalCountResult------------------>",totalCountResult);

//   const totalCount = totalCountResult[0]?.totalCount || 0;
//   const totalPages = Math.ceil(totalCount / limit);

//   // Fetch paginated records
//   const allAssignedJobs = await OrderDetails.aggregate([
//     { $match: { trainer: trainerId } },
//     {
//       $lookup: {
//         from: "addresses",
//         let: { createdBy: "$created_by" },
//         pipeline: [
//           {
//             $match: {
//               $expr: {
//                 $and: [
//                   { $eq: ["$created_by", "$$createdBy"] },
//                   { $eq: ["$make_default_address", true] },
//                 ],
//               },
//             },
//           },
//           {
//             $project: {
//               name: 1,
//               phone_number: 1,
//               country: 1,
//               city: 1,
//               flat_no: 1,
//               street: 1,
//               landmark: 1,
//               pin_code: 1,
//               coordinates: 1,
//               make_default_address: 1,
//             },
//           },
//         ],
//         as: "defaultAddress",
//       },
//     },
//     { $sort: { _id: sortOrder } },
//     { $skip: skip },
//     { $limit: limit },
//   ]);

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         allAssignedJobs,
//         page,
//         limit,
//         totalPages,
//         totalCount,
//       },
//       totalCount > 0
//         ? "Assigned jobs fetched successfully"
//         : "No assigned jobs found"
//     )
//   );
// });

/**------------------ */

// const getAllAssignedJobs = asyncHandler(async (req, res) => {
//   const { page = 1, limit = 10, sortOrder = -1 } = req.body;
//   const trainerId = new mongoose.Types.ObjectId(req.user._id);

//   const skip = (page - 1) * limit;

//   // Total count of matching records
//   const totalCountResult = await OrderDetails.aggregate([
//     { $match: { trainer: trainerId } },
//     { $count: "totalCount" },
//   ]);
//   const totalCount = totalCountResult[0]?.totalCount || 0;
//   const totalPages = Math.ceil(totalCount / limit);

//   // Fetch paginated records with populated fields inside orderDetails only
//   const allAssignedJobs = await OrderDetails.aggregate([
//     { $match: { trainer: trainerId } },

//     // Populate serviceId inside orderDetails
//     {
//       $lookup: {
//         from: "servicetypes",
//         localField: "orderDetails.serviceId",
//         foreignField: "_id",
//         as: "orderDetails.serviceIdPopulated",
//       },
//     },
//     {
//       $set: {
//         "orderDetails.serviceId": { $arrayElemAt: ["$orderDetails.serviceIdPopulated", 0] },
//       },
//     },
//     { $unset: "orderDetails.serviceIdPopulated" },

//     // Populate subServiceId inside orderDetails
//     {
//       $lookup: {
//         from: "subservicetypes",
//         localField: "orderDetails.subServiceId",
//         foreignField: "_id",
//         as: "orderDetails.subServiceIdPopulated",
//       },
//     },
//     {
//       $set: {
//         "orderDetails.subServiceId": { $arrayElemAt: ["$orderDetails.subServiceIdPopulated", 0] },
//       },
//     },
//     { $unset: "orderDetails.subServiceIdPopulated" },

//     // Populate timeslot inside orderDetails
//     {
//       $lookup: {
//         from: "timeslots",
//         localField: "orderDetails.timeslot",
//         foreignField: "_id",
//         as: "orderDetails.timeslotPopulated",
//       },
//     },
//     {
//       $set: {
//         "orderDetails.timeslot": { $arrayElemAt: ["$orderDetails.timeslotPopulated", 0] },
//       },
//     },
//     { $unset: "orderDetails.timeslotPopulated" },

//     // Populate petTypeId array inside orderDetails
//     {
//       $lookup: {
//         from: "petregistrations",
//         localField: "orderDetails.petTypeId",
//         foreignField: "_id",
//         as: "orderDetails.petTypeIdPopulated",
//       },
//     },
//     {
//       $set: {
//         "orderDetails.petTypeId": "$orderDetails.petTypeIdPopulated",
//       },
//     },
//     { $unset: "orderDetails.petTypeIdPopulated" },

//     // Populate defaultAddress
//     {
//       $lookup: {
//         from: "addresses",
//         let: { createdBy: "$created_by" },
//         pipeline: [
//           {
//             $match: {
//               $expr: {
//                 $and: [
//                   { $eq: ["$created_by", "$$createdBy"] },
//                   { $eq: ["$make_default_address", true] },
//                 ],
//               },
//             },
//           },
//           {
//             $project: {
//               name: 1,
//               phone_number: 1,
//               country: 1,
//               city: 1,
//               flat_no: 1,
//               street: 1,
//               landmark: 1,
//               pin_code: 1,
//               coordinates: 1,
//               make_default_address: 1,
//             },
//           },
//         ],
//         as: "defaultAddress",
//       },
//     },

//     { $sort: { _id: sortOrder } },
//     { $skip: skip },
//     { $limit: limit },
//   ]);

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         allAssignedJobs,
//         page,
//         limit,
//         totalPages,
//         totalCount,
//       },
//       totalCount > 0
//         ? "Assigned jobs fetched successfully"
//         : "No assigned jobs found"
//     )
//   );
// });


/**- work good with booking status----*/
// const getAllAssignedJobs = asyncHandler(async (req, res) => {
//   const { page = 1, limit = 10, sortOrder = -1, bookingStatus, } = req.body;
//   const trainerId = new mongoose.Types.ObjectId(req.user._id);

//   const skip = (page - 1) * limit;

//   // Build the match filter dynamically (includes bookingStatus if provided)
//   const matchFilter = { trainer: trainerId };
//   if (bookingStatus) {
//     matchFilter.bookingStatus = bookingStatus;
//   }

//   // Total count of matching records using matchFilter
//   const totalCountResult = await OrderDetails.aggregate([
//     { $match: matchFilter },
//     { $count: "totalCount" },
//   ]);
//   const totalCount = totalCountResult[0]?.totalCount || 0;
//   const totalPages = Math.ceil(totalCount / limit);

//   // Fetch paginated records with populated fields inside orderDetails only using matchFilter
//   const allAssignedJobs = await OrderDetails.aggregate([
//     { $match: matchFilter },

//     // Populate serviceId inside orderDetails
//     {
//       $lookup: {
//         from: "servicetypes",
//         localField: "orderDetails.serviceId",
//         foreignField: "_id",
//         as: "orderDetails.serviceIdPopulated",
//       },
//     },
//     {
//       $set: {
//         "orderDetails.serviceId": { $arrayElemAt: ["$orderDetails.serviceIdPopulated", 0] },
//       },
//     },
//     { $unset: "orderDetails.serviceIdPopulated" },

//     // Populate subServiceId inside orderDetails
//     {
//       $lookup: {
//         from: "subservicetypes",
//         localField: "orderDetails.subServiceId",
//         foreignField: "_id",
//         as: "orderDetails.subServiceIdPopulated",
//       },
//     },
//     {
//       $set: {
//         "orderDetails.subServiceId": { $arrayElemAt: ["$orderDetails.subServiceIdPopulated", 0] },
//       },
//     },
//     { $unset: "orderDetails.subServiceIdPopulated" },

//     // Populate timeslot inside orderDetails
//     {
//       $lookup: {
//         from: "timeslots",
//         localField: "orderDetails.timeslot",
//         foreignField: "_id",
//         as: "orderDetails.timeslotPopulated",
//       },
//     },
//     {
//       $set: {
//         "orderDetails.timeslot": { $arrayElemAt: ["$orderDetails.timeslotPopulated", 0] },
//       },
//     },
//     { $unset: "orderDetails.timeslotPopulated" },

//     // Populate petTypeId array inside orderDetails
//     {
//       $lookup: {
//         from: "petregistrations",
//         localField: "orderDetails.petTypeId",
//         foreignField: "_id",
//         as: "orderDetails.petTypeIdPopulated",
//       },
//     },
//     {
//       $set: {
//         "orderDetails.petTypeId": "$orderDetails.petTypeIdPopulated",
//       },
//     },
//     { $unset: "orderDetails.petTypeIdPopulated" },

//     // Populate defaultAddress
//     {
//       $lookup: {
//         from: "addresses",
//         let: { createdBy: "$created_by" },
//         pipeline: [
//           {
//             $match: {
//               $expr: {
//                 $and: [
//                   { $eq: ["$created_by", "$$createdBy"] },
//                   { $eq: ["$make_default_address", true] },
//                 ],
//               },
//             },
//           },
//           {
//             $project: {
//               name: 1,
//               phone_number: 1,
//               country: 1,
//               city: 1,
//               flat_no: 1,
//               street: 1,
//               landmark: 1,
//               pin_code: 1,
//               coordinates: 1,
//               make_default_address: 1,
//             },
//           },
//         ],
//         as: "defaultAddress",
//       },
//     },

//     { $sort: { _id: sortOrder } },
//     { $skip: skip },
//     { $limit: limit },
//   ]);

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         allAssignedJobs,
//         page,
//         limit,
//         totalPages,
//         totalCount,
//       },
//       totalCount > 0
//         ? "Assigned jobs fetched successfully"
//         : "No assigned jobs found"
//     )
//   );
// });

/**---------testing for either booking status or date if both provided then its not working--------- */

const getAllAssignedJobs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sortOrder = -1, bookingStatus, date} = req.body;
  const trainerId = new mongoose.Types.ObjectId(req.user._id);

  const skip = (page - 1) * limit;

  // Build the match filter dynamically (includes bookingStatus if provided)
  const matchFilter = { trainer: trainerId };
  if (bookingStatus) {
    matchFilter.bookingStatus = bookingStatus;
  }else if(date){
    const selectedDate = new Date(date);
    const nextDay = new Date(date);
    nextDay.setDate(selectedDate.getDate() + 1);

    matchFilter["orderDetails.date"] = {
      $gte: selectedDate,
      $lt: nextDay,
    };
  }else{
      // Default: today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    matchFilter["orderDetails.date"] = {
      $gte: today,
      $lt: tomorrow,
    }; 
  }

  // Total count of matching records using matchFilter
  const totalCountResult = await OrderDetails.aggregate([
    { $match: matchFilter },
    { $count: "totalCount" },
  ]);
  const totalCount = totalCountResult[0]?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit);

  // Fetch paginated records with populated fields inside orderDetails only using matchFilter
  const allAssignedJobs = await OrderDetails.aggregate([
    { $match: matchFilter },

    // Populate serviceId inside orderDetails
    {
      $lookup: {
        from: "servicetypes",
        localField: "orderDetails.serviceId",
        foreignField: "_id",
        as: "orderDetails.serviceIdPopulated",
      },
    },
    {
      $set: {
        "orderDetails.serviceId": { $arrayElemAt: ["$orderDetails.serviceIdPopulated", 0] },
      },
    },
    { $unset: "orderDetails.serviceIdPopulated" },

    // Populate subServiceId inside orderDetails
    {
      $lookup: {
        from: "subservicetypes",
        localField: "orderDetails.subServiceId",
        foreignField: "_id",
        as: "orderDetails.subServiceIdPopulated",
      },
    },
    {
      $set: {
        "orderDetails.subServiceId": { $arrayElemAt: ["$orderDetails.subServiceIdPopulated", 0] },
      },
    },
    { $unset: "orderDetails.subServiceIdPopulated" },

    // Populate timeslot inside orderDetails
    {
      $lookup: {
        from: "timeslots",
        localField: "orderDetails.timeslot",
        foreignField: "_id",
        as: "orderDetails.timeslotPopulated",
      },
    },
    {
      $set: {
        "orderDetails.timeslot": { $arrayElemAt: ["$orderDetails.timeslotPopulated", 0] },
      },
    },
    { $unset: "orderDetails.timeslotPopulated" },

    // Populate petTypeId array inside orderDetails
    {
      $lookup: {
        from: "petregistrations",
        localField: "orderDetails.petTypeId",
        foreignField: "_id",
        as: "orderDetails.petTypeIdPopulated",
      },
    },
    {
      $set: {
        "orderDetails.petTypeId": "$orderDetails.petTypeIdPopulated",
      },
    },
    { $unset: "orderDetails.petTypeIdPopulated" },

    // Populate defaultAddress
    {
      $lookup: {
        from: "addresses",
        let: { createdBy: "$created_by" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$created_by", "$$createdBy"] },
                  { $eq: ["$make_default_address", true] },
                ],
              },
            },
          },
          {
            $project: {
              name: 1,
              phone_number: 1,
              country: 1,
              city: 1,
              flat_no: 1,
              street: 1,
              landmark: 1,
              pin_code: 1,
              coordinates: 1,
              make_default_address: 1,
            },
          },
        ],
        as: "defaultAddress",
      },
    },

    { $sort: { _id: sortOrder } },
    { $skip: skip },
    { $limit: limit },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        allAssignedJobs,
        page,
        limit,
        totalPages,
        totalCount,
      },
      totalCount > 0
        ? "Assigned jobs fetched successfully"
        : "No assigned jobs found"
    )
  );
});

/***------9-6-25 6:25PM-- */
// const getAllAssignedJobs = asyncHandler(async (req, res) => {
//   const { page = 1, limit = 10, sortOrder = -1, bookingStatus, date } = req.body;
//   const trainerId = new mongoose.Types.ObjectId(req.user._id);

//   const skip = (page - 1) * limit;

//   // Build dynamic matchFilter
//   let matchFilter = { trainer: trainerId };

//   if (bookingStatus && date) {
//     const selectedDate = new Date(date);
//     const nextDay = new Date(date);
//     nextDay.setDate(selectedDate.getDate() + 1);

//     matchFilter.bookingStatus = bookingStatus;
//     matchFilter["orderDetails.date"] = {
//       $gte: selectedDate,
//       $lt: nextDay,
//     };
//   } else if (bookingStatus && !date) {
//     matchFilter.bookingStatus = bookingStatus;
//   } else if (date && !bookingStatus) {
//     const selectedDate = new Date(date);
//     const nextDay = new Date(date);
//     nextDay.setDate(selectedDate.getDate() + 1);

//     matchFilter["orderDetails.date"] = {
//       $gte: selectedDate,
//       $lt: nextDay,
//     };
//   } else {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const tomorrow = new Date(today);
//     tomorrow.setDate(today.getDate() + 1);

//     matchFilter["orderDetails.date"] = {
//       $gte: today,
//       $lt: tomorrow,
//     };
//   }

//   // Total count
//   const totalCountResult = await OrderDetails.aggregate([
//     { $match: matchFilter },
//     { $count: "totalCount" },
//   ]);
//   const totalCount = totalCountResult[0]?.totalCount || 0;
//   const totalPages = Math.ceil(totalCount / limit);

//   // Fetch paginated data with populated fields
//   const allAssignedJobs = await OrderDetails.aggregate([
//     { $match: matchFilter },

//     // Populate serviceId
//     {
//       $lookup: {
//         from: "servicetypes",
//         localField: "orderDetails.serviceId",
//         foreignField: "_id",
//         as: "orderDetails.serviceIdPopulated",
//       },
//     },
//     {
//       $set: {
//         "orderDetails.serviceId": { $arrayElemAt: ["$orderDetails.serviceIdPopulated", 0] },
//       },
//     },
//     { $unset: "orderDetails.serviceIdPopulated" },

//     // Populate subServiceId
//     {
//       $lookup: {
//         from: "subservicetypes",
//         localField: "orderDetails.subServiceId",
//         foreignField: "_id",
//         as: "orderDetails.subServiceIdPopulated",
//       },
//     },
//     {
//       $set: {
//         "orderDetails.subServiceId": { $arrayElemAt: ["$orderDetails.subServiceIdPopulated", 0] },
//       },
//     },
//     { $unset: "orderDetails.subServiceIdPopulated" },

//     // Populate timeslot
//     {
//       $lookup: {
//         from: "timeslots",
//         localField: "orderDetails.timeslot",
//         foreignField: "_id",
//         as: "orderDetails.timeslotPopulated",
//       },
//     },
//     {
//       $set: {
//         "orderDetails.timeslot": { $arrayElemAt: ["$orderDetails.timeslotPopulated", 0] },
//       },
//     },
//     { $unset: "orderDetails.timeslotPopulated" },

//     // Populate petTypeId array
//     {
//       $lookup: {
//         from: "petregistrations",
//         localField: "orderDetails.petTypeId",
//         foreignField: "_id",
//         as: "orderDetails.petTypeIdPopulated",
//       },
//     },
//     {
//       $set: {
//         "orderDetails.petTypeId": "$orderDetails.petTypeIdPopulated",
//       },
//     },
//     { $unset: "orderDetails.petTypeIdPopulated" },

//     // Populate defaultAddress
//     {
//       $lookup: {
//         from: "addresses",
//         let: { createdBy: "$created_by" },
//         pipeline: [
//           {
//             $match: {
//               $expr: {
//                 $and: [
//                   { $eq: ["$created_by", "$$createdBy"] },
//                   { $eq: ["$make_default_address", true] },
//                 ],
//               },
//             },
//           },
//           {
//             $project: {
//               name: 1,
//               phone_number: 1,
//               country: 1,
//               city: 1,
//               flat_no: 1,
//               street: 1,
//               landmark: 1,
//               pin_code: 1,
//               coordinates: 1,
//               make_default_address: 1,
//             },
//           },
//         ],
//         as: "defaultAddress",
//       },
//     },

//     { $sort: { _id: sortOrder } },
//     { $skip: skip },
//     { $limit: limit },
//   ]);

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         allAssignedJobs,
//         page,
//         limit,
//         totalPages,
//         totalCount,
//       },
//       totalCount > 0
//         ? "Assigned jobs fetched successfully"
//         : "No assigned jobs found"
//     )
//   );
// });


const getOrderDetailsById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id || id === "undefined") {
    return res.status(400).json(new ApiError(400, "Order detail ID not provided"));
  }

  const orderDetail = await OrderDetails.findById(id)
    .populate({
      path: "orderDetails.serviceId",
      select: "name",
    })
    .populate({
      path: "orderDetails.subServiceId",
      select: "name",
    })
    .populate({
      path: "orderDetails.timeslot",
      select: "startTime endTime bookingDate duration",
    })
    .populate({
      path: "orderDetails.petTypeId",
      populate: [
        {
          path: "userId",
          select: "first_name last_name phone_number",
        },
        {
          path: "petType", // Assuming petType is a reference inside PetRegistration
          select: "name",
        },
      ],
      select:
        "petName image breed gender weight activity_level day_Habits health_issues special_care petType userId",
    })
    .populate({
      path: "defaultAddress",
    });

  if (!orderDetail) {
    return res.status(404).json(new ApiError(404, "Order detail not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, orderDetail, "Order detail fetched successfully"));
});

/*--------------statu update by trainer-----------------*/
// const updateBookingStatus = asyncHandler(async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { orderDetailsId } = req.params;
//     const { status, trainerLocation } = req.body;
//     const trainerId = req.user._id;

//     const orderDetail = await OrderDetails.findById(orderDetailsId)
//       .populate("defaultAddress created_by");

//     if (!orderDetail) {
//       return res.status(404).json({ message: "Order details not found" });
//     }

//     if (!orderDetail.trainer || orderDetail.trainer.toString() !== trainerId.toString()) {
//       return res.status(403).json({ message: "Unauthorized action for this booking" });
//     }

//     // ✅ Block further updates if already COMPLETED
//     if (orderDetail.bookingStatus === "COMPLETED") {
//       return res.status(400).json({ message: "This booking has already been completed." });
//     }

    
//     // ON_THE_WAY
//     if (status === "ON_THE_WAY") {
//       await User.findByIdAndUpdate(trainerId, {
//         location: { type: "Point", coordinates: trainerLocation },
//       }, { session });

//       await sendNotification(orderDetail.created_by, {
//         title: "Your trainer is on the way!",
//         body: "Your trainer has started their journey.",
//       });
//     }

//     // IN_PROGRESS
//     if (status === "IN_PROGRESS") {
//       const trainer = await User.findById(trainerId);
//       const customerAddress = await Address.findById(orderDetail.defaultAddress);

//       if (!trainer.location?.coordinates || !customerAddress.coordinates?.coordinates) {
//         return res.status(400).json({ message: "Location data missing" });
//       }

//       const distance = haversine(
//         { lat: trainer.location.coordinates[1], lon: trainer.location.coordinates[0] },
//         { lat: customerAddress.coordinates.coordinates[1], lon: customerAddress.coordinates.coordinates[0] }
//       );

//       if (distance > PROXIMITY_THRESHOLD) {
//         return res.status(400).json({
//           message: `You are ${distance.toFixed(2)} meters away. Must be within ${PROXIMITY_THRESHOLD}m.`,
//         });
//       }

//       await sendNotification(orderDetail.created_by, {
//         title: "trainer has arrived",
//         body: "Your grooming service has started.",
//       });
//     }

//     // COMPLETED
//     if (status === "COMPLETED") {
//       await sendNotification(orderDetail.created_by, {
//         title: "Grooming Completed",
//         body: "Your pet grooming is completed. Please check the summary.",
//       });
//     }

//     orderDetail.bookingStatus = status;
//     await orderDetail.save({ session });

//     await session.commitTransaction();
//     session.endSession();

//     res.status(200).json({
//       message: `Booking status updated to ${status}`,
//       status,
//     });

//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     logger.error("Error updating booking status", error);
//     throw error;
//   }
// });

/**-----updated code --- */
// const PROXIMITY_THRESHOLD = 200;
// const updateBookingStatus = asyncHandler(async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { orderDetailsId } = req.params;
//     const { status, trainerLocation } = req.body;
//     const trainerId = req.user._id;

//     const orderDetail = await OrderDetails.findById(orderDetailsId)
//       .populate("defaultAddress created_by");

//     if (!orderDetail) {
//       return res.status(404).json({ message: "Order details not found" });
//     }

//     if (!orderDetail.trainer || orderDetail.trainer.toString() !== trainerId.toString()) {
//       return res.status(403).json({ message: "Unauthorized action for this booking" });
//     }

//     // ✅ Block further updates if already COMPLETED
//     if (orderDetail.bookingStatus === "COMPLETED") {
//       return res.status(400).json({ message: "This booking has already been completed." });
//     }

//     // ON_THE_WAY
//   //   if (status === "ON_THE_WAY") {
//   //     if (orderDetail.bookingStatus !== "PENDING") {
//   //     return res.status(400).json({
//   //       message: `Booking must be 'PENDING' to mark it as 'ON_THE_WAY'. Current status: '${orderDetail.bookingStatus}'.`,
//   //     });
//   // }
//   //     await User.findByIdAndUpdate(
//   //       trainerId,
//   //       { location: { type: "Point", coordinates: trainerLocation } },
//   //       { session }
//   //     );

//   //     await sendNotification(orderDetail.created_by, {
//   //       title: "Your trainer is on the way!",
//   //       body: "Your trainer has started their journey.",
//   //     });

//   //     orderDetail.bookingStatus = status;
//   //     await orderDetail.save({ session });
//   //   }

//     // IN_PROGRESS
//     else if (status === "IN_PROGRESS") {
//       const trainer = await User.findById(trainerId);
//       const customerAddress = await Address.findById(orderDetail.defaultAddress);

//       if (!trainer.location?.coordinates || !customerAddress.coordinates?.coordinates) {
//         return res.status(400).json({ message: "Location data missing" });
//       }

//       const distance = haversine(
//         { lat: trainer.location.coordinates[1], lon: trainer.location.coordinates[0] },
//         { lat: customerAddress.coordinates.coordinates[1], lon: customerAddress.coordinates.coordinates[0] }
//       );

//       if (distance > PROXIMITY_THRESHOLD) {
//         return res.status(400).json({
//           message: `You are ${distance.toFixed(2)} meters away. Must be within ${PROXIMITY_THRESHOLD}m.`,
//         });
//       }

//       // await sendNotification(orderDetail.created_by, {
//       //   title: "trainer has arrived",
//       //   body: "Your grooming service has started.",
//       // });
//   try {
//     await sendNotification(orderDetail.created_by, {
//       title: "Grooming Completed",
//       body: "Your pet grooming is completed. Please check the summary.",
//     });
//     console.log(`✅ Notification sent successfully for booking ${orderDetailsId}`);
//   } catch (err) {
//     console.error(`❌ Notification failed for booking ${orderDetailsId}`, err);
//   }
//       orderDetail.bookingStatus = status;
//       await orderDetail.save({ session });
//     }
// /**--------------------- */
// if (status === "ON_THE_WAY") {
//   if (orderDetail.bookingStatus !== "NOT_STARTED") {
//     return res.status(400).json({
//       message: `Booking must be 'NOT_STARTED' to mark it as 'ON_THE_WAY'. Current status: '${orderDetail.bookingStatus}'.`,
//     });
//   }

//   await User.findByIdAndUpdate(
//     trainerId,
//     { location: { type: "Point", coordinates: trainerLocation } },
//     { session }
//   );

//   // ✅ Push location to Firestore
//   await admin.firestore().collection("liveLocations").doc(trainerId.toString()).set({
//     latitude: trainerLocation[1],
//     longitude: trainerLocation[0],
//     orderDetailsId: orderDetailsId,
//     updatedAt: new Date().toISOString(),
//   });

//   // await sendNotification(orderDetail.created_by, {
//   //   title: "Your trainer is on the way!",
//   //   body: "Your trainer has started their journey.",
//   // });

//   const notificationResult = await sendNotification(orderDetail.created_by, {
//   title: "Your trainer is on the way!",
//   body: "Your trainer has started their journey.",
// });

// if (notificationResult.success) {
//   console.log(`✅ Notification sent successfully for booking ${orderDetailsId}`);
// } else {
//   console.error(`❌ Notification failed for booking ${orderDetailsId}`, notificationResult.error);
// }
//   orderDetail.bookingStatus = status;
//   await orderDetail.save({ session });
// }

//     // COMPLETED
//     else if (status === "COMPLETED") {
//       // ✅ Ensure current status is IN_PROGRESS
//       if (orderDetail.bookingStatus !== "IN_PROGRESS") {
//         return res.status(400).json({ message: "Booking must be in progress to mark it as completed." });
//       }

//       const trainer = await User.findById(trainerId);
//       const customerAddress = await Address.findById(orderDetail.defaultAddress);

//       if (!trainer.location?.coordinates || !customerAddress.coordinates?.coordinates) {
//         return res.status(400).json({ message: "Location data missing." });
//       }

//       const distance = haversine(
//         { lat: trainer.location.coordinates[1], lon: trainer.location.coordinates[0] },
//         { lat: customerAddress.coordinates.coordinates[1], lon: customerAddress.coordinates.coordinates[0] }
//       );

//       if (distance > 20) {
//         return res.status(400).json({
//           message: `You are ${distance.toFixed(2)} meters away from the customer. Must be within 20 meters to complete the booking.`,
//         });
//       }

//       await sendNotification(orderDetail.created_by, {
//         title: "Grooming Completed",
//         body: "Your pet grooming is completed. Please check the summary.",
//       });

//       orderDetail.bookingStatus = "COMPLETED";
//       await orderDetail.save({ session });
//     }

//     else {
//       return res.status(400).json({ message: "Invalid status update action." });
//     }

//     await session.commitTransaction();
//     session.endSession();

//     res.status(200).json({
//       message: `Booking status updated to ${status}`,
//       status,
//     });

//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("Error updating booking status", error);
//     throw error;
//   }
// });
/**---------------4:05----- */
// const PROXIMITY_THRESHOLD = 20; // or fetch from config/env

/**- */
// const updateBookingStatus = asyncHandler(async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { orderDetailsId } = req.params;
//     const { status, trainerLocation } = req.body;
//     const trainerId = req.user._id;

//     const orderDetail = await OrderDetails.findById(orderDetailsId)
//       .populate("defaultAddress created_by")
//       .session(session);

//     if (!orderDetail) {
//       return res.status(404).json({ message: "Order details not found" });
//     }

//     if (!orderDetail.trainer || orderDetail.trainer.toString() !== trainerId.toString()) {
//       return res.status(403).json({ message: "Unauthorized action for this booking" });
//     }

//     if (orderDetail.bookingStatus === "COMPLETED") {
//       return res.status(400).json({ message: "This booking has already been completed." });
//     }

//     let notificationPayload = null;

//     // --- ON_THE_WAY ---
//     if (status === "ON_THE_WAY") {
//       if (orderDetail.bookingStatus !== "NOT_STARTED") {
//         return res.status(400).json({
//           message: `Booking must be 'NOT_STARTED' to mark it as 'ON_THE_WAY'. Current status: '${orderDetail.bookingStatus}'.`,
//         });
//       }

//       await User.findByIdAndUpdate(
//         trainerId,
//         { location: { type: "Point", coordinates: trainerLocation } },
//         { session }
//       );

//       await admin.firestore().collection("liveLocations").doc(trainerId.toString()).set({
//         latitude: trainerLocation[1],
//         longitude: trainerLocation[0],
//         orderDetailsId,
//         updatedAt: new Date().toISOString(),
//       });

//       orderDetail.bookingStatus = status;
//       await orderDetail.save({ session });

//       notificationPayload = {
//         title: "Your trainer is on the way!",
//         body: "Your trainer has started their journey.",
//       };
//     }

//     // --- IN_PROGRESS ---
//     else if (status === "IN_PROGRESS") {
//       const trainer = await User.findById(trainerId).session(session);
//       const customerAddress = await Address.findById(orderDetail.defaultAddress).session(session);

//       if (!trainer.location?.coordinates || !customerAddress.coordinates?.coordinates) {
//         return res.status(400).json({ message: "Location data missing" });
//       }

//       const distance = haversine(
//         { lat: trainer.location.coordinates[1], lon: trainer.location.coordinates[0] },
//         { lat: customerAddress.coordinates.coordinates[1], lon: customerAddress.coordinates.coordinates[0] }
//       );

//       if (distance > PROXIMITY_THRESHOLD) {
//         return res.status(400).json({
//           message: `You are ${distance.toFixed(2)} meters away. Must be within ${PROXIMITY_THRESHOLD}m.`,
//         });
//       }

//       orderDetail.bookingStatus = status;
//       await orderDetail.save({ session });

//       notificationPayload = {
//         title: "trainer has arrived",
//         body: "Your grooming service has started.",
//       };
//     }

//     // --- COMPLETED ---
//     else if (status === "COMPLETED") {
//       if (orderDetail.bookingStatus !== "IN_PROGRESS") {
//         return res.status(400).json({ message: "Booking must be in progress to mark it as completed." });
//       }

//       const trainer = await User.findById(trainerId)
//       const customerAddress = await Address.findById(orderDetail.defaultAddress).session(session);

//       if (!trainer.location?.coordinates || !customerAddress.coordinates?.coordinates) {
//         return res.status(400).json({ message: "Location data missing." });
//       }

//       const distance = haversine(
//         { lat: trainer.location.coordinates[1], lon: trainer.location.coordinates[0] },
//         { lat: customerAddress.coordinates.coordinates[1], lon: customerAddress.coordinates.coordinates[0] }
//       );

//       if (distance > 20) {
//         return res.status(400).json({
//           message: `You are ${distance.toFixed(2)} meters away from the customer. Must be within 20 meters to complete the booking.`,
//         });
//       }

//       orderDetail.bookingStatus = "COMPLETED";
//       await orderDetail.save({ session });

//       notificationPayload = {
//         title: "Grooming Completed",
//         body: "Your pet grooming is completed. Please check the summary.",
//       };
//     } else {
//       return res.status(400).json({ message: "Invalid status update action." });
//     }

//     // COMMIT transaction before sending notification
//     await session.commitTransaction();
//     session.endSession();

//     // ✅ Safe to send notification after commit
//     if (notificationPayload) {
//       try {
//         await sendNotification(orderDetail.created_by, notificationPayload);
//         console.log(`✅ Notification sent successfully for booking ${orderDetailsId}`);
//       } catch (err) {
//         console.error(`❌ Notification failed for booking ${orderDetailsId}`, err);
//       }
//     }

//     res.status(200).json({
//       message: `Booking status updated to ${status}`,
//       status,
//     });

//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("Error updating booking status", error);
//     throw error;
//   }
// });
/**- */
// const PROXIMITY_THRESHOLD = 200;
// const updateBookingStatus = asyncHandler(async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { orderDetailsId } = req.params;
//     const { status, trainerLocation } = req.body;
//     const trainerId = req.user._id;

//     const orderDetail = await OrderDetails.findById(orderDetailsId)
//       .populate("defaultAddress created_by")
//       .session(session);

//     if (!orderDetail) {
//       return res.status(404).json({ message: "Order details not found" });
//     }

//     if (!orderDetail.trainer || orderDetail.trainer.toString() !== trainerId.toString()) {
//       return res.status(403).json({ message: "Unauthorized action for this booking" });
//     }

//     if (orderDetail.bookingStatus === "COMPLETED") {
//       return res.status(400).json({ message: "This booking has already been completed." });
//     }

//     let notificationPayload = null;

//     // --- ON_THE_WAY ---
//     if (status === "ON_THE_WAY") {
//       if (orderDetail.bookingStatus !== "NOT_STARTED") {
//         return res.status(400).json({
//           message: `Booking must be 'NOT_STARTED' to mark it as 'ON_THE_WAY'. Current status: '${orderDetail.bookingStatus}'.`,
//         });
//       }

//       await User.findByIdAndUpdate(
//         trainerId,
//         { location: { type: "Point", coordinates: trainerLocation } },
//         { session }
//       );

//       await admin.firestore().collection("liveLocations").doc(trainerId.toString()).set({
//         latitude: trainerLocation[1],
//         longitude: trainerLocation[0],
//         orderDetailsId,
//         updatedAt: new Date().toISOString(),
//       });

//       orderDetail.bookingStatus = status;
//       await orderDetail.save({ session });

//       notificationPayload = {
//         title: "Your trainer is on the way!",
//         body: "Your trainer has started their journey.",
//       };
//     }

//     // --- IN_PROGRESS ---
//     // else if (status === "IN_PROGRESS") {
//     //   const trainer = await User.findById(trainerId).session(session);
//     //   const customerAddress = await Address.findById(orderDetail.defaultAddress).session(session);

//     //   if (!trainer.location?.coordinates || !customerAddress.coordinates?.coordinates) {
//     //     return res.status(400).json({ message: "Location data missing" });
//     //   }

//     //   const distance = haversine(
//     //     { lat: trainer.location.coordinates[1], lon: trainer.location.coordinates[0] },
//     //     { lat: customerAddress.coordinates.coordinates[1], lon: customerAddress.coordinates.coordinates[0] }
//     //   );

//     //   if (distance > PROXIMITY_THRESHOLD) {
//     //     return res.status(400).json({
//     //       message: `You are ${distance.toFixed(2)} meters away. Must be within ${PROXIMITY_THRESHOLD}m.`,
//     //     });
//     //   }

//     //   orderDetail.bookingStatus = status;
//     //   await orderDetail.save({ session });

//     //   notificationPayload = {
//     //     title: "trainer has arrived",
//     //     body: "Your grooming service has started.",
//     //   };
//     // }
// else if (status === "IN_PROGRESS") {
//   if (!trainerLocation) {
//     return res.status(400).json({ message: "trainer location is required to start service." });
//   }

//   // 📌 Update trainer live location in DB
//   await User.findByIdAndUpdate(
//     trainerId,
//     { location: { type: "Point", coordinates: trainerLocation } },
//     { session }
//   );

//   // Re-fetch trainer location from DB
//   const trainer = await User.findById(trainerId).session(session);
//   const customerAddress = await Address.findById(orderDetail.defaultAddress).session(session);

//   if (!trainer.location?.coordinates || !customerAddress.coordinates?.coordinates) {
//     return res.status(400).json({ message: "Location data missing" });
//   }

//   console.log("📌 trainer Location:", trainer.location.coordinates);
//   console.log("📌 Customer Location:", customerAddress.coordinates.coordinates);

//   const distance = haversine(
//     { lat: trainer.location.coordinates[1], lon: trainer.location.coordinates[0] },
//     { lat: customerAddress.coordinates.coordinates[1], lon: customerAddress.coordinates.coordinates[0] }
//   );

//   console.log("📏 Calculated distance (m):", distance);

//   if (distance > PROXIMITY_THRESHOLD) {
//     return res.status(400).json({
//       message: `You are ${distance.toFixed(2)} meters away. Must be within ${PROXIMITY_THRESHOLD}m.`,
//     });
//   }

//   orderDetail.bookingStatus = status;
//   await orderDetail.save({ session });

//   notificationPayload = {
//     title: "trainer has arrived",
//     body: "Your grooming service has started.",
//   };
// }

//     // --- COMPLETED ---
//     else if (status === "COMPLETED") {
//       if (orderDetail.bookingStatus !== "IN_PROGRESS") {
//         return res.status(400).json({ message: "Booking must be in progress to mark it as completed." });
//       }

//       const trainer = await User.findById(trainerId).session(session); // 🔧 added .session(session)
//       const customerAddress = await Address.findById(orderDetail.defaultAddress).session(session);

//       if (!trainer.location?.coordinates || !customerAddress.coordinates?.coordinates) {
//         return res.status(400).json({ message: "Location data missing." });
//       }

//       const distance = haversine(
//         { lat: trainer.location.coordinates[1], lon: trainer.location.coordinates[0] },
//         { lat: customerAddress.coordinates.coordinates[1], lon: customerAddress.coordinates.coordinates[0] }
//       );
// // console.log("Distance-------------------->",distance);

//    if (distance > PROXIMITY_THRESHOLD) {
//   return res.status(400).json({
//     message: `You are ${distance.toFixed(2)} meters away from the customer. Must be within ${PROXIMITY_THRESHOLD} meters to complete the booking.`,
//   });
// }

//       orderDetail.bookingStatus = "COMPLETED";
//       await orderDetail.save({ session });

//       notificationPayload = {
//         title: "Grooming Completed",
//         body: "Your pet grooming is completed. Please check the summary.",
//       };
//     } 
//     else {
//       return res.status(400).json({ message: "Invalid status update action." });
//     }

//     // COMMIT transaction before sending notification
//     await session.commitTransaction();
//     session.endSession();

//     // ✅ Safe to send notification after commit
//     if (notificationPayload) {
//       try {
//         await sendNotification(orderDetail.created_by, notificationPayload);
//         console.log(`✅ Notification sent successfully for booking ${orderDetailsId}`);
//       } catch (err) {
//         console.error(`❌ Notification failed for booking ${orderDetailsId}`, err);
//       }
//     }

//     res.status(200).json({
//       message: `Booking status updated to ${status}`,
//       status,
//     });

//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("Error updating booking status", error);
//     res.status(500).json({ message: "Error updating booking status", error: error.message });
//   }
// });


const PROXIMITY_THRESHOLD = 50; // 50 meters
const OTP_EXPIRY_MINUTES = 5; // OTP valid for 5 minutes

const trainerCheckin = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderDetailsId } = req.params;
    const { status, trainerLocation } = req.body;
    const trainerId = req.user._id;

    // 1. Validate status (strictly CHECKIN only)
    if (status !== "CHECKIN") {
      return res.status(400).json({ 
        message: "Status field is required and must be 'CHECKIN'." 
      });
    }

    // 2. Fetch order details
    const orderDetail = await OrderDetails.findById(orderDetailsId)
      .populate({
        path: 'defaultAddress',
        select: 'coordinates'
      })
      .session(session);

    if (!orderDetail) {
      return res.status(404).json({ message: "Order details not found" });
    }

    if (orderDetail.bookingStatus === "CHECKIN") {
      return res.status(400).json({ 
        message: "Check-in already completed for this booking" 
      });
    }

    // 3. Validate trainer assignment
    if (!orderDetail.trainer || orderDetail.trainer.toString() !== trainerId.toString()) {
      return res.status(403).json({ message: "Unauthorized action for this booking" });
    }

    // 4. Validate location data
    if (!trainerLocation) {
      return res.status(400).json({ message: "trainer location is required" });
    }

    // 5. Proximity check (using $geoNear + haversine fallback)
    const trainerPoint = { type: "Point", coordinates: trainerLocation };
    const customerAddress = await Address.findById(orderDetail.defaultAddress).session(session);

    if (!customerAddress?.coordinates?.coordinates) {
      return res.status(400).json({ message: "Customer location data missing" });
    }

    // Geospatial query
    const proximityCheck = await Address.aggregate([
      {
        $geoNear: {
          near: trainerPoint,
          distanceField: "distance",
          maxDistance: PROXIMITY_THRESHOLD,
          query: { _id: customerAddress._id },
          spherical: true
        }
      },
      { $limit: 1 }
    ]).session(session);

    // Fallback to haversine if needed
    if (proximityCheck.length === 0) {
      const distance = haversine(
        { lat: trainerLocation[1], lon: trainerLocation[0] },
        { lat: customerAddress.coordinates.coordinates[1], lon: customerAddress.coordinates.coordinates[0] }
      );
      if (distance > PROXIMITY_THRESHOLD) {
        return res.status(400).json({
          message: `You are ${distance.toFixed(2)} meters away. Must be within ${PROXIMITY_THRESHOLD}m.`
        });
      }
    }

    // 6. Update records
    await User.findByIdAndUpdate(
      trainerId,
      { 
        location: trainerPoint,
        userStatus: "BUSY" 
      },
      { session }
    );

    orderDetail.bookingStatus = "CHECKIN";
    await orderDetail.save({ session });

    // 7. Commit and notify
    await session.commitTransaction();
    session.endSession();

    // await sendNotification(orderDetail.created_by, {
    //   title: "trainer Checked In",
    //   body: "Your trainer has arrived."
    // });
    
        try {
      if (orderDetail.created_by) {
        await sendNotification(orderDetail.created_by.toString(), {
          title: "trainer Checked In",
          body: "Your trainer has arrived.",
          data: {
            orderDetailsId: orderDetail._id.toString(),
            status: "CHECKIN"
          }
        });
      }
    } catch (notifError) {
      console.error("Notification send failed:", notifError);
      // Proceed even if notification fails
    }

    res.status(200).json({
      message: "Successfully checked in",
      status: "CHECKIN"
    });
    
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ 
      message: "Check-in failed",
      error: error.message 
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

  return res.status(200).json(new ApiResponse(200, null, "Trainer checked out successfully"));
});

// const initiateCheckout = asyncHandler(async (req, res) => {
//   const session = await mongoose.startSession();
//   let otp; // Declare otp in the outer scope

//   try {
//     const result = await session.withTransaction(async () => {
//       const { orderDetailsId } = req.params;
//       const { trainerLocation } = req.body;
//       const trainerId = req.user._id;

//       // Validate input
//       if (!trainerLocation || !Array.isArray(trainerLocation)) {
//         throw new ApiError(400, "Valid trainer location is required");
//       }

//       // Fetch data within transaction
//       const [orderDetail, trainer] = await Promise.all([
//         OrderDetails.findById(orderDetailsId)
//           .populate({
//             path: 'defaultAddress created_by',
//             select: 'coordinates'
//           })
//           .session(session),
//         User.findById(trainerId).session(session)
//       ]);

//       if (!orderDetail || !trainer) {
//         throw new ApiError(404, "Order or trainer not found");
//       }

//       if (orderDetail.trainer.toString() !== trainerId.toString()) {
//         throw new ApiError(403, "Unauthorized action");
//       }

//       if (orderDetail.bookingStatus !== "CHECKIN") {
//         throw new ApiError(400, `Checkout requires CHECKIN status. Current: ${orderDetail.bookingStatus}`);
//       }

//       // Proximity check
//       const trainerPoint = { type: "Point", coordinates: trainerLocation };
//       const customerAddress = orderDetail.defaultAddress;
      
//       if (!customerAddress?.coordinates?.coordinates) {
//         throw new ApiError(400, "Customer location data missing");
//       }

//       // Geospatial query
//       const proximityCheck = await Address.aggregate([
//         {
//           $geoNear: {
//             near: trainerPoint,
//             distanceField: "distance",
//             maxDistance: PROXIMITY_THRESHOLD,
//             query: { _id: customerAddress._id },
//             spherical: true
//           }
//         },
//         { $limit: 1 }
//       ]).session(session);

//       // Haversine fallback
//       if (proximityCheck.length === 0) {
//         const distance = haversine(
//           { lat: trainerLocation[1], lon: trainerLocation[0] },
//           { lat: customerAddress.coordinates.coordinates[1], lon: customerAddress.coordinates.coordinates[0] }
//         );
//         if (distance > PROXIMITY_THRESHOLD) {
//           throw new ApiError(400, `You're ${distance.toFixed(2)}m away. Must be within ${PROXIMITY_THRESHOLD}m`);
//         }
//       }

//       // Generate OTP
//       otp = Math.floor(100000 + Math.random() * 900000).toString(); // Now accessible outside
//       const otpHash = await bcrypt.hash(otp, 10);

//       // Update trainer
//       trainer.otp = otpHash;
//       trainer.otp_time = new Date();
//       await trainer.save({ session });

//       return { 
//         otpExpiry: OTP_EXPIRY_MINUTES,
//         email: trainer.email
//       };
//     });

//     // Send email AFTER successful transaction
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     await transporter.sendMail({
//       to: result.email,
//       subject: "Your Checkout OTP",
//       html: `<p>Your OTP: <strong>${otp}</strong> (valid for ${OTP_EXPIRY_MINUTES} minutes)</p>`
//     });

//     res.status(200).json(
//       new ApiResponse(200, "OTP sent successfully", {
//         ...result,
//         email: result.email.replace(/(.{2}).+@/, "$1****@") // Mask email in response
//       })
//     );

//   } catch (error) {
//     console.error("Checkout initiation error:", error);
    
//     if (error instanceof ApiError) {
//       res.status(error.statusCode).json(error);
//     } else {
//       res.status(500).json(
//         new ApiError(500, "Checkout initiation failed", error.message)
//       );
//     }
//   } finally {
//     await session.endSession();
//   }
// });

/**------working well 2nd------ */
// const initiateCheckout = asyncHandler(async (req, res) => {
//   const session = await mongoose.startSession();
//   let otp;

//   try {
//     // Validate request body first (before starting transaction)
//     const { trainerLocation } = req.body;
//     if (!trainerLocation || !Array.isArray(trainerLocation) || trainerLocation.length !== 2) {
//       throw new ApiError(400, "Valid trainer location is required as [longitude, latitude] array");
//     }

//     // Validate coordinates are numbers
//     if (typeof trainerLocation[0] !== 'number' || typeof trainerLocation[1] !== 'number') {
//       throw new ApiError(400, "Coordinates must be numbers");
//     }

//     // Validate coordinates are within valid ranges
//     if (Math.abs(trainerLocation[0]) > 180 || Math.abs(trainerLocation[1]) > 90) {
//       throw new ApiError(400, "Invalid coordinates: longitude must be [-180,180] and latitude [-90,90]");
//     }

//     const result = await session.withTransaction(async () => {
//       const { orderDetailsId } = req.params;
//       const trainerId = req.user._id;

//       // Fetch data within transaction
//       const [orderDetail, trainer] = await Promise.all([
//         OrderDetails.findById(orderDetailsId)
//           .populate({
//             path: 'defaultAddress created_by',
//             select: 'coordinates'
//           })
//           .session(session),
//         User.findById(trainerId).session(session)
//       ]);

//       if (!orderDetail) throw new ApiError(404, "Order not found");
//       if (!trainer) throw new ApiError(404, "trainer not found");

//       if (orderDetail.trainer.toString() !== trainerId.toString()) {
//         throw new ApiError(403, "Unauthorized action for this booking");
//       }

//       if (orderDetail.bookingStatus !== "CHECKIN") {
//         throw new ApiError(400, `Checkout requires CHECKIN status. Current: ${orderDetail.bookingStatus}`);
//       }

//       // Proximity check
//       const trainerPoint = { type: "Point", coordinates: trainerLocation };
//       const customerAddress = orderDetail.defaultAddress;
      
//       if (!customerAddress?.coordinates?.coordinates) {
//         throw new ApiError(400, "Customer address coordinates missing");
//       }

//       // Geospatial query
//       const proximityCheck = await Address.aggregate([
//         {
//           $geoNear: {
//             near: trainerPoint,
//             distanceField: "distance",
//             maxDistance: PROXIMITY_THRESHOLD,
//             query: { _id: customerAddress._id },
//             spherical: true
//           }
//         },
//         { $limit: 1 }
//       ]).session(session);

//       // Haversine fallback
//       if (proximityCheck.length === 0) {
//         const distance = haversine(
//           { lat: trainerLocation[1], lon: trainerLocation[0] },
//           { lat: customerAddress.coordinates.coordinates[1], lon: customerAddress.coordinates.coordinates[0] }
//         );
//         if (distance > PROXIMITY_THRESHOLD) {
//           throw new ApiError(400, `You're ${distance.toFixed(2)}m away. Must be within ${PROXIMITY_THRESHOLD}m`);
//         }
//       }

//       // Generate OTP
//       otp = Math.floor(100000 + Math.random() * 900000).toString();
//       const otpHash = await bcrypt.hash(otp, 10);

//       // Update trainer
//       trainer.otp = otpHash;
//       trainer.otp_time = new Date();
//       await trainer.save({ session });

//       return { 
//         otpExpiry: OTP_EXPIRY_MINUTES,
//         email: trainer.email
//       };
//     });

//     // Send email AFTER successful transaction
//     try {
//       const transporter = nodemailer.createTransport({
//         service: "gmail",
//         auth: {
//           user: process.env.EMAIL_USER,
//           pass: process.env.EMAIL_PASS,
//         },
//       });

//       await transporter.sendMail({
//         to: result.email,
//         subject: "Your Checkout OTP",
//         html: `
//           <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//             <h2 style="color: #4a90e2;">Service Checkout Verification</h2>
//             <p>Your one-time password for completing the service:</p>
//             <div style="font-size: 24px; letter-spacing: 3px; margin: 20px 0; padding: 10px; background: #f5f5f5; display: inline-block;">
//               ${otp}
//             </div>
//             <p>Valid for <strong>${OTP_EXPIRY_MINUTES} minutes</strong> only.</p>
//             <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
//             <p style="font-size: 12px; color: #999;">
//               If you didn't request this, please contact our support team immediately.
//             </p>
//           </div>
//         `
//       });
//     } catch (emailError) {
//       console.error("Failed to send email:", emailError);
//       // Don't fail the request since OTP was already saved
//     }

//     res.status(200).json(
//       new ApiResponse(200, "OTP sent successfully", {
//         ...result,
//         email: result.email.replace(/(.{2}).+@/, "$1****@") // Mask email
//       })
//     );

//   } catch (error) {
//     console.error("Checkout initiation error:", error);
    
//     if (error instanceof ApiError) {
//       res.status(error.statusCode).json(error);
//     } else {
//       res.status(500).json(
//         new ApiError(500, "Checkout initiation failed", error.message)
//       );
//     }
//   } finally {
//     await session.endSession();
//   }
// });

// const completeCheckout = asyncHandler(async (req, res) => {
//   const session = await mongoose.startSession();
  
//   try {
//     const result = await session.withTransaction(async () => {
//       const { orderDetailsId } = req.params;
//       const { otp } = req.body;
//       const trainerId = req.user._id;

//       // Validate OTP format
//       if (!otp || !/^\d{6}$/.test(otp)) {
//         throw new ApiError(400, "Valid 6-digit OTP required");
//       }

//       // Fetch records
//       const [orderDetail, trainer] = await Promise.all([
//         OrderDetails.findById(orderDetailsId).session(session),
//         User.findById(trainerId).session(session)
//       ]);

//       // Validate records
//       if (!orderDetail || !trainer) {
//         throw new ApiError(404, "Order or trainer not found");
//       }

//       if (!trainer.otp) {
//         throw new ApiError(400, "No OTP generated for this trainer");
//       }

//       // Verify OTP
//       const isMatch = await bcrypt.compare(otp, trainer.otp);
//       if (!isMatch) {
//         throw new ApiError(400, "Invalid OTP");
//       }

//       // Check expiry
//       const expiryTime = new Date(trainer.otp_time.getTime() + (OTP_EXPIRY_MINUTES * 60000));
//       if (new Date() > expiryTime) {
//         throw new ApiError(400, "OTP expired");
//       }

//       // Update records
//       await Promise.all([
//         OrderDetails.findByIdAndUpdate(
//           orderDetailsId,
//           { bookingStatus: "COMPLETED" },
//           { session }
//         ),
//         User.findByIdAndUpdate(
//           trainerId,
//           { 
//             userStatus: "AVAILABLE",
//             otp: null,
//             otp_time: null,
//             location: null
//           },
//           { session }
//         )
//       ]);

//       return { status: "COMPLETED" };
//     });

//     // Send notification AFTER transaction commits
//     const orderDetail = await OrderDetails.findById(orderDetailsId)
//       .populate('created_by');
      
//     await sendNotification(orderDetail.created_by._id, {
//       title: "Service Completed",
//       body: "Your grooming service is finished"
//     });

//     res.status(200).json(
//       new ApiResponse(200, "Checkout completed successfully", result)
//     );

//   } catch (error) {
//     console.error("Checkout completion error:", error);
    
//     if (error instanceof ApiError) {
//       res.status(error.statusCode).json(error);
//     } else {
//       res.status(500).json(
//         new ApiError(500, "Checkout verification failed", error.message)
//       );
//     }
//   } finally {
//     await session.endSession();
//   }
// });
/**----------- */
const initiateCheckout = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  let otp;

  try {
    // Validate request body (BEFORE starting transaction)
    const { trainerLocation } = req.body;
    
    if (!trainerLocation) {
      throw new ApiError(400, "trainer location is required");
    }

    if (!Array.isArray(trainerLocation)) {
      throw new ApiError(400, "Location must be an array [longitude, latitude]");
    }

    if (trainerLocation.length !== 2) {
      throw new ApiError(400, "Exactly 2 coordinates required [longitude, latitude]");
    }

    if (typeof trainerLocation[0] !== 'number' || typeof trainerLocation[1] !== 'number') {
      throw new ApiError(400, "Coordinates must be numbers");
    }

    // Validate coordinate ranges
    if (trainerLocation[0] < -180 || trainerLocation[0] > 180 || 
        trainerLocation[1] < -90 || trainerLocation[1] > 90) {
      throw new ApiError(400, "Invalid coordinates: longitude [-180,180], latitude [-90,90]");
    }

    const result = await session.withTransaction(async () => {
      const { orderDetailsId } = req.params;
      const trainerId = req.user._id;

      // Fetch all required data in parallel
      const [orderDetail, trainer] = await Promise.all([
        OrderDetails.findById(orderDetailsId)
          .populate({
            path: 'defaultAddress',
            select: 'coordinates'
          })
          .session(session),
        User.findById(trainerId).session(session)
      ]);

      // Validate records exist
      if (!orderDetail) throw new ApiError(404, "Order not found");
      if (!trainer) throw new ApiError(404, "trainer not found");

      // Validate trainer assignment
      if (orderDetail.trainer.toString() !== trainerId.toString()) {
        throw new ApiError(403, "Unauthorized action for this booking");
      }

      // Validate current status
      if (orderDetail.bookingStatus !== "CHECKIN") {
        throw new ApiError(400, `Checkout requires CHECKIN status. Current: ${orderDetail.bookingStatus}`);
      }

      // Proximity check
      const trainerPoint = { 
        type: "Point", 
        coordinates: trainerLocation 
      };
      
      const customerAddress = orderDetail.defaultAddress;
      if (!customerAddress?.coordinates?.coordinates) {
        throw new ApiError(400, "Customer address coordinates missing");
      }

      // Try MongoDB geospatial query first
      let isWithinProximity = false;
      try {
        const proximityCheck = await Address.aggregate([
          {
            $geoNear: {
              near: trainerPoint,
              distanceField: "distance",
              maxDistance: PROXIMITY_THRESHOLD,
              query: { _id: customerAddress._id },
              spherical: true
            }
          },
          { $limit: 1 }
        ]).session(session);

        isWithinProximity = proximityCheck.length > 0;
      } catch (geoError) {
        console.warn("Geospatial query failed, using fallback:", geoError);
        // Fallback to haversine calculation
        const distance = haversine(
          { lat: trainerLocation[1], lon: trainerLocation[0] },
          { lat: customerAddress.coordinates.coordinates[1], lon: customerAddress.coordinates.coordinates[0] }
        );
        isWithinProximity = distance <= PROXIMITY_THRESHOLD;
      }

      if (!isWithinProximity) {
        // Final precise distance calculation for error message
        const preciseDistance = haversine(
          { lat: trainerLocation[1], lon: trainerLocation[0] },
          { lat: customerAddress.coordinates.coordinates[1], lon: customerAddress.coordinates.coordinates[0] }
        );
        throw new ApiError(400, `You are ${preciseDistance.toFixed(2)} meters away. Must be within ${PROXIMITY_THRESHOLD}m`);
      }

      // Generate OTP
      otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await bcrypt.hash(otp, 10);

      // Update trainer record
      trainer.otp = otpHash;
      trainer.otp_time = new Date();
      await trainer.save({ session });

      return { 
        otpExpiry: OTP_EXPIRY_MINUTES,
        email: trainer.email
      };
    });

    // Send email AFTER transaction succeeds
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `PetGrooming Service <${process.env.EMAIL_USER}>`,
        to: result.email,
        subject: "Your Checkout Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #4a90e2;">Service Checkout Verification</h2>
            <p>Your one-time password to complete the service:</p>
            <div style="font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0; padding: 15px; background: #f5f5f5; text-align: center; border-radius: 5px;">
              ${otp}
            </div>
            <p>Valid for <strong>${OTP_EXPIRY_MINUTES} minutes</strong> only.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">
              If you didn't request this, please contact our support team immediately.
            </p>
          </div>
        `
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Don't fail the request since OTP was saved successfully
    }

    res.status(200).json(
      new ApiResponse(200, "OTP sent successfully", {
        ...result,
        email: result.email.replace(/(.{2}).+@/, "$1****@") // Mask email in response
      })
    );

  } catch (error) {
    console.error("Checkout initiation error:", error);
    
    if (error instanceof ApiError) {
      res.status(error.statusCode).json(error);
    } else {
      res.status(500).json(
        new ApiError(500, "Checkout initiation failed", error.message)
      );
    }
  } finally {
    await session.endSession();
  }
});
/***------ */
const completeCheckout = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    // Validate request body (BEFORE starting transaction)
    const { otp } = req.body;
    const { orderDetailsId } = req.params;
    if (!otp) {
      throw new ApiError(400, "OTP is required");
    }

    if (typeof otp !== 'string') {
      throw new ApiError(400, "OTP must be a string");
    }

    if (!/^\d{6}$/.test(otp)) {
      throw new ApiError(400, "OTP must be 6 digits");
    }

    const result = await session.withTransaction(async () => {
      // const { orderDetailsId } = req.params;
      const trainerId = req.user._id;

      // Fetch records in parallel
      const [orderDetail, trainer] = await Promise.all([
        OrderDetails.findById(orderDetailsId).session(session),
        User.findById(trainerId).session(session)
      ]);

      // Validate records exist
      if (!orderDetail) throw new ApiError(404, "Order not found");
      if (!trainer) throw new ApiError(404, "trainer not found");

      // Validate OTP exists
      if (!trainer.otp) {
        throw new ApiError(400, "No OTP generated for this trainer");
      }

      // Verify OTP match
      const isMatch = await bcrypt.compare(otp, trainer.otp);
      if (!isMatch) {
        throw new ApiError(400, "Invalid OTP");
      }

      // Check OTP expiry
      const expiryTime = new Date(trainer.otp_time.getTime() + (OTP_EXPIRY_MINUTES * 60000));
      if (new Date() > expiryTime) {
        throw new ApiError(400, "OTP expired");
      }

      // Update records atomically
      await Promise.all([
        OrderDetails.findByIdAndUpdate(
          orderDetailsId,
          { 
            bookingStatus: "COMPLETED",
            updatedAt: new Date()
          },
          { session }
        ),
        User.findByIdAndUpdate(
          trainerId,
          { 
            userStatus: "AVAILABLE",
            otp: null,
            otp_time: null,
            location: null,
            updatedAt: new Date()
          },
          { session }
        )
      ]);

      return { 
        status: "COMPLETED",
        completedAt: new Date().toISOString()
      };
    });

  try {
  const orderDetail = await OrderDetails.findById(orderDetailsId).lean()
  // console.log("orderDetails----------->",orderDetailsId)
  if (orderDetail?.created_by) {
    await sendNotification(orderDetail.created_by.toString(), {
      title: "Service Completed",
      body: "Your grooming service is finished. Thank you!",
      data: {
        orderId: orderDetailsId,
        status: "COMPLETED"
      }
    });

  } else {
    console.warn(`No created_by found on OrderDetails ${orderDetailsId}`);
  }

} catch (notifError) {
  console.error("Notification failed:", notifError);
  // Continue gracefully despite notification failure
}

    res.status(200).json(
      new ApiResponse(200, "Checkout completed successfully", result)
    );

  } catch (error) {
    console.error("Checkout completion error:", error);
    
    if (error instanceof ApiError) {
      res.status(error.statusCode).json(error);
    } else {
      res.status(500).json(
        new ApiError(500, "Checkout verification failed", error.message)
      );
    }
  } finally {
    await session.endSession();
  }
});

export {
  createTrainer,
  getAllTrainer,
  getTrainerrById,
  updateTrainer,
  deleteTrainer,
  updateTrainerStatus,
  getAllOrders,
  getAllAssignedJobs,
  getOrderDetailsById,
  // updateBookingStatus,
  updateTrainerProfileByTrainer,
  trainerCheckin,
  initiateCheckout,
  completeCheckout
};
