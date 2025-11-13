import mongoose from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import nodemailer from "nodemailer";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../../utils/cloudinary.js";
import { User } from "../../models/user.model.js";
import { UserRole } from "../../models/userRole.model.js";
import {PromoCode} from "../../models/admin.model.js"
import { randomBytes } from "crypto";
import {Order} from "../../models/order.model.js"
import {OrderDetails} from "../../models/order.model.js"
import {TimeSlot} from "../../models/timeslot.model.js"
import {Artical} from "../../models/artical.model.js"
import {Booking, SubscriptionBooking} from "../../models/booking.model.js"
import { Subscription } from "../../models/subscription.model.js";
import { Package } from "../../models/package.model.js";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});



// Create Promo Code
const createPromoCode = asyncHandler(async (req, res) => {
  const {
    code,
    discountType,
    discountValue,
    description,
    isActive,
    is_validation_date,
    startDate,
    endDate,
    apply_offer_after_orders,
    minOrderAmount,
    maxDiscountAmount,
    maxUses,
    termsAndConditions,
  } = req.body;

  const requiredFields = { code, discountType, discountValue, maxUses, termsAndConditions };
  const missingFields = Object.keys(requiredFields).filter(
    (field) =>
      requiredFields[field] === undefined ||
      requiredFields[field] === null ||
      requiredFields[field] === ""
  );

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json(new ApiError(400, `Missing required field(s): ${missingFields.join(", ")}`));
  }

  // Handle optional image upload
  let imageUrl = null;
  const fileToProcess = req.file || (req.files?.image?.[0]);

  if (fileToProcess) {
    const uploadedImage = await uploadOnCloudinary(fileToProcess.path);
    if (!uploadedImage?.url) {
      return res.status(400).json(new ApiError(400, "Error uploading image"));
    }
    imageUrl = uploadedImage.url;
  }

  const createdPromoCode = await PromoCode.create({
    code,
    discountType,
    discountValue,
    description,
    isActive,
    is_validation_date,
    startDate,
    endDate,
    apply_offer_after_orders,
    minOrderAmount,
    maxDiscountAmount,
    maxUses,
    termsAndConditions,
    image: imageUrl,
    created_by: req.user?._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, createdPromoCode, "Promo Code created successfully"));
});




// Update Promo Code
const updatePromoCode = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id || id === "undefined") {
    return res.status(400).json(new ApiError(400, "ID not provided"));
  }

  if (Object.keys(req.body).length === 0 && !req.file && !req.files?.image) {
    return res.status(400).json(new ApiError(400, "No data provided to update"));
  }

  const {
    code,
    discountType,
    discountValue,
    description,
    isActive,
    is_validation_date,
    startDate,
    endDate,
    apply_offer_after_orders,
    minOrderAmount,
    maxDiscountAmount,
    maxUses,
    termsAndConditions,
  } = req.body;

  const existingPromoCode = await PromoCode.findById(id);
  if (!existingPromoCode) {
    return res.status(404).json(new ApiError(404, "Promo code not found"));
  }

  // Handle image upload/update
  let imageUrl = existingPromoCode.image;
  const fileToProcess = req.file || (req.files?.image?.[0]);

  if (fileToProcess) {
    if (existingPromoCode.image) {
      await deleteFromCloudinary(existingPromoCode.image);
    }
    const uploadedImage = await uploadOnCloudinary(fileToProcess.path);
    if (!uploadedImage?.url) {
      return res.status(400).json(new ApiError(400, "Error uploading image"));
    }
    imageUrl = uploadedImage.url;
  }

  const updateData = {
    code,
    discountType,
    discountValue,
    description,
    isActive,
    is_validation_date,
    startDate,
    endDate,
    apply_offer_after_orders,
    minOrderAmount,
    maxDiscountAmount,
    maxUses,
    termsAndConditions,
    image: imageUrl,
    updated_by: req.user._id,
  };

  // Remove undefined fields
  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key]
  );

  const updatedPromoCode = await PromoCode.findByIdAndUpdate(id, updateData, { new: true });

  return res
    .status(200)
    .json(new ApiResponse(200, updatedPromoCode, "Promo code updated successfully"));
});




