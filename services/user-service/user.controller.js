import { User } from "../../models/user.model.js";
import { UserRole } from "../../models/userRole.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import pagination from "../../utils/pagination.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../../utils/cloudinary.js";

// import {ServiceType} from "../../models/service.model.js"
import { SubServiceType } from "../../models/subService.model.js";
// import {Address} from "../../models/user.model.js"
import { SubscriptionRatingReview } from "../../models/ratingReview.model.js";
import { TrainerRatingReview } from "../../models/trainerRatingReview.model.js";
import { TaxMaster, ExtraCharge } from "../../models/master.model.js";
import { Cart } from "../../models/cart.model.js";
import { PromoCode } from "../../models/admin.model.js";
import mongoose from "mongoose";
import { Notification } from "../../models/notification.model.js";
import { OrderDetails } from "../../models/order.model.js";
import { TimeSlot } from "../../models/timeslot.model.js";
import { Subscription } from "../../models/subscription.model.js";
import { Session } from "../../models/service.model.js";
import { SubscriptionBooking } from "../../models/booking.model.js";

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
    emirates_id,
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
    emirates_id,
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
    $or: [{ email }, { emirates_id }],
  });

  if (existedUser) {
    return res
      .status(400)
      .json(new ApiError(400, "User with email or Emirates ID already exists"));
  }

  const userRole = await UserRole.findOne({ role_id: user_role });

  if (!userRole) {
    return res.status(400).json(new ApiError(400, "User Role Not found"));
  }

  let profile_image = null;
  if (imageLocalPath) {
    const uploadedImage = await uploadOnCloudinary(imageLocalPath);
    if (!uploadedImage?.url) {
      return res
        .status(400)
        .json(new ApiError(400, "Error while uploading image"));
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
    emirates_id,
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
  const userId = req.user?._id;

  if (!userId) {
    return res
      .status(400)
      .json(new ApiError(400, "User ID not available from auth"));
  }

  if (Object.keys(req.body).length === 0 && !req.file) {
    return res
      .status(400)
      .json(new ApiError(400, "No data provided to update"));
  }

  const {
    email,
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
    birthday,
    emirates_id,  
  } = req.body;

  const imageLocalPath = req.file?.path;

  const existingUser = await User.findById(userId);
  if (!existingUser) {
    return res.status(404).json(new ApiError(404, "User not found"));
  }

  // ✅ Check if emirates_id already exists for another user
  if (emirates_id && emirates_id !== existingUser.emirates_id) {
    const emiratesExists = await User.findOne({ emirates_id });
    if (emiratesExists) {
      return res
        .status(400)
        .json(new ApiError(400, "Emirates ID already in use by another user"));
    }
  }

  let profile_image = existingUser.profile_image;
  if (imageLocalPath) {
    try {
      const [deleteResult, uploadResult] = await Promise.all([
        existingUser.profile_image
          ? deleteFromCloudinary(existingUser.profile_image)
          : Promise.resolve(),
        uploadOnCloudinary(imageLocalPath),
      ]);

      if (!uploadResult?.url) {
        return res
          .status(400)
          .json(new ApiError(400, "Error while uploading profile image"));
      }

      profile_image = uploadResult.url;
    } catch (error) {
      return res.status(500).json(new ApiError(500, "Image handling failed"));
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      email,
      first_name,
      last_name,
      phone_number,
      gender,
      address,
      age,
      country,
      city,
      birthday,
      specialization,
      experience,
      experienceYear,
      password,
      emirates_id,   
      profile_image,
      updated_by: userId,
      updated_at: new Date(),
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "User updated successfully"));
});


