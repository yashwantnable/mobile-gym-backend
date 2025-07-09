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

  if (!packageId) {
    throw new ApiError(400, "Package ID is required");
  }

  const pkg = await Package.findById(packageId);
  if (!pkg) {
    throw new ApiError(404, "Package not found");
  }

  const existingBooking = await PackageBooking.findOne({
    customer,
    package: packageId
  });

  if (existingBooking) {
    throw new ApiError(400, "You have already booked this package");
  }

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
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, bookings, "All package bookings fetched"));
});


const joinClassWithPackage = asyncHandler(async (req, res) => {
  const { subscriptionId } = req.body;
  const customer = req.user._id;

  if (!subscriptionId) {
    throw new ApiError(400, "Subscription ID is required");
  }

  // 1. Find the subscription
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  // 2. Get the active, not-finished package booking
  const activeBooking = await PackageBooking.findOne({
    customer,
    activate: true,
    isFinished: false
  }).populate("package");

  if (!activeBooking) {
    throw new ApiError(400, "No active package found");
  }

  // 3. Check if already joined this subscription
  const alreadyJoined = activeBooking.joinClasses.some(
    j => j.classId.toString() === subscription._id.toString()
  );
  if (alreadyJoined) {
    throw new ApiError(400, "This subscription is already joined with this package");
  }

  // 4. Add the class
  activeBooking.joinClasses.push({
    classId: subscription._id,
    className: subscription.name
  });

  // 5. Mark as finished if limit reached
  if (activeBooking.joinClasses.length >= activeBooking.package.numberOfClasses) {
    activeBooking.isFinished = true;
  }

  await activeBooking.save();

  return res.status(200).json(
    new ApiResponse(200, activeBooking, "Subscription joined successfully using package")
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


export{
    createPackageBooking,
    getAllPackageBookings,
    joinClassWithPackage,
    activatePackage,
    getPackageBookingById,
    getPackageBookingsByUserId
}