// Get All Promo Codes
const getAllPromoCodes = asyncHandler(async (req, res) => {
  const promoCodes = await PromoCode.find().sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, promoCodes, "Promo codes fetched successfully"));
});


// Get Promo Code by ID
const getPromoCodeById = asyncHandler(async (req, res) => {
  if (!req.params.id || req.params.id === "undefined") {
    return res.status(400).json(new ApiError(400, "ID not provided"));
  }

  const promoCode = await PromoCode.findById(req.params.id);

  if (!promoCode) {
    return res.status(404).json(new ApiError(404, "Promo code not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, promoCode, "Promo code fetched successfully"));
});


// Get Promo Code by ID
const deletePromoCode = asyncHandler(async (req, res) => {
  if (!req.params.id || req.params.id === "undefined") {
    return res.status(400).json(new ApiError(400, "ID not provided"));
  }

  const promoCode = await PromoCode.findById(req.params.id);

  if (!promoCode) {
    return res.status(404).json(new ApiError(404, "Promo code not found"));
  }

  await promoCode.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Promo code deleted successfully"));
});


// Get All Orders
const getAllOrder = asyncHandler(async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 })
  .populate({
    path: "defaultAddress",
    populate: [
      {
        path: "city", 
        model: "City", 
      },
      {
        path: "country", 
        model: "Country", 
      },
    ],
  })
  .populate("created_by", "first_name last_name")
  if (!orders || orders.length === 0) {
    return res.status(404).json(new ApiResponse(404, null, "No orders found"));
  }
  return res
    .status(200)
    .json(new ApiResponse(200, orders, "orders  fetched successfully"));
});




const getDashboardData = asyncHandler(async (req, res) => {
  // Get user_role ObjectIds
  const [customerRole, trainerRole] = await Promise.all([
    UserRole.findOne({ name: "customer" }),
    UserRole.findOne({ name: "trainer" }),
  ]);

  if (!customerRole || !trainerRole) {
    throw new ApiError(500, "Required user roles not found");
  }

  // Set date range for this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date();
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  endOfMonth.setDate(0);
  endOfMonth.setHours(23, 59, 59, 999);

  // Aggregated revenue from subscription bookings
  const revenueResult = await SubscriptionBooking.aggregate([
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$price" },
      },
    },
  ]);

  const totalRevenue = revenueResult[0]?.totalRevenue || 0;

  // Get counts
  const [
    totalSubscriptionBooking,
    totalSubscriptions,
    totalClasses,
    totalActiveClasses,
    totalCustomers,
    totalActiveTrainers,
    totalTrainer,
    totalPackages,
    dailyPackages,
    weeklyPackages,
    monthlyPackages,
  ] = await Promise.all([
    SubscriptionBooking.countDocuments(),
    Subscription.countDocuments(),
    Subscription.countDocuments({ isSingleClass: true }),                  // totalClasses
    Subscription.countDocuments({ isSingleClass: true, isActive: true }), // totalActiveClasses
    User.countDocuments({ user_role: customerRole._id }),
    User.countDocuments({ user_role: trainerRole._id, isActive: true }),
    User.countDocuments({ user_role: trainerRole._id }),
    Package.countDocuments(),
    Package.countDocuments({ duration: "daily" }),
    Package.countDocuments({ duration: "weekly" }),
    Package.countDocuments({ duration: "monthly" }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalSubscriptionBooking,
        totalSubscriptions,
        totalClasses,
        totalActiveClasses,
        totalCustomers,
        totalTrainer,
        totalActiveTrainers,
        totalRevenue,
        packages: {
          totalPackages,
          dailyPackages,
          weeklyPackages,
          monthlyPackages,
        },
      },
      "Dashboard data fetched successfully"
    )
  );
});




