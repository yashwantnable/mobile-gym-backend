import mongoose from "mongoose";
import { Package } from "../../models/package.model.js";
import { PackageBooking } from "../../models/packageBooking.model.js";
import { Subscription } from "../../models/subscription.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";


const PROXIMITY_THRESHOLD_KM = 0.3;

function calculateDistance(coord1, coord2) {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const toRad = (val) => (val * Math.PI) / 180;

  const R = 6371; // Radius of Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in km
}


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

  if (!subscriptionId || !packageId) {
    throw new ApiError(400, "Subscription ID and Package ID are required");
  }

  // 1️⃣ Fetch subscription details
  const subscription = await Subscription.findById(subscriptionId)
    .populate("trainer", "first_name email")
    .populate("Address");

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  // 🔒 Check if this subscription was already purchased directly
  const alreadyPurchased = await CustomerSubscription.findOne({
    customer,
    subscription: subscriptionId,
  });

  if (alreadyPurchased) {
    throw new ApiError(
      400,
      "You have already purchased this subscription directly"
    );
  }

  // 2️⃣ Fetch package booking
  const booking = await PackageBooking.findOne({
    _id: packageId,
    customer,
  }).populate("package");

  if (!booking) {
    throw new ApiError(404, "Package booking not found");
  }

  // 3️⃣ Expiration check and activation
  const now = new Date();

  if (!booking.activate) {
    if (booking.expiredAt && now > booking.expiredAt) {
      booking.expired = true;
      await booking.save();
      throw new ApiError(400, "Cannot activate an expired package");
    }

    await PackageBooking.updateMany(
      { customer, _id: { $ne: booking._id } },
      { $set: { activate: false } }
    );

    if (!booking.firstActivatedAt) {
      booking.firstActivatedAt = now;
      const duration = booking.package?.duration || "monthly";
      booking.expiredAt = calculateExpiration(now, duration);
    }

    booking.activate = true;
    await booking.save();
  }

  // 4️⃣ Check for duplicates in joined classes
  const alreadyJoined = booking.joinClasses.some(
    (j) => j.classId?.toString() === subscription._id.toString()
  );
  if (alreadyJoined) {
    throw new ApiError(400, "This subscription is already joined with this package");
  }

  // 5️⃣ Check if user exceeded class limit
  if (booking.joinClasses.length >= booking.package.numberOfClasses) {
    booking.isFinished = true;
    await booking.save();
    throw new ApiError(400, "Package class limit reached");
  }

  // 6️⃣ Add class to joinClasses
  booking.joinClasses.push({
    classId: subscription._id,
    className: subscription.name,
    classDetails: {
      name: subscription.name,
      description: subscription.description,
      trainer: {
        _id: subscription.trainer?._id || null,
        name: subscription.trainer?.first_name || null,
        email: subscription.trainer?.email || null,
      },
      location: {
        _id: subscription.Address?._id || null,
        streetName: subscription.Address?.streetName || null,
        landmark: subscription.Address?.landmark || null,
        coordinates: subscription.Address?.location?.coordinates || [],
        city: subscription.Address?.city || null,
        country: subscription.Address?.country || null,
      },
      date: subscription.date?.[0] || null,
      startTime: subscription.startTime,
      endTime: subscription.endTime,
    },
  });

  if (booking.joinClasses.length >= booking.package.numberOfClasses) {
    booking.isFinished = true;
  }

  await booking.save();

  return res.status(200).json(
    new ApiResponse(200, booking, "Subscription joined and package activated successfully")
  );
});

 

const markClassAttendance = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const { bookingId, classId, coordinates } = req.body;

  if (!bookingId || !classId || !Array.isArray(coordinates)) {
    throw new ApiError(400, "Missing bookingId, classId, or coordinates");
  }

  // 1️⃣ Fetch the relevant booking
  const booking = await PackageBooking.findOne({
    _id: bookingId,
    customer: customerId,
    "joinClasses.classId": classId,
  });

  if (!booking) {
    throw new ApiError(404, "No such joined class in your booking");
  }

  // 2️⃣ Locate the specific joined class
  const joinedClass = booking.joinClasses.find(
    (j) => j.classId.toString() === classId
  );

  if (!joinedClass) {
    throw new ApiError(404, "Class not found in your joined classes");
  }

  if (joinedClass.attended) {
    throw new ApiError(400, "You have already marked attendance for this class");
  }

  const classCoords = joinedClass.classDetails?.location?.coordinates;
  if (!classCoords || classCoords.length !== 2) {
    throw new ApiError(400, "Class location coordinates not available");
  }

  // 3️⃣ Check proximity
  const distance = calculateDistance(coordinates, classCoords); // returns distance in km
  if (distance > PROXIMITY_THRESHOLD_KM) {
    throw new ApiError(
      403,
      `You are too far from the class location (Distance: ${distance.toFixed(2)} km)`
    );
  }

  // 4️⃣ Check date validity (must be today)
  const classDate = new Date(joinedClass.classDetails?.date);
  const today = new Date();

  const isSameDate =
    classDate.getDate() === today.getDate() &&
    classDate.getMonth() === today.getMonth() &&
    classDate.getFullYear() === today.getFullYear();

  if (!isSameDate) {
    throw new ApiError(400, "You can only mark attendance on the class date");
  }

  // 5️⃣ Check time window (30 mins before start to 30 mins after end)
  const [startHour, startMin] = joinedClass.classDetails?.startTime?.split(":").map(Number);
  const [endHour, endMin] = joinedClass.classDetails?.endTime?.split(":").map(Number);

  const classStart = new Date(classDate);
  classStart.setHours(startHour, startMin - 30, 0); // 30 min before start

  const classEnd = new Date(classDate);
  classEnd.setHours(endHour, endMin + 30, 0); // 30 min after end

  const now = new Date();

  if (now < classStart || now > classEnd) {
    throw new ApiError(
      400,
      "You can only mark attendance within 30 minutes before or after class time"
    );
  }

  // 6️⃣ Mark attendance
  joinedClass.attended = true;
  joinedClass.attendedAt = new Date();

  await booking.save();

  return res
    .status(200)
    .json(new ApiResponse(200, joinedClass, "Attendance marked successfully"));
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
    { joinClasses: 1, package: 1 } 
  )
    .populate({
      path: "package",
      select: "name", 
    })
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
      packageId: b.package?._id || null,       // ✅ fixed
      packageName: b.package?.name || "N/A",   // ✅ fixed
      classId: j.classId?._id,
      className: j.className || j.classId?.subscriptionName || j.classId?.name,
      details: j.classDetails || j.classId,
      attended: j.attended || false,
      attendedAt: j.attendedAt || null,
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
    getPackageBookingsByUserId,
    markClassAttendance
}