const getFilteredCustomers = asyncHandler(async (req, res) => {
  const {
    country,
    city,
    subscriptionId,
    categoryId,
    isActive,
    gender,
    ageGroup,
    isSingleClass,
  } = req.query;

  // Get customer role
  const customerRole = await UserRole.findOne({ name: "customer" });
  if (!customerRole) {
    throw new ApiError(500, "Customer role not found");
  }

  const baseQuery = { user_role: customerRole._id };

  if (country) baseQuery.country = country;
  if (city) baseQuery.city = city;
  if (typeof isActive !== "undefined") baseQuery.isActive = isActive === "true";
  if (gender) baseQuery.gender = gender;

  // Handle ageGroup filter (assuming age is stored in user as 'dob' field)
  if (ageGroup) {
    const ageRanges = {
      under18: [0, 17],
      "18to25": [18, 25],
      "26to35": [26, 35],
      "36to45": [36, 45],
      "46plus": [46, 150],
    };

    const [minAge, maxAge] = ageRanges[ageGroup] || [];
    if (minAge !== undefined && maxAge !== undefined) {
      baseQuery.age = { $gte: minAge, $lte: maxAge };
    }
  }

  // Get initial users with basic filters
  let users = await User.find(baseQuery)
    .select("-otp -otp_time -password -refreshToken")
    .populate("user_role country city");

  // If no subscription/category/singleClass filter, return now
  if (!subscriptionId && !categoryId && typeof isSingleClass === "undefined") {
    return res
      .status(200)
      .json(
        new ApiResponse(200, users, "Filtered customers fetched successfully")
      );
  }

  // Further filter by Subscription/Category/SingleClass
  const customerIds = users.map((u) => u._id);
  const bookingQuery = { customer: { $in: customerIds } };
  if (subscriptionId) bookingQuery.subscription = subscriptionId;

  const bookings = await SubscriptionBooking.find(bookingQuery).populate({
    path: "subscription",
    populate: {
      path: "category",
    },
  });

  const matchedCustomerIds = bookings
    .filter((b) => {
      if (categoryId && b.subscription?.category?._id.toString() !== categoryId)
        return false;
      if (
        typeof isSingleClass !== "undefined" &&
        b.subscription?.isSingleClass !== (isSingleClass === "true")
      )
        return false;
      return true;
    })
    .map((b) => b.customer.toString());

  const filteredUsers = users.filter((u) =>
    matchedCustomerIds.includes(u._id.toString())
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        filteredUsers,
        "Filtered customers fetched successfully"
      )
    );
});

//Get alla user
const getAllUser = asyncHandler(async (req, res) => {
  const users = await User.find()
    .populate("user_role country city")
    .select("-otp -otp_time -password -refreshToken")
    .populate("user_role country city");
  const user = users.filter(
    (user) =>
      user.user_role &&
      user.user_role.name === "customer" &&
      user.user_role.role_id === 3
  );

  res
    .status(200)
    .json(new ApiResponse(200, user, "customer fetched successfully"));
});

//get User by ID
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id)
    return res.status(400).json(new ApiError(400, "User ID is required"));

  const user = await User.findById(id)
    .select("-otp -otp_time -password -refreshToken")
    .populate("user_role country city phone_number emirates_id");

  if (!user) return res.status(404).json(new ApiError(404, "User not found"));

  if (user.user_role && user.user_role.name !== "customer") {
    return res.status(403).json(new ApiError(403, "User is not a customer"));
  }

  res
    .status(200)
    .json(new ApiResponse(200, user, "customer fetched successfully"));
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
  const services = await ServiceType.find();
  return res
    .status(200)
    .json(new ApiResponse(200, services, "Services  fetched successfully"));
});

// Get all Subservices by Service ID
const getAllSubserviceByService = asyncHandler(async (req, res) => {
  const { serviceId } = req.params;

  const service = await ServiceType.findById(serviceId).lean();
  if (!service) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Service not found"));
  }

  const subServices = await SubServiceType.find({ serviceTypeId: serviceId })
    .sort({ name: 1 })
    .lean();

  const responseData = {
    ...service,
    subServices: subServices.map(({ serviceTypeId, ...rest }) => rest),
  };

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        responseData,
        "Subservices grouped under serviceType fetched successfully"
      )
    );
});

// Get SubService by ID
const getSubserviceBySubServiceId = asyncHandler(async (req, res) => {
  const { subServiceId } = req.params;

  const subService = await SubServiceType.findById(subServiceId).populate(
    "serviceTypeId"
  );

  if (!subService) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Subservice not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, subService, "Subservice fetched successfully"));
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

  const userAddressesCount = await Address.countDocuments({
    created_by: req.user._id,
  });

  // Prevent deleting if it's the only address
  if (userAddressesCount === 1) {
    return res
      .status(400)
      .json(new ApiError(400, "Cannot delete the only remaining address"));
  }

  // Delete the address
  await Address.findByIdAndDelete(req.params.id);

  // If it was default, promote another one as default
  if (address.make_default_address) {
    const latestAddress = await Address.findOne({
      created_by: req.user._id,
    }).sort({ createdAt: -1 });

    if (latestAddress) {
      latestAddress.make_default_address = true;
      await latestAddress.save();
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Address deleted successfully"));
});