// Get Month Wise Data
const getMonthWiseData = asyncHandler(async (req, res) => {
  const { year } = req.query;
  const selectedYear = year ? parseInt(year) : new Date().getFullYear();
  console.log("selcted year----------->",selectedYear);

  // const totalOrders = await Order.countDocuments();

  const now = new Date();
  const startOfMonth = new Date(selectedYear, now.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(selectedYear, now.getMonth() + 1, 0, 23, 59, 59, 999);

  const totalOrdersThisMonth = await Order.countDocuments({
    order_date: { $gte: startOfMonth, $lte: endOfMonth },
  });

  const ordersPerMonth = await Order.aggregate([
    {
      $match: {
        order_date: {
          $gte: new Date(`${selectedYear}-01-01T00:00:00.000Z`),
          $lte: new Date(`${selectedYear}-12-31T23:59:59.999Z`),
        },
      },
    },
    {
      $group: {
        _id: {
          month: { $month: "$order_date" },
        },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { "_id.month": 1 } },
  ]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const yearlyOrders = monthNames.map(name => ({
    month: name,
    orderCount: 0,
  }));

  ordersPerMonth.forEach(({ _id, orderCount }) => {
    yearlyOrders[_id.month - 1].orderCount = orderCount;
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalOrdersThisMonth,
        currentYear: selectedYear,
        yearlyOrders,
      },
      "Dashboard data fetched successfully"
    )
  );
});


const getPlannerDashboard = asyncHandler(async (req, res) => {
  try {
    const { bookingDate, subServiceId } = req.body;

    const filter = {};
    if (subServiceId) {
      filter['orderDetails.subServiceId'] = subServiceId;
    }

    // Fetch orderDetails
    const orderDetails = await OrderDetails.find(filter)
      .populate({
        path: 'order',
        populate: { path: 'created_by', select: 'first_name last_name' }
      })
      .populate('groomer', 'first_name last_name phone_number address userStatus specialization experience experienceYear')
      .populate('orderDetails.serviceId', 'name')
      .populate('orderDetails.subServiceId', 'name')
      .populate({
        path: 'orderDetails.petTypeId',
        select: 'petName',
      })
      .lean();

    const plannerData = [];
    const usedTimeSlotKeys = new Set();

    // Build plannerData from orderDetails
    for (const detail of orderDetails) {
      const timeslot = await TimeSlot.findById(detail.orderDetails.timeslot).lean();
      if (!timeslot) continue;

      // Filter by bookingDate if provided
      if (bookingDate) {
        const filterDate = new Date(bookingDate).toISOString().split('T')[0];
        const slotDate = new Date(timeslot.bookingDate).toISOString().split('T')[0];
        if (filterDate !== slotDate) continue;
      }

      const key = `${new Date(timeslot.startTime).toISOString()}_${detail.groomer?._id?.toString() || ""}`;
      usedTimeSlotKeys.add(key);

      plannerData.push({
        bookingDate: timeslot.bookingDate,
        groomerId: detail.groomer?._id || "",
        startTime: timeslot.startTime,
        endTime: timeslot.endTime,
        customerName: detail.order?.created_by
          ? `${detail.order.created_by.first_name} ${detail.order.created_by.last_name || ''}`.trim()
          : "",
        petName: detail.orderDetails.petTypeId?.petName || "",
        ServiceType: detail.orderDetails.serviceId?.name || "",
        subServiceType: detail.orderDetails.subServiceId?.name || "",
        duration: timeslot.duration || null,
        travelTime: timeslot.travelTime || null,
        status: detail.booking_status || "CONFIRMED",
        orderId: detail.order?._id || null,
        orderDetailId: detail._id,
        type: "ORDER"
      });
    }

    // Fetch bookings for given bookingDate (and subServiceId if provided)
    const bookingFilter = {
      date: new Date(bookingDate)
    };
    if (subServiceId) {
      bookingFilter.subService = subServiceId;
    }

    const bookings = await Booking.find(bookingFilter)
      .populate('customer', 'first_name last_name')
      .populate('pet', 'petName')
      .populate('serviceType', 'name')
      .populate('subService', 'name')
      .populate('groomer', 'first_name last_name phone_number address userStatus specialization experience experienceYear')
      .populate('timeSlot')
      .lean();

    // Add bookings to plannerData
    for (const booking of bookings) {
      const timeslot = booking.timeSlot;
      if (!timeslot) continue;

      const key = `${new Date(timeslot.startTime).toISOString()}_${booking.groomer?._id?.toString() || ""}`;
      usedTimeSlotKeys.add(key);

      plannerData.push({
        bookingDate: booking.date,
        groomerId: booking.groomer?._id || "",
        startTime: timeslot.startTime,
        endTime: timeslot.endTime,
        customerName: booking.customer
          ? `${booking.customer.first_name} ${booking.customer.last_name || ''}`.trim()
          : "",
        petName: booking.pet?.petName || "",
        ServiceType: booking.serviceType?.name || "",
        subServiceType: booking.subService?.name || "",
        duration: timeslot.duration || null,
        travelTime: timeslot.travelTime || null,
        status: booking.status || "Pending",
        orderId: booking.orderId || null,
        orderDetailId: booking.orderDetailsId || null,
        bookingId: booking._id,
        type: "BOOKING"
      });
    }

    // Fetch all timeSlots for the date
    const allTimeSlots = await TimeSlot.find({
      bookingDate: new Date(bookingDate)
    }).lean();

    // Add AVAILABLE slots
    for (const slot of allTimeSlots) {
      const key = `${new Date(slot.startTime).toISOString()}_${slot.groomerId?.toString() || ""}`;
      if (!usedTimeSlotKeys.has(key)) {
        plannerData.push({
          bookingDate: slot.bookingDate,
          groomerId: "",
          startTime: slot.startTime,
          endTime: slot.endTime,
          customerName: "",
          petName: "",
          ServiceType: "",
          subServiceType: "",
          duration: slot.duration || null,
          travelTime: slot.travelTime || null,
          status: "AVAILABLE",
          orderId: null,
          orderDetailId: null,
          bookingId: null,
          type: "AVAILABLE"
        });
      }
    }

    return res.status(200).json(new ApiResponse(200, plannerData, "Planner data retrieved"));
  } catch (err) {
    console.error("Planner Dashboard Error:", err);
    res.status(500).json(new ApiError(500, "Failed to fetch planner data"));
  }
});



const getAvailableGroomersforBooking = async (req, res) => {
  try {
    const { date, timeslot, subServiceId } = req.body;

    if (!date || !timeslot || !subServiceId) {
      return res.status(400).json({
        success: false,
        message: "Date, Timeslot and SubServiceId are required"
      });
    }

    const groomerRoleId = new mongoose.Types.ObjectId("67e64c220a8dd12a8af173d7");
    const subServiceObjectId = new mongoose.Types.ObjectId(subServiceId);

    // Get start and end of date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Fetch all groomers with role groomer
    const allGroomers = await User.find({ user_role: groomerRoleId });

    // Fetch orderDetails matching date, timeslot, and subServiceId
    const matchedOrderDetails = await OrderDetails.find({
      "orderDetails.date": { $gte: startOfDay, $lt: endOfDay },
      "orderDetails.timeslot": timeslot,
      "orderDetails.subServiceId": subServiceObjectId
    }).select("groomer");

    // Extract assigned groomer IDs as string array
    const assignedGroomerIds = new Set(
      matchedOrderDetails.map((order) => order.groomer?.toString())
    );

    // Split into booked and available groomers
    const bookedGroomers = [];
    const availableGroomers = [];

    allGroomers.forEach((groomer) => {
      const groomerId = groomer._id.toString();
      if (assignedGroomerIds.has(groomerId)) {
        bookedGroomers.push(groomer);
      } else {
        availableGroomers.push(groomer);
      }
    });

    res.status(200).json({
      success: true,
      data: {
        bookedGroomers,
        availableGroomers,
      },
    });
  } catch (error) {
    console.error("Error in getAvailableGroomers:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
/**---- */
const getAvailableGroomers = asyncHandler(async (req, res) => {
  const { groomerId, timeSlotId, date } = req.body;

  if (!groomerId || !timeSlotId || !date) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Groomer, TimeSlot, and Date are required"));
  }

  const timeslot = await TimeSlot.findById(timeSlotId);
  if (!timeslot) {
    return res.status(404).json(new ApiResponse(404, null, "TimeSlot not found"));
  }

  const requestDate = new Date(date).toISOString().split("T")[0];
  const newBookingKey = `${new Date(timeslot.startTime).toISOString()}_${groomerId.toString()}`;

  const usedKeys = new Set();

  // Check existing OrderDetails
  const orderDetails = await OrderDetails.find()
    .populate("orderDetails.timeslot")
    .populate("groomer")
    .lean();

  for (const detail of orderDetails) {
    if (!detail.timeslot) continue;

    const orderDate = new Date(detail.timeslot.bookingDate).toISOString().split("T")[0];
    if (orderDate !== requestDate) continue;

    const key = `${new Date(detail.timeslot.startTime).toISOString()}_${detail.groomer?._id?.toString() || ""}`;
    usedKeys.add(key);
  }

  // Check existing Bookings
  const existingBookings = await Booking.find({ date: new Date(date) })
    .populate("timeSlot")
    .populate("groomer")
    .lean();

  for (const booking of existingBookings) {
    if (!booking.timeSlot) continue;

    const key = `${new Date(booking.timeSlot.startTime).toISOString()}_${booking.groomer?._id?.toString() || ""}`;
    usedKeys.add(key);
  }

  // Check availability
  if (usedKeys.has(newBookingKey)) {
    return res.status(200).json(
      new ApiResponse(
        200,
        null,
        "This groomer is already assigned to the selected timeslot on this date."
      )
    );
  }

  // Groomer is available
  const groomer = await User.findById(groomerId).select("_id first_name email");
  if (!groomer) {
    return res.status(404).json(new ApiResponse(404, null, "Groomer not found"));
  }

  return res.status(200).json(
    new ApiResponse(200, {
      groomerId: groomer._id,
      groomerName: groomer.first_name,
      timeSlotId: timeslot._id,
    }, "Groomer is available for the selected timeslot")
  );
});
/**------- */
// Create Article
const createArtical = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const imageLocalPath = req.file?.path;

  if (!title) {
    return res.status(400).json(new ApiError(400, "Title is required"));
  }

  if (!imageLocalPath) {
    return res.status(400).json(new ApiError(400, "Image is required"));
  }

  const uploadedImage = await uploadOnCloudinary(imageLocalPath);
  if (!uploadedImage?.url) {
    return res.status(400).json(new ApiError(400, "Error uploading image"));
  }

  const artical = await Artical.create({
    title,
    description,
    image: uploadedImage.url,
    created_by: req.user._id,
  });

  res.status(201).json(new ApiResponse(201, artical, "Article created successfully"));
});

// Get all Articles
const getAllArticals = asyncHandler(async (req, res) => {
  const articals = await Artical.find();
  if (!articals) {
    return res.status(404).json(new ApiError(404, "Article not found"));
  }
  res.status(200).json(new ApiResponse(200, articals, "Articles fetched successfully"));
});

// Get Article by ID
const getArticalById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json(new ApiError(400, "Article ID is required"));
  }
  const artical = await Artical.findById(id);
  if (!artical) {
    return res.status(404).json(new ApiError(404, "Article not found"));
  }
  res.status(200).json(new ApiResponse(200, artical, "Article fetched successfully"));
});

