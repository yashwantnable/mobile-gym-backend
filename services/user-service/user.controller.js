import { User } from "../../models/user.model.js";
import { UserRole } from "../../models/userRole.model.js"
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import pagination from "../../utils/pagination.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../../utils/cloudinary.js";

// import {ServiceType} from "../../models/service.model.js"
import {SubServiceType} from "../../models/subService.model.js"
// import {Address} from "../../models/user.model.js"
import {SubServiceRatingReview} from "../../models/ratingReview.model.js"
import { TrainerRatingReview } from "../../models/trainerRatingReview.model.js"
import {TaxMaster, ExtraCharge} from "../../models/master.model.js"
import {Cart} from "../../models/cart.model.js"
import {PromoCode} from "../../models/admin.model.js"
import mongoose from "mongoose";
import {Notification} from "../../models/notification.model.js"
import { OrderDetails } from "../../models/order.model.js";
import { TimeSlot } from "../../models/timeslot.model.js";

//Update User status
const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!req.params.userId || req.params.userId == "undefined") {
    return res.status(400).json(new ApiError(400, "user id is not provided"));
  }

  const existingUser = await User.findById(req.params.userId);
  if (!existingUser) {
    return res.status(404).json(new ApiError(404, "User not found"));
  }

  const user = await User.findByIdAndUpdate(
    req.params.userId,
    {
      $set: {
        status,
      },
    },
    { new: true }
  ).select("-password -refreshToken -user_role -otp -otp_time -uid");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "user status updated successfully"));
});


//Create User
const createUser = asyncHandler(async (req, res) => {
  console.log("user register Req.body", req.body);
  const {
    email,
    user_role,
    first_name,
    last_name,
    phone_number,
    gender,
    address,
    age,
    country,
    city,
    specialization,
    experience,
    experienceYear,
    password,
  } = req.body;

  const imageLocalPath = req.file?.path;

  const requiredFields = {
    email,
    first_name,
    phone_number,
    password,
    user_role,

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

  const existedUser = await User.findOne({
    $or: [{ email }],
  });

  if (existedUser) {
    return res
      .status(400)
      .json(new ApiError(400, "User with email or phone already exists"));
  }

  const userRole = await UserRole.findOne({ role_id: user_role });

  if (!userRole) {
    return res.status(400).json(new ApiError(400, "User Role Not found"));
  }

    let profile_image = null;
    if (imageLocalPath) {
      const uploadedImage = await uploadOnCloudinary(imageLocalPath);
      if (!uploadedImage?.url) {
        return res.status(400).json(new ApiError(400, "Error while uploading image"));
      }
      profile_image = uploadedImage.url;
    }

  const user = await User.create({
    uid: req.user?.uid || "",
    email,
    user_role: userRole?._id,
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
    password,
    status: userRole?.name === "customer" ? "Approved" : "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -user_role -otp -otp_time -uid"
  );

  if (!createdUser) {
    return res
      .status(500)
      .json(
        new ApiError(500, "Something went wrong while registering the user")
      );
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});


//update User
const updateUser = asyncHandler(async (req, res) => {

  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "User ID not provided"));
  }

  if (Object.keys(req.body).length === 0 && !req.file) {
    return res.status(400).json(new ApiError(400, "No data provided to update"));
  }

  const {
    email,
    // user_role,
    first_name,
    last_name,
    phone_number,
    gender,
    address,
    age,
    country,
    city,
    specialization,
    experience,
    experienceYear,
    password,
  } = req.body;

  const imageLocalPath = req.file?.path;
  
  const existingUser = await User.findById(req.params.id);
  if (!existingUser) {
    return res.status(404).json(new ApiError(404, "User not found"));
  }

  let profile_image = existingUser.profile_image;
  if (imageLocalPath) {
    try {
      const [deleteResult, uploadResult] = await Promise.all([
        existingUser.profile_image ? deleteFromCloudinary(existingUser.profile_image) : Promise.resolve(),
        uploadOnCloudinary(imageLocalPath)
      ]);
      if (!uploadResult?.url) {
        return res.status(400).json(new ApiError(400, "Error while uploading profile image"));
      }
      profile_image = uploadResult.url;
    } catch (error) {
      return res.status(500).json(new ApiError(500, "Image handling failed"));
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    {
      email,
      // user_role,
      first_name,
      last_name,
      phone_number,
      gender,
      address,
      age,
      country,
      city,
      specialization,
      experience,
      experienceYear,
      password,
      profile_image,
      updated_by: req.user?._id,
      updated_at: new Date(),
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "User updated successfully"));
});
 

//Get alla user
const getAllUser = asyncHandler(async (req, res) => {

  const users = await User.find().populate("user_role country city")
  .select('-otp -otp_time -password -refreshToken') 
  .populate("user_role country city");
  const user = users.filter(user => user.user_role && user.user_role.name === "customer" && user.user_role.role_id === 3);

  res.status(200).json(new ApiResponse(200, user, "customer fetched successfully"));
});


//get User by ID
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id)
    return res.status(400).json(new ApiError(400, "User ID is required"));

  const user = await User.findById(id)
    .select('-otp -otp_time -password -refreshToken') 
    .populate("user_role country city phone_number");

  if (!user) return res.status(404).json(new ApiError(404, "User not found"));

  if (user.user_role && user.user_role.name !== "customer") {
    return res.status(403).json(new ApiError(403, "User is not a customer"));
  }

  res.status(200).json(new ApiResponse(200, user, "customer fetched successfully"));
});


