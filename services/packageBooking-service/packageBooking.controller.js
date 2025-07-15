import mongoose from "mongoose";
import { Package } from "../../models/package.model.js";
import { PackageBooking } from "../../models/packageBooking.model.js";
import { Subscription } from "../../models/subscription.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

function calculateExpiration(firstActivatedAt, duration) {
  const start = new Date(firstActivatedAt);
  switch (duration) {
    case 'daily':
      return new Date(start.setDate(start.getDate() + 1));
    case 'weekly':
      return new Date(start.setDate(start.getDate() + 7));
    case 'monthly':
      return new Date(start.setMonth(start.getMonth() + 1));
    case 'yearly':
      return new Date(start.setFullYear(start.getFullYear() + 1));
    default:
      return null;
  }
}


const createPackageBooking = asyncHandler(async (req, res) => {
  const { packageId } = req.body;
  const customer = req.user._id;

  if (!packageId) throw new ApiError(400, "Package ID is required");

  const pkg = await Package.findById(packageId);
  if (!pkg) throw new ApiError(404, "Package not found");

  const existingBooking = await PackageBooking.findOne({ customer, package: packageId });
  if (existingBooking) throw new ApiError(400, "You have already booked this package");

  const newBooking = await PackageBooking.create({
    package: packageId,
    customer
  });

  const populatedBooking = await PackageBooking.findById(newBooking._id).populate("package");

  return res.status(201).json(new ApiResponse(201, populatedBooking, "Package booked successfully"));
});



const getAllPackageBookings = asyncHandler(async (req, res) => {
  const bookings = await PackageBooking.find()
    .populate("package")
    .populate("customer", "first_name email")
    .populate("joinClasses.classId") // populate current subscription details if needed
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, bookings, "All package bookings fetched"));
});

const joinClassWithPackage = asyncHandler(async (req, res) => {
  const { subscriptionId, packageId } = req.body;
  const customer = req.user._id;
  console.log({subscriptionId, packageId});
  
  if (!subscriptionId || !packageId) {
    throw new ApiError(400, "Subscription ID and Package ID are required");
  }

  // Fetch subscription (populate only trainer, avoid location if it's not a ref)
  const subscription = await Subscription.findById(subscriptionId).populate("trainer");
  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  // Find the specific package booking
  const booking = await PackageBooking.findOne({
    _id: packageId,
    customer,
  }).populate("package");

  if (!booking) {
    throw new ApiError(404, "Package booking not found");
  }

  // Check for expiration and activate if necessary
  if (!booking.activate) {
    const now = new Date();

    if (booking.expiredAt && now > booking.expiredAt) {
      booking.expired = true;
      await booking.save();
      throw new ApiError(400, "Cannot activate an expired package");
    }

    // Deactivate any other active bookings
    await PackageBooking.updateMany(
      { customer, _id: { $ne: booking._id } },
      { $set: { activate: false } }
    );

    // Set first activation time and calculate expiration if not already set
    if (!booking.firstActivatedAt) {
      booking.firstActivatedAt = now;

      const duration = booking.package?.duration || "monthly";
      booking.expiredAt = calculateExpiration(now, duration); // Use your existing helper
    }

    booking.activate = true;
    await booking.save();
  }

  // Prevent duplicate joining
  const alreadyJoined = booking.joinClasses.some(
    j => j.classId?.toString() === subscription._id.toString()
  );

  if (alreadyJoined) {
    throw new ApiError(400, "This subscription is already joined with this package");
  }

  // Join new class
  booking.joinClasses.push({
    classId: subscription._id,
    className: subscription.name,
    classDetails: {
      name: subscription.name,
      description: subscription.description,
      trainer: subscription.trainer?._id,
      location: subscription.location || null, // handled without populate
      date: subscription.date,
      startTime: subscription.startTime,
      endTime: subscription.endTime,
    },
  });

  // Finish package if limit reached
  if (booking.joinClasses.length >= booking.package.numberOfClasses) {
    booking.isFinished = true;
  }

  await booking.save();

  return res.status(200).json(
    new ApiResponse(200, booking, "Subscription joined and package activated successfully")
  );
});