const createSubscriptionRatingReview = asyncHandler(async (req, res) => {
  const { rating, review, subscriptionId } = req.body;
  const userId = req.user?._id;

  // 1. Validate input
  if (!subscriptionId || typeof rating !== "number") {
    return res
      .status(400)
      .json(
        new ApiError(400, "subscriptionId and numeric rating are required")
      );
  }

  const subId = new mongoose.Types.ObjectId(subscriptionId);
  const creatorId = new mongoose.Types.ObjectId(userId);

  // 2. Check if subscription exists
  const subscription = await Subscription.findById(subId);
  if (!subscription) {
    return res.status(404).json(new ApiError(404, "Subscription not found"));
  }

  // 3. Prevent duplicate reviews by same user
  const existingReview = await SubscriptionRatingReview.findOne({
    subscriptionId: subId,
    created_by: creatorId,
  });

  if (existingReview) {
    return res
      .status(400)
      .json(new ApiError(400, "You have already reviewed this subscription"));
  }

  // 4. Create review with is_hidden as false
  const reviewData = {
    subscriptionId: subId,
    rating,
    review: review || "",
    created_by: creatorId,
    is_hidden: false,
  };

  const createdReview = await SubscriptionRatingReview.create(reviewData);

// Convert to plain object to include all fields
const reviewObj = createdReview.toObject();

// Optional: ensure missing fields are manually added (for full guarantee)
if (!("reply" in reviewObj)) reviewObj.reply = null;
if (!("is_hidden" in reviewObj)) reviewObj.is_hidden = false;

return res.status(201).json(
  new ApiResponse(
    201,
    reviewObj,
    "Subscription review added successfully"
  )
);

});


// Update SubService Rating and Review
const updateSubscriptionRatingReview = asyncHandler(async (req, res) => {
  const { subscriptionId } = req.params;
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

  const existingReview = await SubscriptionRatingReview.findOne({
    subscriptionId,
    created_by: req.user._id,
  });

  if (!existingReview) {
    return res
      .status(404)
      .json(
        new ApiError(404, "Review not found for this sub-service by the user")
      );
  }

  if (review) existingReview.review = review;
  if (rating !== undefined) existingReview.rating = rating;
  existingReview.updated_by = req.user._id;

  await existingReview.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        existingReview,
        "Sub-service review updated successfully"
      )
    );
});


// Get all SubService Rating and Reviews
const getAllSubscriptionRatingReviewsById = asyncHandler(async (req, res) => {
  const { subscriptionId } = req.params;
  // console.log("subscriptionId:",subscriptionId);

  if (!subscriptionId) {
    return res
      .status(400)
      .json(new ApiError(400, "Subscription ID is required"));
  }

  const reviews = await SubscriptionRatingReview.find({
  subscriptionId,
  is_hidden: false,
})
  .populate("created_by", "first_name email")
  .exec();


  if (!reviews.length) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          reviews: [],
          averageRating: "0.00",
          totalReviews: 0,
        },
        "No reviews found for this subscription"
      )
    );
  }

  const totalReviews = reviews.length;
  const averageRating = (
    reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
  ).toFixed(2);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { reviews, averageRating, totalReviews },
        "Reviews fetched successfully"
      )
    );
});

const getAllSubscriptionsRatingReviews = asyncHandler(async (req, res) => {
  try {
    const reviews = await SubscriptionRatingReview.find({
      // is_hidden: false, 
    })
      .select("rating review reply is_hidden createdAt created_by subscriptionId")
      .populate("created_by", "first_name email") // Get reviewer info
      .populate("subscriptionId", "name description") // Populate subscription info
      .exec();

    // No reviews found
    if (!reviews.length) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            reviews: [],
            averageRating: "0.00",
            totalReviews: 0,
          },
          "No reviews found."
        )
      );
    }

    // Calculate total and average
    const totalReviews = reviews.length;
    const averageRating = (
      reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    ).toFixed(2);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          reviews,
          averageRating,
          totalReviews,
        },
        "All subscription reviews fetched successfully."
      )
    );
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return res.status(500).json(
      new ApiResponse(500, {}, "Failed to fetch reviews.")
    );
  }
});