//delete User
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id || id === "undefined") {
    return res.status(400).json(new ApiError(400, "User ID not provided"));
  }

  const customer = await User.findById(id);

  if (!customer) {
    return res.status(404).json(new ApiError(404, "User not found"));
  }

  const userRole = await UserRole.findById(customer.user_role);
  if (!userRole || userRole.name !== "customer") {
    return res.status(403).json(new ApiError(403, "User is not a customer"));
  }

  if (customer?.profile_image) {
    await deleteFromCloudinary(customer.profile_image);
  }

  await User.findByIdAndDelete(id);

  res.status(200).json(new ApiResponse(200, "customer deleted successfully"));
});


// Get all Customer Services
const getAllCustomerService = asyncHandler(async (req, res) => {
  const services = await ServiceType.find()
  return res.status(200).json(new ApiResponse(200, services, "Services  fetched successfully"));
});


// Get all Subservices by Service ID
const getAllSubserviceByService = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;

  const service = await ServiceType.findById(serviceId).lean();
  if (!service) {
    return res.status(404).json(new ApiResponse(404, null, "Service not found"));
  }

  const subServices = await SubServiceType.find({ serviceTypeId: serviceId }).sort({ name: 1 }).lean();

  const responseData = {
    ...service,
    subServices: subServices.map(({ serviceTypeId, ...rest }) => rest),
  };

  return res.status(200).json(new ApiResponse(200, responseData, "Subservices grouped under serviceType fetched successfully"));
});


// Get SubService by ID
const getSubserviceBySubServiceId = asyncHandler(async (req, res) => {
  const { subServiceId } = req.params;

  const subService = await SubServiceType.findById(subServiceId)
    .populate('serviceTypeId');

  if (!subService) {
    return res.status(404).json(new ApiResponse(404, null, "Subservice not found"));
  }

  return res.status(200).json(new ApiResponse(200, subService, "Subservice fetched successfully"));
});