const activatePackage = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const customer = req.user._id;

  // 1. Deactivate all other active bookings for the user
  await PackageBooking.updateMany({ customer }, { $set: { activate: false } });

  // 2. Find the booking to activate
  const booking = await PackageBooking.findById(bookingId).populate('package');
  if (!booking) {
    throw new ApiError(404, "Package booking not found");
  }

  // 3. Prevent activation if package is expired
  if (booking.expiredAt && new Date() > booking.expiredAt) {
    booking.expired = true;
    await booking.save();
    throw new ApiError(400, "Cannot activate an expired package");
  }

  // 4. First-time activation: set activation and expiration
  if (!booking.firstActivatedAt) {
    const now = new Date();
    const duration = booking.package?.duration || 'monthly';
    booking.firstActivatedAt = now;
    booking.expiredAt = calculateExpiration(now, duration); // helper function
  }

  // 5. Activate the booking
  booking.activate = true;
  await booking.save();

  return res.status(200).json(
    new ApiResponse(200, booking, "Package activated successfully")
  );
});



const getPackageBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await PackageBooking.findById(id)
    .populate("package")
    .populate("customer", "first_name email")
    .populate("joinClasses.classId", "subscriptionName startTime endTime date"); // Add fields as needed

  if (!booking) {
    throw new ApiError(404, "Package booking not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, booking, "Package booking fetched successfully"));
});

const getPackageBookingsByUserId = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const bookings = await PackageBooking.find({ customer: userId })
    .populate("package")
    .populate("customer", "first_name email")
    .populate({
      path: "joinClasses.classId",
      select: "subscriptionName startTime endTime date", // Add other fields as needed
      populate: [
        { path: "categoryId", select: "cName" },
        { path: "sessionType", select: "sessionName" },
        { path: "trainer", select: "first_name last_name email" },
        {
          path: "Address",
          select: "streetName landmark country city",
          populate: [
            { path: "country", select: "name" },
            { path: "city", select: "name" }
          ]
        }
      ]
    })
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, bookings, "Package bookings by user fetched")
  );
});

const getMyPackageBookings = asyncHandler(async (req, res) => {
  const customer = req.user._id;

  const bookings = await PackageBooking.find({ customer })
    .populate("package")
    .populate("joinClasses.classId")
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, bookings, "Your package bookings fetched"));
});

// GET  /packages/:packageId/customers
const getCustomersByPackageId = asyncHandler(async (req, res) => {
  const { packageId } = req.params;

  if (!packageId || !mongoose.Types.ObjectId.isValid(packageId)) {
    throw new ApiError(400, "Valid package ID is required");
  }

  // fetch unique customer ids for this package
  const customerIds = await PackageBooking.distinct("customer", {
    package: packageId
  });

  if (customerIds.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No customers booked this package"));
  }

  // pull basic customer info; adjust fields as needed
  const customers = await User.find(
    { _id: { $in: customerIds } },
    "first_name last_name email phone"
  ).lean();

  return res
    .status(200)
    .json(new ApiResponse(200, customers, "Customers fetched successfully"));
});

// GET /packages/my/joined‑classes
const getMyJoinedClasses = asyncHandler(async (req, res) => {
  const customer = req.user._id;

  const bookings = await PackageBooking.find(
    { customer, "joinClasses.0": { $exists: true } },
    { joinClasses: 1 }                                // project joined classes only
  )
    .populate({
      path: "joinClasses.classId",
      select: "subscriptionName name price startTime endTime date",
      populate: [
        { path: "categoryId", select: "cName" },
        { path: "sessionType", select: "sessionName" },
        { path: "trainer", select: "first_name last_name email" },
        {
          path: "Address",
          select: "streetName landmark country city",
          populate: [
            { path: "country", select: "name" },
            { path: "city", select: "name" }
          ]
        }
      ]
    });

  const joinedClasses = bookings.flatMap(b =>
    b.joinClasses.map(j => ({
      bookingId: b._id,
      classId:   j.classId?._id,
      className: j.className || j.classId?.subscriptionName || j.classId?.name,
      details:   j.classDetails || j.classId,
    }))
  );

  return res
    .status(200)
    .json(new ApiResponse(200, joinedClasses, "Joined classes fetched"));
});



export{
  getMyJoinedClasses,
  getCustomersByPackageId,
    createPackageBooking,
    getAllPackageBookings,
    joinClassWithPackage,
    activatePackage,
    getPackageBookingById,
    getPackageBookingsByUserId
}