// Get SubService Rating and Review by User
const getSubscriptionRatingReviewByUser = asyncHandler(async (req, res) => {
  const { subscriptionId } = req.params;

  if (!subscriptionId) {
    return res
      .status(400)
      .json(new ApiError(400, "subscription ID is required"));
  }

  const review = await SubscriptionRatingReview.findOne({
    subscriptionId: subscriptionId, // 👈 This is correct
    created_by: req.user._id,
  })
    .populate("subscriptionId", "name image") // also fix the populate field if needed
    .exec();

  if (!review) {
    return res
      .status(404)
      .json(
        new ApiError(
          404,
          "No review found for this subscription id by the user"
        )
      );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        review,
        "User's subscription id review fetched successfully"
      )
    );
});

const replyToSubscriptionReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { reply } = req.body;

  if (!reply) {
    return res.status(400).json(new ApiError(400, "Reply content is required"));
  }

  const review = await SubscriptionRatingReview.findById(reviewId);
  if (!review) {
    return res.status(404).json(new ApiError(404, "Review not found"));
  }

  review.reply = reply;
  review.updated_by = req.user._id;
  await review.save();

  return res
    .status(200)
    .json(new ApiResponse(200, review, "Reply added to review successfully"));
});

const toggleSubscriptionReviewVisibility = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  const review = await SubscriptionRatingReview.findById(reviewId);
  if (!review) {
    return res.status(404).json(new ApiError(404, "Review not found"));
  }

  review.is_hidden = !review.is_hidden; // Toggle visibility
  review.updated_by = req.user._id;
  await review.save();

  const message = review.is_hidden
    ? "Review hidden successfully"
    : "Review made visible successfully";

  return res.status(200).json(new ApiResponse(200, review.toObject(), message));
});


// Create Trainer Rating and Review
const createTrainerRatingReview = asyncHandler(async (req, res) => {
  const { trainer, rating, review } = req.body;

  console.log("reqbody----------------->", req.body);

  if (!trainer || !rating) {
    return res
      .status(400)
      .json(new ApiError(400, "Trainer ID and rating are required"));
  }

  const existingReview = await TrainerRatingReview.findOne({
    trainer,
    created_by: req.user._id,
  });
  // console.log("existingReview----------------------->",existingReview);

  if (existingReview) {
    return res
      .status(400)
      .json(new ApiError(400, "You have already reviewed this trainer"));
  }

  const reviewData = {
    trainer,
    rating,
    review: review || "",
    // sessionId: sessionId || null,
    created_by: req.user._id,
  };

  const createdReview = await TrainerRatingReview.create(reviewData);
  console.log(
    "createdReview----------------------------------->",
    createdReview
  );

  return res
    .status(201)
    .json(
      new ApiResponse(201, createdReview, "Trainer review added successfully")
    );
});

// Update Trainer Rating and Review
const updateTrainerRatingReview = asyncHandler(async (req, res) => {
  const { trainerId } = req.params;
  const { rating, review } = req.body;

  if (!review) {
    return res.status(400).json(new ApiError(400, "Review text is required"));
  }

  const existingReview = await TrainerRatingReview.findOne({
    trainer: trainerId,
    // subService,
    // sessionId,
    created_by: req.user._id,
  });

  if (!existingReview) {
    return res
      .status(404)
      .json(
        new ApiError(
          404,
          "Review not found for this trainer and sub-service by the user"
        )
      );
  }

  existingReview.rating = rating || existingReview.rating;
  existingReview.review = review;
  // existingReview.sessionId = sessionId;
  existingReview.updated_by = req.user._id;

  await existingReview.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        existingReview,
        "Trainer review updated successfully"
      )
    );
});

// Get all Trainer Reviews
const getAllTrainerReviews = asyncHandler(async (req, res) => {
  const reviews = await TrainerRatingReview.find({})
    .populate("trainer", "first_name profile_image")
    // .populate("session", "name")
    .populate("created_by", "first_name last_name")
    .populate("updated_by", "first_name last_name")

    .sort({ createdAt: -1 });

  if (!reviews || reviews.length === 0) {
    return res.status(404).json(new ApiError(404, "No reviews found"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, reviews, "All trainer reviews fetched successfully")
    );
});

// Admin: Hide or Unhide Trainer Review
const toggleTrainerReviewVisibility = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { hide } = req.body; // hide: true or false

  const review = await TrainerRatingReview.findById(reviewId);

  if (!review) {
    return res.status(404).json(new ApiError(404, "Review not found"));
  }

  review.is_hidden = hide;
  review.updated_by = req.user._id;
  await review.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        review,
        `Trainer review has been ${hide ? "hidden" : "unhidden"} successfully`
      )
    );
});