//create address
const createAddress = asyncHandler(async (req, res) => {
  const {
    name,
    phone_number,
    country,
    city,
    flat_no,
    street,
    landmark,
    pin_code,
    delivery_note,
    coordinates,
    make_default_address,
  } = req.body;

  const requiredFields = {
    name,
    phone_number,
    pin_code,
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

  const createdAddress = await Address.create({
    name,
    phone_number,
    country,
    city,
    flat_no,
    street,
    landmark,
    pin_code,
    delivery_note,
    coordinates,
    make_default_address,
    created_by: req.user?._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, createdAddress, "Address created successfully"));
});


//update Address
const updateAddress = asyncHandler(async (req, res) => {
  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  if (Object.keys(req.body).length === 0) {
    return res
      .status(400)
      .json(new ApiError(400, "No data provided to update"));
  }

  const {
    name,
    phone_number,
    country,
    city,
    flat_no,
    street,
    landmark,
    pin_code,
    delivery_note,
    coordinates,
    make_default_address,
  } = req.body;

  const updatedAddress = await Address.findByIdAndUpdate(
    req.params.id,
    {
      name,
      phone_number,
      country,
      city,
      flat_no,
      street,
      landmark,
      pin_code,
      delivery_note,
      coordinates,
      make_default_address,
      updated_by: req.user?._id,
    },
    { new: true }
  );

  if (!updatedAddress) {
    return res.status(404).json(new ApiError(404, "Address not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedAddress, "Address updated successfully"));
});


//get all Address by user
const getAllAddress = asyncHandler(async (req, res) => {
  const allAddress = await Address.find({ created_by: req.user._id })
    .populate("country")
    .populate("city")
    .sort({ make_default_address: -1, _id: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, allAddress, "Address fetched successfully"));
});


// Get Address by ID
const getAddressById = asyncHandler(async (req, res) => {
  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const getAddress = await Address.findById(req.params.id);

  if (!getAddress) {
    return res.status(404).json(new ApiError(404, "Address not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, getAddress, "Address fetched successfully"));
});


// Delete Address by ID
// const deleteAddress = asyncHandler(async (req, res) => {
//   if (req.params.id == "undefined" || !req.params.id) {
//     return res.status(400).json(new ApiError(400, "id not provided"));
//   }

//   const address = await Address.findByIdAndDelete(req.params.id);

//   if (!address) {
//     return res.status(404).json(new ApiError(404, "Address not found"));
//   }

//   return res
//     .status(200)
//     .json(new ApiResponse(200, "Address deleted successfully"));
// });

const deleteAddress = asyncHandler(async (req, res) => {
  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "id not provided"));
  }

  const address = await Address.findById(req.params.id);
  if (!address) {
    return res.status(404).json(new ApiError(404, "Address not found"));
  }

  const userAddressesCount = await Address.countDocuments({ created_by: req.user._id });

  // Prevent deleting if it's the only address
  if (userAddressesCount === 1) {
    return res.status(400).json(new ApiError(400, "Cannot delete the only remaining address"));
  }

  // Delete the address
  await Address.findByIdAndDelete(req.params.id);

  // If it was default, promote another one as default
  if (address.make_default_address) {
    const latestAddress = await Address.findOne({ created_by: req.user._id })
      .sort({ createdAt: -1 });

    if (latestAddress) {
      latestAddress.make_default_address = true;
      await latestAddress.save();
    }
  }

  return res.status(200).json(new ApiResponse(200, "Address deleted successfully"));
});


// Create SubService Rating and Review
const createSubServiceRatingReview = asyncHandler(async (req, res) => {
  const { subService, rating, review, sessionId, trainer } = req.body;

  if (!subService || !rating) {
    return res.status(400).json(new ApiError(400, "SubService ID and rating are required"));
  }

  // Check for existing review by user for this sub-service
  const existingReview = await SubServiceRatingReview.findOne({
    subService,
    created_by: req.user._id,
  });

  if (existingReview) {
    return res.status(400).json(new ApiError(400, "You have already reviewed this sub-service"));
  }

  const reviewData = {
    subService,
    rating,
    review: review || "",
    sessionId: sessionId || null,
    trainer: trainer || null,
    created_by: req.user._id,
  };

  const createdReview = await SubServiceRatingReview.create(reviewData);

  return res
    .status(201)
    .json(new ApiResponse(201, createdReview, "Sub-service review added successfully"));
});


// Update SubService Rating and Review
const updateSubServiceRatingReview = asyncHandler(async (req, res) => {
  const { subServiceId } = req.params;
  const { review, rating } = req.body;

    if (!review && (rating === undefined || rating === null)) {
    return res
      .status(400)
      .json(new ApiError(400, "At least review text or rating is required"));
  }

  // Validate rating if provided
  if (rating !== undefined && (rating < 1 || rating > 5)) {
    return res
      .status(400)
      .json(new ApiError(400, "Rating must be between 1 and 5"));
  }

  const existingReview = await SubServiceRatingReview.findOne({
    subService: subServiceId,
    created_by: req.user._id,
  });

  if (!existingReview) {
    return res.status(404).json(new ApiError(404, "Review not found for this sub-service by the user"));
  }

  existingReview.review = review;
  existingReview.rating = rating;
  existingReview.updated_by = req.user._id;

  await existingReview.save();

  return res.status(200).json(
    new ApiResponse(200, existingReview, "Sub-service review updated successfully")
  );
});

// const getAllSubServiceRatingReviews = asyncHandler(async (req, res) => {
//   const { subServiceId } = req.params;

//   if (!subServiceId) {
//     return res.status(400).json(new ApiError(400, "SubService ID is required"));
//   }

//   const reviews = await SubServiceRatingReview.find({ subService: subServiceId })
//     .populate("created_by", "first_name email")
//     .exec();

//   const totalReviews = reviews.length;
//   const averageRating =
//     totalReviews > 0
//       ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2)
//       : "0.00";

//   const ratingDistribution = [1, 2, 3, 4, 5].map((star) => {
//     const count = reviews.filter((r) => r.rating === star).length;
//     const percentage = totalReviews > 0 ? ((count / totalReviews) * 100).toFixed(2) : "0.00";
//     return { rating: star, count, percentage };
//   });

//   return res.status(200).json(
//     new ApiResponse(200, {
//       reviews,
//       totalReviews,
//       averageRating,
//       ratingDistribution,
//     }, "Sub-service reviews fetched successfully")
//   );
// });

/**----------- */

// Get all SubService Rating and Reviews
const getAllSubServiceRatingReviews = asyncHandler(async (req, res) => {
  const { subServiceId } = req.params;

  if (!subServiceId) {
    return res.status(400).json(new ApiError(400, "SubService ID is required"));
  }

  const reviews = await SubServiceRatingReview.find({ subService: subServiceId })
    .populate("created_by", "first_name email")
    .populate("trainer", "first_name email")
    .exec();

  if (!reviews.length) {
    return res.status(200).json(
      new ApiResponse(200, {
        reviews: [],
        averageRating: "0.00",
        totalReviews: 0,
      }, "No reviews found for this sub-service")
    );
  }

  const totalReviews = reviews.length;
  const averageRating = (
    reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
  ).toFixed(2);

  return res.status(200).json(
    new ApiResponse(200, { reviews, averageRating, totalReviews }, "Reviews fetched successfully")
  );
});
const getAllSubServicesRatingReviews = asyncHandler(async (req, res) => {
 
  const reviews = await SubServiceRatingReview.find()
    .populate("created_by", "first_name email")
    .populate("trainer", "first_name email")
    .exec();

  if (!reviews.length) {
    return res.status(200).json(
      new ApiResponse(200, {
        reviews: [],
        averageRating: "0.00",
        totalReviews: 0,
      }, "No reviews found for this sub-service")
    );
  }

  const totalReviews = reviews.length;
  const averageRating = (
    reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
  ).toFixed(2);

  return res.status(200).json(
    new ApiResponse(200, { reviews, averageRating, totalReviews }, "Reviews fetched successfully")
  );
});


// Get SubService Rating and Review by User
const getSubServiceRatingReviewByUser = asyncHandler(async (req, res) => {
  const { subServiceId } = req.params;

  if (!subServiceId) {
    return res.status(400).json(new ApiError(400, "SubService ID is required"));
  }

  const review = await SubServiceRatingReview.findOne({
    subService: subServiceId,
    created_by: req.user._id,
  })
  .populate("subService", "name image")
  .exec();

  if (!review) {
    return res.status(404).json(new ApiError(404, "No review found for this sub-service by the user"));
  }

  return res.status(200).json(new ApiResponse(200, review, "User's sub-service review fetched successfully"));
});


// Create Trainer Rating and Review
const createTrainerRatingReview = asyncHandler(async (req, res) => {
  const {trainer, rating, review, sessionId } = req.body;

  console.log("reqbody----------------->", req.body);
  
  if (!trainer  || !rating) {
    return res.status(400).json(new ApiError(400, "Trainer ID, SubService ID, and rating are required"));
  }

  const existingReview = await TrainerRatingReview.findOne({
    // trainer,
    // created_by: req.user._id,
    sessionId
  });
// console.log("existingReview----------------------->",existingReview);

  if (existingReview) {
    return res.status(400).json(new ApiError(400, "You have already reviewed this trainer for this order"));
  }

  const reviewData = {
    trainer,
    rating,
    review: review || "",
    sessionId: sessionId || null,
    created_by: req.user._id,
  };

  const createdReview = await TrainerRatingReview.create(reviewData);
  console.log("createdReview----------------------------------->",createdReview);
  
  return res
    .status(201)
    .json(new ApiResponse(201, createdReview, "Trainer review added successfully"));
});


// Update Trainer Rating and Review
const updateTrainerRatingReview = asyncHandler(async (req, res) => {
  const { trainerId } = req.params;
  const { sessionId, rating, review } = req.body;

  if (!review) {
    return res.status(400).json(new ApiError(400, "Review text is required"));
  }

  const existingReview = await TrainerRatingReview.findOne({
    trainer: trainerId,
    // subService,
    sessionId,
    created_by: req.user._id,
  });

  if (!existingReview) {
    return res.status(404).json(new ApiError(404, "Review not found for this trainer and sub-service by the user"));
  }

  existingReview.rating = rating || existingReview.rating;
  existingReview.review = review;
  existingReview.sessionId = sessionId;
  existingReview.updated_by = req.user._id;

  await existingReview.save();

  return res.status(200).json(
    new ApiResponse(200, existingReview, "Trainer review updated successfully")
  );
});


// Get all Trainer Reviews
const getAllTrainerReviews = asyncHandler(async (req, res) => {

  const reviews = await TrainerRatingReview.find({})
    .populate("trainer", "first_name profile_image") 
    .populate("subService", "name") 
    .populate("created_by", "name") 
    .populate("updated_by", "name") 
    .sort({ createdAt: -1 }); 

  if (!reviews || reviews.length === 0) {
    return res.status(404).json(new ApiError(404, "No reviews found"));
  }

  return res.status(200).json(new ApiResponse(200, reviews, "All trainer reviews fetched successfully"));
});


// Get Trainer Rating and Review by User
// const getTrainerRatingReviewByUser = asyncHandler(async (req, res) => {
//   const { trainerId } = req.params;

//   if (!trainerId) {
//     return res.status(400).json(new ApiError(400, "Trainer ID is required"));
//   }

//   const review = await TrainerRatingReview.findOne({
//     trainer: trainerId,
//     created_by: req.user._id,
//   })
//     .populate("trainer", "first_name profile_image")
//     .exec();

//     console.log("review---------------->",review);
    
//   if (!review) {
//     return res.status(200).json( new ApiResponse(200, {}, "No review found for this trainer by the user"));
//   }

//   return res.status(200).json(new ApiResponse(200, review, "User's trainer review fetched successfully"));
// });

/**---------- */

const getTrainerRatingReviewByUser = asyncHandler(async (req, res) => {
  const { trainerId } = req.params;

  if (!trainerId) {
    return res.status(400).json(new ApiError(400, "Trainer ID is required"));
  }

  // aggregate pipeline to fetch reviews for trainer where sessionId exists in Order collection
  const reviews = await TrainerRatingReview.aggregate([
    {
      $match: {
        trainer: new mongoose.Types.ObjectId(trainerId)
      }
    },
    {
      $lookup: {
        from: "orders",
        localField: "sessionId",
        foreignField: "_id",
        as: "order"
      }
    },
    {
      $match: {
        "order.0": { $exists: true } // only keep reviews where order array has at least 1 element
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "trainer",
        foreignField: "_id",
        as: "trainerDetails"
      }
    },
    {
      $unwind: "$trainerDetails"
    },
    {
      $project: {
        _id: 1,
        rating: 1,
        review: 1,
        createdAt: 1,
        "trainerDetails.first_name": 1,
        "trainerDetails.profile_image": 1,
        sessionId: 1
      }
    }
  ]);

  if (!reviews.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No valid reviews found for this trainer."));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, reviews, "Trainer reviews with valid orders fetched successfully."));
});

const calculateCartTotal = asyncHandler(async (req, res) => {
  const { promoCode } = req.body;

  // Fetch cart items
  const cartItems = await Cart.find({ created_by: req.user._id })
    .populate("subServiceId")
    .populate("timeslot") 
    .populate("petTypeId", "name")
    .sort({ _id: -1 });

    // console.log("cartItems with timeslot-------------------------------->",cartItems);
    
  if (!cartItems.length) {
    return res.status(404).json(new ApiResponse(404, {}, "No cart items found"));
  }

const extraChargeData = await ExtraCharge.findOne({is_default : true});
if (!extraChargeData) {
  return res.status(404).json(new ApiResponse(404, {}, "Extra charge rate not configured"));
}
const extraPricePerHour = parseFloat(extraChargeData.extraprice);
// console.log("extraPricePerHour------>",extraPricePerHour);

  let subtotal = 0;
  let extraCharges = 0;

  // Loop over cart items to calculate subtotal and extra charges
  // cartItems.forEach((item) => {
  //   const groomingDetail = item.subServiceId?.groomingDetails.find(
  //     (detail) => detail._id.toString() === item.petWeight.toString()
  //   );

  //   if (groomingDetail) {
  //     subtotal += parseFloat(groomingDetail.price);
  //   }

  //   if (item.timeslot) {
  //     const startTime = new Date(item.timeslot.startTime);
  //     const endTime = new Date(item.timeslot.endTime);

  //     const overtimeStart = new Date(startTime);
  //     overtimeStart.setHours(18, 0, 0, 0); // set to 6 PM of booking date

  //     if (endTime > overtimeStart) {
  //       const overtimeMs = endTime - overtimeStart;
  //       const overtimeHours = overtimeMs / (1000 * 60 * 60); // in hours (can be fractional)
  //       // extraCharges += overtimeHours * 5; // ₹5 per hour
  //       extraCharges += overtimeHours * extraPricePerHour; // ₹5 per hour
  //     }
  //   }
  // });

  cartItems.forEach((item) => {
  const groomingDetail = item.subServiceId?.groomingDetails.find(
    (detail) => detail._id.toString() === item.petWeight.toString()
  );

  if (groomingDetail) {
    const petCount = item.petTypeId.length; 
    // console.log("petCount---------------->",petCount);
    
    subtotal += parseFloat(groomingDetail.price) * petCount;
  }

  if (item.timeslot) {
    const startTime = new Date(item.timeslot.startTime);
    const endTime = new Date(item.timeslot.endTime);

    const overtimeStart = new Date(startTime);
    overtimeStart.setHours(18, 0, 0, 0); // 6 PM

    if (endTime > overtimeStart) {
      const overtimeMs = endTime - overtimeStart;
      const overtimeHours = overtimeMs / (1000 * 60 * 60);
      extraCharges += overtimeHours * extraPricePerHour;
    }
  }
});

  // Tax application
  const taxData = await TaxMaster.findOne();
  let taxAmount = 0;

  if (taxData) {
    const taxRate = parseFloat(taxData.rate.toString());
    taxAmount = ((subtotal + extraCharges) * taxRate) / 100;
  }

  let totalPrice = subtotal + extraCharges + taxAmount;

  // PromoCode application (if provided)
  let discountAmount = 0;
  let promoCodeId = null;

  if (promoCode) {
    const promoData = await PromoCode.findOne({ code: promoCode, isActive: true });

    if (promoData) {
      const now = new Date();

      if (
        promoData.is_validation_date &&
        (
          (promoData.startDate && now < promoData.startDate) ||
          (promoData.endDate && now > promoData.endDate)
        )
      ) {
        return res.status(400).json(
          new ApiResponse(400, {}, "Promo code is expired or not yet active")
        );
      }

      if (promoData.usedBy.some(id => id.toString() === req.user._id.toString())) {
        return res.status(400).json(
          new ApiResponse(400, {}, "You have already used this promo code")
        );
      }

      const currentUses = parseFloat(promoData.maxUses);
      if (currentUses <= 0) {
        return res.status(400).json(
          new ApiResponse(400, {}, "Promo code usage limit reached")
        );
      }

      const minOrderAmount = parseFloat(promoData.minOrderAmount);
      if (totalPrice < minOrderAmount) {
        return res.status(400).json(
          new ApiResponse(400, {}, `Promo code requires a minimum order amount of ₹${minOrderAmount}`)
        );
      }

      // Discount calculation
      if (promoData.discountType === "Percentage") {
        discountAmount = (totalPrice * parseFloat(promoData.discountValue)) / 100;

        const maxDiscount = parseFloat(promoData.maxDiscountAmount);
        if (maxDiscount > 0 && discountAmount > maxDiscount) {
          discountAmount = maxDiscount;
        }

      } else if (promoData.discountType === "Fixed_Amount") {
        discountAmount = parseFloat(promoData.discountValue);
        if (discountAmount > totalPrice) {
          discountAmount = totalPrice;
        }
      }

      totalPrice -= discountAmount;
      promoCodeId = promoData._id;

    } else {
      return res.status(404).json(
        new ApiResponse(404, {}, "Invalid or inactive promo code")
      );
    }
  }

  // Final Response
  return res.status(200).json(
    new ApiResponse(200, {
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      extraCharges: extraCharges.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      totalPrice: totalPrice.toFixed(2),
      taxApplied: !!taxData,
      promoApplied: !!promoCode,
      promoCodeId: promoCodeId
    }, "Cart total calculated successfully")
  );
});

const getAdminDetails = asyncHandler(async (req, res) => {
  console.log("req.body", req.body);

  let { sortOrder = -1 } = req.body;

  const adminRole = await UserRole.findOne({ name: "admin", role_id: 1 });

  if (!adminRole) {
    return res.status(404).json(
      new ApiResponse(404, [], "Admin role not found.")
    );
  }

  const adminUsers = await User.find({ user_role: adminRole._id })
    .sort({ createdAt: sortOrder })
    .select("-_id email first_name last_name phone_number");

  if (!adminUsers.length) {
    return res.status(404).json(
      new ApiResponse(404, [], "No admin users found.")
    );
  }

  res.status(200).json(
    new ApiResponse(200, adminUsers, "details fetched successfully.")
  );
});

const getAllNotification = asyncHandler(async (req, res) => {
  const userId = req.user._id;
// console.log("userid----------->",userId);

  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })  
    .limit(5);                
// console.log("notifications------------->",notifications);

  if (!notifications || notifications.length === 0) {
    return res.status(204).json(new ApiError(204, "No notifications found"));
  }

  res.status(200).json({
    success: true,
    data: notifications,
  });
});

const updateNotification = asyncHandler(async (req, res) => {
  if (req.params.id === "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "Notification ID not provided"));
  }

  if (Object.keys(req.body).length === 0 || !req.body.hasOwnProperty('isRead')) {
    return res
      .status(400)
      .json(new ApiError(400, "No valid data provided to update"));
  }

  const { isRead } = req.body;

  const updatedNotification = await Notification.findByIdAndUpdate(
    req.params.id,
    {
      isRead,
      updated_by: req.user?._id,
    },
    { new: true }
  );

  if (!updatedNotification) {
    return res.status(404).json(new ApiError(404, "Notification not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedNotification, "Notification updated successfully"));
});
const updateAllNotification = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    return res.status(400).json(new ApiError(400, "User ID not found in request"));
  }

  const result = await Notification.updateMany(
    { userId, isRead: false }, // only unread notifications for the user
    {
      $set: {
        isRead: true,
        updated_by: userId,
      },
    }
  );

  if (result.modifiedCount === 0) {
    return res.status(404).json(new ApiError(404, "No unread notifications found to update"));
  }

  return res.status(200).json(
    new ApiResponse(200, result, "All unread notifications marked as read")
  );
});

const cancelOrderByCustomer = asyncHandler(async (req, res) => {
  const { orderDetailsId } = req.params;
  const userId = req.user._id;
  const { bookingStatus } = req.body;

  if (!mongoose.Types.ObjectId.isValid(orderDetailsId)) {
    throw new ApiError(400, "Invalid orderDetailsId.");
  }

  if (bookingStatus !== "CANCEL") {
    throw new ApiError(400, "Invalid booking status. Only 'CANCEL' is allowed.");
  }

  const orderDetail = await OrderDetails.findById(orderDetailsId)
    .populate("orderDetails.timeslot")
    .exec();

  if (!orderDetail) {
    throw new ApiError(404, "Order detail not found.");
  }

  if (orderDetail.created_by.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to cancel this booking.");
  }

  // Extract booking date and timeslot start time
  const { bookingDate, startTime } = orderDetail.orderDetails.timeslot;
  const slotDateTime = new Date(bookingDate);
  slotDateTime.setHours(
    new Date(startTime).getUTCHours(),
    new Date(startTime).getUTCMinutes(),
    new Date(startTime).getUTCSeconds(),
    0
  );

  const currentTime = new Date();
  const diffInMs = slotDateTime.getTime() - currentTime.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);

  if (diffInHours > 12) {
    orderDetail.bookingStatus = "CANCEL_REQUESTED_BY_CUSTOMER";
  } else {
    orderDetail.bookingStatus = "CANCELLED_BY_CUSTOMER";
  }

  await orderDetail.save();

  res.status(200).json({
    statusCode: 200,
    message: `Booking ${
      diffInHours > 12 ? "cancellation request sent" : "cancelled successfully"
    }.`,
    data: orderDetail,
  });
});

export {
  updateUserStatus,
  createUser,
  updateUser,
  getAllUser,
  getUserById,
  deleteUser,
  // getAllCustomerService,
  getAllSubserviceByService,
  getSubserviceBySubServiceId,
  createAddress,
  updateAddress,
  getAllAddress,
  getAddressById,
  deleteAddress,
  createSubServiceRatingReview,
  updateSubServiceRatingReview,
  getAllSubServiceRatingReviews,
  getSubServiceRatingReviewByUser,
  createTrainerRatingReview,
  updateTrainerRatingReview,
  getAllTrainerReviews,
  getTrainerRatingReviewByUser,
  calculateCartTotal,
  getAllSubServicesRatingReviews,
  getAdminDetails,
  getAllNotification,
  updateNotification,
  updateAllNotification
};