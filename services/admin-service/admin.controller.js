import mongoose from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import nodemailer from "nodemailer";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../../utils/cloudinary.js";
import { PetRegistration } from "../../models/pet.model.js";
import { User } from "../../models/user.model.js";
import { UserRole } from "../../models/userRole.model.js";
import {PromoCode} from "../../models/admin.model.js"
import { randomBytes } from "crypto";
import {Order} from "../../models/order.model.js"
import {OrderDetails} from "../../models/order.model.js"
import {TimeSlot} from "../../models/timeslot.model.js"
import {Artical} from "../../models/artical.model.js"
import {Booking} from "../../models/booking.model.js"

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


//create Pet
const createPet = asyncHandler(async (req, res) => {
  console.log("req.body", req.body);

  const {
    first_name,
    last_name,
    email,
    phone_number,
    address,
    petinfo
  } = req.body;

  if (!Array.isArray(petinfo) || petinfo.length === 0) {
    return res.status(400).json(new ApiError(400, "Missing pet information"));
  }

  let user;
  let isNewUser = false;

  user = await User.findOne({ email });

  if (!user) {
    const customerRole = await UserRole.findOne({ name: 'customer' });

    if (!customerRole) {
      return res.status(400).json(new ApiError(400, "Customer role not found"));
    }

    const rawPassword = randomBytes(6).toString('hex');

    user = await User.create({
      first_name,
      last_name,
      email,
      phone_number,
      address,
      user_role: customerRole?._id,
      password: rawPassword,
    });

    isNewUser = true;

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Welcome to PetGroomr! Your account details",
        text: `Hi ${first_name},\n\nYour account has been created successfully!\n\nLogin Email: ${email}\nPassword: ${rawPassword}\n\nPlease login and change your password for security.\n\n- PetGroomr Team`
      });
    } catch (emailErr) {
      console.error("Email sending error:", emailErr);
    }
  }

  const petArray = await Promise.all(
    petinfo.map(async (pet, index) => {
      let petImageFile = req.files.find(f => f.fieldname === `petinfo[${index}][image]`);
      let petDocumentFile = req.files.find(f => f.fieldname === `petinfo[${index}][document]`);
  
      let petImage = null;
      let petDocument = null;
  
      if (petImageFile) {
        const uploadedImage = await uploadOnCloudinary(petImageFile.path);
        if (!uploadedImage?.url) {
          throw new ApiError(400, `Error uploading image for pet ${pet.petName}`);
        }
        petImage = uploadedImage.url;
      }
  
      if (petDocumentFile) {
        const uploadedDoc = await uploadOnCloudinary(petDocumentFile.path);
        if (!uploadedDoc?.url) {
          throw new ApiError(400, `Error uploading document for pet ${pet.petName}`);
        }
        petDocument = uploadedDoc.url;
      }
  
      return {
        userId: user._id,
        petName: pet.petName,
        image: petImage,
        petType: pet.petType,
        breed: pet.breed,
        dob: pet.dob,
        gender: pet.gender,
        weight: pet.weight,
        activity_level: pet.activity_level,
        day_Habits: pet.day_Habits,
        personality: pet.personality,
        health_issues: pet.health_issues,
        special_care: pet.special_care,
        document: petDocument,
        microchip_number: pet.microchip_number,
        warning: pet.warning,
        dietary_requirements: pet.dietary_requirements,
        life_usage: pet.life_usage,
      };
    })
  );

  const createdPets = await PetRegistration.insertMany(petArray);
  console.log("createdPets", createdPets);
  
  return res.status(200).json(
    new ApiResponse(200, { user, pets: createdPets, isNewUser }, "Pets registered successfully")
  );
});