// Admin: Reply to Trainer Review
const replyToTrainerReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { reply } = req.body;

  if (!reply) {
    return res.status(400).json(new ApiError(400, "Reply text is required"));
  }

  const review = await TrainerRatingReview.findById(reviewId);

  if (!review) {
    return res.status(404).json(new ApiError(404, "Review not found"));
  }

  review.admin_reply = reply;
  review.admin_reply_date = new Date();
  review.updated_by = req.user._id;

  await review.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        review,
        "Admin reply added to trainer review successfully"
      )
    );
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
  const loggedInUser = req.user;

  if (!trainerId) {
    return res.status(400).json(new ApiError(400, "Trainer ID is required"));
  }

  // Match condition: all reviews by default, or only customer-specific
  const matchCondition = {
    trainer: new mongoose.Types.ObjectId(trainerId),
  };

  // If not admin, restrict to customer's own review
  if (loggedInUser?.user_role?.name !== "admin") {
    matchCondition.created_by = new mongoose.Types.ObjectId(loggedInUser._id);
  }

  const reviews = await TrainerRatingReview.aggregate([
    {
      $match: matchCondition,
    },
    {
      $lookup: {
        from: "users",
        localField: "created_by",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $project: {
        _id: 1,
        rating: 1,
        review: 1,
        createdAt: 1,
        "user.first_name": 1,
        "user.last_name": 1,
        "user.profile_image": 1,
      },
    },
  ]);

  if (!reviews.length) {
    const msg =
      loggedInUser?.user_role?.name === "admin"
        ? "No reviews found for this trainer."
        : "You have not reviewed this trainer yet.";

    return res.status(200).json(new ApiResponse(200, [], msg));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        reviews,
        loggedInUser?.user_role?.name === "admin"
          ? "All reviews for the trainer fetched successfully."
          : "Your review for the trainer fetched successfully."
      )
    );
});

// Get Reviews for Logged-in Trainer
const getMyTrainerReviews = asyncHandler(async (req, res) => {
  const trainerId = req.user._id;

  const reviews = await TrainerRatingReview.find({ trainer: trainerId })
    .populate("created_by", "first_name last_name profile_image")
    .sort({ createdAt: -1 });

  if (!reviews.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "You have not received any reviews yet."));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        reviews,
        "Your trainer reviews fetched successfully."
      )
    );
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
    return res
      .status(404)
      .json(new ApiResponse(404, {}, "No cart items found"));
  }

  const extraChargeData = await ExtraCharge.findOne({ is_default: true });
  if (!extraChargeData) {
    return res
      .status(404)
      .json(new ApiResponse(404, {}, "Extra charge rate not configured"));
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
    const promoData = await PromoCode.findOne({
      code: promoCode,
      isActive: true,
    });

    if (promoData) {
      const now = new Date();

      if (
        promoData.is_validation_date &&
        ((promoData.startDate && now < promoData.startDate) ||
          (promoData.endDate && now > promoData.endDate))
      ) {
        return res
          .status(400)
          .json(
            new ApiResponse(400, {}, "Promo code is expired or not yet active")
          );
      }

      if (
        promoData.usedBy.some((id) => id.toString() === req.user._id.toString())
      ) {
        return res
          .status(400)
          .json(
            new ApiResponse(400, {}, "You have already used this promo code")
          );
      }

      const currentUses = parseFloat(promoData.maxUses);
      if (currentUses <= 0) {
        return res
          .status(400)
          .json(new ApiResponse(400, {}, "Promo code usage limit reached"));
      }

      const minOrderAmount = parseFloat(promoData.minOrderAmount);
      if (totalPrice < minOrderAmount) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              400,
              {},
              `Promo code requires a minimum order amount of ₹${minOrderAmount}`
            )
          );
      }

      // Discount calculation
      if (promoData.discountType === "Percentage") {
        discountAmount =
          (totalPrice * parseFloat(promoData.discountValue)) / 100;

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
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Invalid or inactive promo code"));
    }
  }

  // Final Response
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        extraCharges: extraCharges.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        totalPrice: totalPrice.toFixed(2),
        taxApplied: !!taxData,
        promoApplied: !!promoCode,
        promoCodeId: promoCodeId,
      },
      "Cart total calculated successfully"
    )
  );
});