// Update Article
const updateArtical = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  const imageLocalPath = req.file?.path;

  const existingArtical = await Artical.findById(id);
  if (!existingArtical) {
    return res.status(404).json(new ApiError(404, "Article not found"));
  }

  let image = existingArtical.image;
  if (imageLocalPath) {
    const [deleteResult, uploadResult] = await Promise.all([
      existingArtical.image ? deleteFromCloudinary(existingArtical.image) : Promise.resolve(),
      uploadOnCloudinary(imageLocalPath),
    ]);
    if (!uploadResult?.url) {
      return res.status(400).json(new ApiError(400, "Error uploading new image"));
    }
    image = uploadResult.url;
  }

  const updatedArtical = await Artical.findByIdAndUpdate(
    id,
    { title, description, image, updated_by: req.user._id },
    { new: true }
  );

  res.status(200).json(new ApiResponse(200, updatedArtical, "Article updated successfully"));
});

// Delete Article
const deleteArtical = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const artical = await Artical.findByIdAndDelete(id);
  if (!artical) {
    return res.status(404).json(new ApiError(404, "Article not found"));
  }
  res.status(200).json(new ApiResponse(200, "Article deleted successfully"));
});


export {
  createPromoCode,
  getPromoCodeById,
  updatePromoCode,
  deletePromoCode,
  getAllPromoCodes,
  getAllOrder,
  getDashboardData,
  getMonthWiseData,
  getPlannerDashboard,
  getAvailableGroomers,
  createArtical,
  getAllArticals,
  getArticalById,
  updateArtical,
  deleteArtical,
  getAvailableGroomersforBooking
}