//updatePet
const updatePet = asyncHandler(async (req, res) => {
  console.log("req.body---", req.body);
  console.log("req.files-->", req.files);

  try {
    const { petId } = req.params;

    const existingPet = await PetRegistration.findById(petId);
    if (!existingPet) {
      return res.status(404).json(new ApiError(404, "Pet not found"));
    }

    if (!req.body.petinfo || !req.body.petinfo.length) {
      return res.status(400).json(new ApiError(400, "Missing pet info data"));
    }

    const petInfos = req.body.petinfo;

    for (let i = 0; i < petInfos.length; i++) {
      const petData = petInfos[i];

      const {
        petName,
        petType,
        breed,
        dob,
        gender,
        weight,
        activity_level,
        day_Habits,
        personality,
        health_issues,
        special_care,
        microchip_number,
        warning,
        dietary_requirements,
        life_usage
      } = petData;

      const requiredFields = { petName, petType, breed, gender, weight, dob, activity_level, day_Habits };

      const missingFields = Object.keys(requiredFields).filter(
        (field) => !requiredFields[field] || requiredFields[field] === "undefined"
      );

      if (missingFields.length > 0) {
        return res.status(400).json(
          new ApiError(400, `Missing required field(s) for pet ${i + 1}: ${missingFields.join(", ")}`)
        );
      }

      const petImageFile = req.files.find((f) => f.fieldname === `petinfo[${i}][image]`);
      const petDocumentFile = req.files.find((f) => f.fieldname === `petinfo[${i}][existingDocument]`);

      let petImage = i === 0 ? existingPet.image : null;
      let petDocument = i === 0 ? existingPet.document : null;

      if (petImageFile?.path) {
        if (petImage) await deleteFromCloudinary(petImage);
        const uploadedImage = await uploadOnCloudinary(petImageFile.path);
        if (!uploadedImage?.url) {
          return res.status(400).json(new ApiError(400, `Error uploading pet ${i + 1} image`));
        }
        petImage = uploadedImage.url;
      }

      if (petDocumentFile?.path) {
        if (petDocument) await deleteFromCloudinary(petDocument);
        const uploadedDoc = await uploadOnCloudinary(petDocumentFile.path);
        if (!uploadedDoc?.url) {
          return res.status(400).json(new ApiError(400, `Error uploading pet ${i + 1} document`));
        }
        petDocument = uploadedDoc.url;
      }

      if (i === 0) {
        await PetRegistration.findByIdAndUpdate(
          petId,
          {
            petName,
            image: petImage,
            petType,
            breed,
            dob,
            gender,
            weight,
            activity_level,
            day_Habits,
            personality,
            health_issues,
            special_care,
            document: petDocument,
            microchip_number,
            warning,
            dietary_requirements,
            life_usage
          },
          { new: true }
        );
      } else {
        await PetRegistration.create({
          userId: existingPet.userId,
          petName,
          image: petImage,
          petType,
          breed,
          dob,
          gender,
          weight,
          activity_level,
          day_Habits,
          personality,
          health_issues,
          special_care,
          document: petDocument,
          microchip_number,
          warning,
          dietary_requirements,
          life_usage
        });
      }
    }

    return res.status(200).json(new ApiResponse(200, null, "Pet(s) updated/added successfully"));

  } catch (error) {
    console.log("Error------", error);
    return res.status(400).json(new ApiError(400, error, "Error while updating pet(s)"));
  }
});


//findpetbyID
const findPetById = asyncHandler(async (req, res) => {
    try {
      const { petId } = req.params;
  
      const pet = await PetRegistration.findById(petId);
      if (!pet) {
        return res.status(404).json(new ApiError(404, "Pet not found"));
      }
  
      return res.status(200).json(new ApiResponse(200, pet, "Pet fetched successfully"));
    } catch (error) {
      console.error("Find pet error:", error);
      return res.status(500).json(new ApiError(500, "An unexpected error occurred"));
    }
});


//findallpet
const findAllPets = asyncHandler(async (req, res) => {
  console.log("req.body....", req.body);

  try {
    const { search = "" } = req.query;
    const { filter = {}, sortOrder = -1, userId } = req.body;

    let searchCondition = {};

    // Add search text filter
    if (search && search !== "undefined") {
      const regex = new RegExp(search, "i");

      searchCondition.$or = [
        { petName: { $regex: regex } },
        { petType: { $regex: regex } },
        { breed: { $regex: regex } }
      ];
    }

    // Add additional filters
    if (filter && typeof filter === "object") {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          searchCondition[key] = value;
        }
      });
    }

    if (userId) {
      searchCondition.userId = userId;
    }

    const pets = await PetRegistration.find(searchCondition)
      .sort({ createdAt: sortOrder })
      .populate("userId", "first_name last_name email phone_number address")
      .populate("petName", "breed dob gender weight activity_level health_issues document")
      .populate("petType", "name")
      .populate("breed", "name");

    return res
      .status(200)
      .json(new ApiResponse(200, pets, "Pets fetched successfully"));
  } catch (error) {
    console.log("findAllPets Error:", error);
    return res.status(500).json(new ApiError(500, error.message || "Internal Server Error"));
  }
});