const getAdminDetails = asyncHandler(async (req, res) => {
  console.log("req.body", req.body);

  let { sortOrder = -1 } = req.body;

  const adminRole = await UserRole.findOne({ name: "admin", role_id: 1 });

  if (!adminRole) {
    return res
      .status(404)
      .json(new ApiResponse(404, [], "Admin role not found."));
  }

  const adminUsers = await User.find({ user_role: adminRole._id })
    .sort({ createdAt: sortOrder })
    .select("-_id email first_name last_name phone_number");

  if (!adminUsers.length) {
    return res
      .status(404)
      .json(new ApiResponse(404, [], "No admin users found."));
  }

  res
    .status(200)
    .json(new ApiResponse(200, adminUsers, "details fetched successfully."));
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
    return res
      .status(400)
      .json(new ApiError(400, "Notification ID not provided"));
  }

  if (
    Object.keys(req.body).length === 0 ||
    !req.body.hasOwnProperty("isRead")
  ) {
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
    .json(
      new ApiResponse(
        200,
        updatedNotification,
        "Notification updated successfully"
      )
    );
});
const updateAllNotification = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    return res
      .status(400)
      .json(new ApiError(400, "User ID not found in request"));
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
    return res
      .status(404)
      .json(new ApiError(404, "No unread notifications found to update"));
  }

  return res
    .status(200)
    .json(
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
    throw new ApiError(
      400,
      "Invalid booking status. Only 'CANCEL' is allowed."
    );
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

const sendClassRemindersService = async () => {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const upcomingBookings = await SubscriptionBooking.find({ status: "active" })
    .populate({
      path: "subscription",
      match: {
        startTime: {
          $gte: now.toISOString(),
          $lte: oneHourLater.toISOString(),
        },
      },
      populate: [
        { path: "trainer", select: "first_name email" },
        { path: "categoryId", select: "name" },
        { path: "sessionType", select: "name" },
      ],
    })
    .populate("customer", "_id first_name email");

  const notifications = [];

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  for (const booking of upcomingBookings) {
    const sub = booking.subscription;
    const customer = booking.customer;

    if (!sub || !sub.startTime || !customer || !customer._id) continue;

    const timeFormatted = formatTime(sub.startTime);

    // Customer notification
    const customerTitle = "Class Reminder ⏰";
    const customerMessage = `Your class "${sub.name}" starts at ${timeFormatted}. Please be ready.`;

    notifications.push({
      userId: customer._id,
      title: customerTitle,
      message: customerMessage,
      type: "class-reminder",
      isRead: false,
    });

    io.to(customer._id.toString()).emit("notification:new", {
      title: customerTitle,
      message: customerMessage,
    });

    // Trainer notification
    if (sub.trainer && sub.trainer._id) {
      const trainerTitle = "Trainer Class Reminder ⏰";
      const trainerMessage = `Class "${sub.name}" is starting at ${timeFormatted}.`;

      notifications.push({
        userId: sub.trainer._id,
        title: trainerTitle,
        message: trainerMessage,
        type: "class-reminder",
        isRead: false,
      });

      io.to(sub.trainer._id.toString()).emit("reminder:trainer", {
        title: trainerTitle,
        message: trainerMessage,
      });
    }

    // Optional logging
    console.log(`🔔 Reminder sent for booking: ${sub.name}`);
  }

  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
    console.log(`✅ ${notifications.length} notifications inserted.`);
  }

  return notifications.length;
};

const sendUpcomingClassReminders = asyncHandler(async (req, res) => {
  const count = await sendClassRemindersService();
  return res
    .status(200)
    .json(new ApiResponse(200, { count }, "Upcoming class reminders sent"));
});

export {
  sendClassRemindersService,
  sendUpcomingClassReminders,
  getFilteredCustomers,
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
  createSubscriptionRatingReview,
  updateSubscriptionRatingReview,
  getAllSubscriptionRatingReviewsById,
  getSubscriptionRatingReviewByUser,
  createTrainerRatingReview,
  updateTrainerRatingReview,
  getAllTrainerReviews,
  getTrainerRatingReviewByUser,
  calculateCartTotal,
  getAllSubscriptionsRatingReviews,
  getAdminDetails,
  getAllNotification,
  updateNotification,
  updateAllNotification,
  getMyTrainerReviews,
  toggleTrainerReviewVisibility,
  replyToTrainerReview,
  replyToSubscriptionReview,
  toggleSubscriptionReviewVisibility,
};