//deletepet
const deletePet = asyncHandler(async (req, res) => {
  const { petid } = req.params;
  
  try {
    const pet = await PetRegistration.findById(petid);
    if (!pet) {
      return res.status(404).json(new ApiError(404, "Pet not found"));
    }
  
    if (pet.image) {
      await deleteFromCloudinary(pet.image);
    }
  
    if (pet.document) {
      await deleteFromCloudinary(pet.document);
    }
  
    await PetRegistration.findByIdAndDelete(petid);
  
    return res.status(200).json(new ApiResponse(200, {}, "Pet deleted successfully"));
  } catch (error) {
    console.error("deleting pet error:", error);
    return res.status(500).json(new ApiError(500, "An unexpected error occurred"));
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
  } = req.body;

  const requiredFields = { code, discountType, discountValue, maxUses };
  const missingFields = Object.keys(requiredFields).filter(
    (field) =>
      requiredFields[field] === undefined ||
      requiredFields[field] === null ||
      requiredFields[field] === ""
  );

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json(
        new ApiError(
          400,
          `Missing required field(s): ${missingFields.join(", ")}`
        )
      );
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
    created_by: req.user?._id,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(201, createdPromoCode, "Promo Code created successfully")
    );
});


// Update Promo Code
const updatePromoCode = asyncHandler(async (req, res) => {
  if (!req.params.id || req.params.id === "undefined") {
    return res.status(400).json(new ApiError(400, "ID not provided"));
  }

  if (Object.keys(req.body).length === 0) {
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
  } = req.body;

  const existingPromoCode = await PromoCode.findById(req.params.id);
  if (!existingPromoCode) {
    return res.status(404).json(new ApiError(404, "Promo code not found"));
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
    updated_by: req.user._id,
  };

  // Remove undefined fields to avoid overwriting existing data unnecessarily
  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key]
  );

  const updatedPromoCode = await PromoCode.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true }
  );

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


// Get Dashboard Data
const getDashboardData = asyncHandler(async (req, res) => {
  const registrations = await PetRegistration.find()
  
  const totalPets = registrations.length;


  const uniqueUserIds = new Set(registrations.map((reg) => reg.userId?._id?.toString())).size;

    const totalOrders = await Order.countDocuments();
  
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
  
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);
  
   
    const totalOrdersThisMonth = await Order.countDocuments({
      order_date: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    });
  return res.status(200).json(
    new ApiResponse(200, {
      totalPets,
      totalUsers: uniqueUserIds,
      totalOrders,
      totalOrdersThisMonth,   
    },
    "Dashboard data fetched successfully")
  );
});


// Get Pet Count by Type
const getPetCountByType = asyncHandler(async (req, res) => {
  const petCounts = await PetRegistration.aggregate([
    {
      $group: {
        _id: "$petType",
        totalPets: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "pettypes", 
        localField: "_id",
        foreignField: "_id",
        as: "petTypeDetails",
      },
    },
    {
      $unwind: "$petTypeDetails",
    },
    {
      $project: {
        _id: 0,
        petTypeId: "$petTypeDetails._id",
        petTypeName: "$petTypeDetails.name",
        totalPets: 1,
      },
    },
    { $sort: { totalPets: -1 } },
  ]);

  if (!petCounts || petCounts.length === 0) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "No pet type data found"));
  }

  return res.status(200).json(
    new ApiResponse(200, petCounts, "Pet count by type fetched successfully")
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
  createPet,
  updatePet,
  findPetById,
  findAllPets,
  deletePet,
  createPromoCode,
  getPromoCodeById,
  updatePromoCode,
  deletePromoCode,
  getAllPromoCodes,
  getAllOrder,
  getDashboardData,
  getPetCountByType,
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

