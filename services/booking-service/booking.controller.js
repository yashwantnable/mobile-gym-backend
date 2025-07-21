import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Booking, SubscriptionBooking } from "../../models/booking.model.js";
import { TimeSlot } from "../../models/timeslot.model.js";
import { Holiday } from "../../models/holiday.model.js";
import { OrderDetails } from "../../models/order.model.js";
import {
  sendEmail,
  sendBookingConfirmationEmail,
} from "../../utils/email.helper.js";
import NotificationService from "../../messaging_feature/services/NotificationService.js";
import { Subscription } from "../../models/subscription.model.js";
import { PromoCode } from "../../models/admin.model.js";


const getMinutesFromTimeString = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

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

//create manual booking
const createManualBooking = asyncHandler(async (req, res) => {
  try {
    const {
      customerId,
      petId,
      serviceTypeId,
      subServiceId,
      groomerId,
      timeSlotId,
      date,
      status,
      price,
      notes,
      petWeight,
    } = req.body;

    if (!groomerId || !timeSlotId || !date) {
      return res
        .status(400)
        .json(new ApiResponse(400, "Groomer, TimeSlot, and Date are required"));
    }

    // Fetch the timeslot details
    const timeslot = await TimeSlot.findById(timeSlotId);
    if (!timeslot) {
      return res.status(404).json(new ApiResponse(404, "TimeSlot not found"));
    }

    const newBookingKey = `${new Date(
      timeslot.startTime
    ).toISOString()}_${groomerId.toString()}`;

    const usedKeys = new Set();

    // 1️⃣ Fetch existing OrderDetails for the date
    const orderDetails = await OrderDetails.find()
      .populate("order")
      .populate("groomer")
      .select("first_name last_name phone_number email")
      .populate("orderDetails.timeslot")
      .lean();

    //   console.log("OrderDetails------------------>",orderDetails);

    for (const detail of orderDetails) {
      if (!detail.timeslot) continue;
      const orderDate = new Date(detail.timeslot.bookingDate)
        .toISOString()
        .split("T")[0];
      const reqDate = new Date(date).toISOString().split("T")[0];
      if (orderDate !== reqDate) continue;

      const key = `${new Date(detail.timeslot.startTime).toISOString()}_${
        detail.groomer?._id?.toString() || ""
      }`;
      usedKeys.add(key);
    }

    // 2️⃣ Fetch existing Bookings for the date
    const existingBookings = await Booking.find({
      date: new Date(date),
    })
      .populate("timeSlot")
      .populate("groomer")
      .lean();

    for (const booking of existingBookings) {
      if (!booking.timeSlot) continue;
      const key = `${new Date(booking.timeSlot.startTime).toISOString()}_${
        booking.groomer?._id?.toString() || ""
      }`;
      usedKeys.add(key);
    }

    // 3️⃣ Check for conflict
    if (usedKeys.has(newBookingKey)) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "This groomer is already assigned to the selected timeslot on this date."
          )
        );
    }

    // 4️⃣ If no conflict, create the booking
    const newBooking = await Booking.create({
      customer: customerId,
      pet: petId,
      serviceType: serviceTypeId,
      subService: subServiceId,
      groomer: groomerId,
      timeSlot: timeSlotId,
      date: new Date(date),
      status: status || "Pending",
      price,
      notes,
      petWeight,
    });

    const populatedBooking = await Booking.findById(newBooking._id)
      .populate("customer", "_id first_name email")
      .populate("pet", "petName")
      .populate("serviceType", "name")
      .populate("subService", "name")
      .populate("groomer", "_id first_name email")
      .populate("timeSlot");

    if (!populatedBooking) {
      return res
        .status(404)
        .json(new ApiResponse(404, "Booking not found after creation."));
    }

    await sendBookingConfirmationEmail({
      to: populatedBooking.customer.email,
      subject: "Booking Confirmed!",
      bookingData: {
        customerName: populatedBooking.customer.first_name,
        petName: populatedBooking.pet.petName,
        serviceType: populatedBooking.serviceType.name,
        subService: populatedBooking.subService.name,
        date: new Date(populatedBooking.date).toDateString(),
        time: new Date(
          populatedBooking.timeSlot.startTime
        ).toLocaleTimeString(),
        groomerName: populatedBooking.groomer.first_name,
      },
    });

    // Notify customer
    await NotificationService.sendToCustomer({
      userId: populatedBooking.customer._id,
      title: "Booking Confirmed 🎉",
      message: `Your booking for ${
        populatedBooking.subService.name
      } on ${new Date(populatedBooking.date).toDateString()} at ${new Date(
        populatedBooking.timeSlot.startTime
      ).toLocaleTimeString()} has been confirmed.`,
      type: "Booking",
    });

    // Notify groomer
    await NotificationService.sendToGroomer({
      userId: populatedBooking.groomer._id,
      title: "New Booking Assigned 📅",
      message: `You have a new booking for ${
        populatedBooking.subService.name
      } on ${new Date(populatedBooking.date).toDateString()} at ${new Date(
        populatedBooking.timeSlot.startTime
      ).toLocaleTimeString()}.`,
      type: "Booking",
    });
    // console.log("newBooking--------------------------------->",populatedBooking);
    // console.log("email payload---------------------------->",emailPayload);

    return res
      .status(201)
      .json(new ApiResponse(201, newBooking, "Booking created successfully"));
  } catch (error) {
    console.error("Create Booking Error:", error);
    res.status(500).json(new ApiError(500, "Failed to create booking"));
  }
});

//update booking status

const updateManualBooking = asyncHandler(async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { groomerId, date, timeSlotId, subServiceId } = req.body;

    // console.log("req.body---------------------------------------->",req.body);
    // console.log("req.params-------------------------------------->",req.params.bookingId);

    if (!groomerId || !timeSlotId || !date || !subServiceId) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            "Groomer, TimeSlot, Date and SubService are required"
          )
        );
    }

    // Fetch the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json(new ApiResponse(404, "Booking not found"));
    }

    // Fetch timeslot details
    const timeslot = await TimeSlot.findById(timeSlotId);
    if (!timeslot) {
      return res.status(404).json(new ApiResponse(404, "TimeSlot not found"));
    }

    const newBookingKey = `${new Date(
      timeslot.startTime
    ).toISOString()}_${groomerId.toString()}`;

    const usedKeys = new Set();

    // Fetch existing OrderDetails for the date
    const orderDetails = await OrderDetails.find()
      .populate("order")
      .populate("groomer")
      .select("first_name last_name phone_number email")
      .populate("orderDetails.timeslot")
      .lean();

    for (const detail of orderDetails) {
      if (!detail.timeslot) continue;
      const orderDate = new Date(detail.timeslot.bookingDate)
        .toISOString()
        .split("T")[0];
      const reqDate = new Date(date).toISOString().split("T")[0];
      if (orderDate !== reqDate) continue;

      const key = `${new Date(detail.timeslot.startTime).toISOString()}_${
        detail.groomer?._id?.toString() || ""
      }`;
      usedKeys.add(key);
    }

    // Fetch existing Bookings for the date (excluding this one)
    const existingBookings = await Booking.find({
      date: new Date(date),
      _id: { $ne: bookingId },
    })
      .populate("timeSlot")
      .populate("groomer")
      .lean();

    for (const b of existingBookings) {
      if (!b.timeSlot) continue;
      const key = `${new Date(b.timeSlot.startTime).toISOString()}_${
        b.groomer?._id?.toString() || ""
      }`;
      usedKeys.add(key);
    }

    // Check conflict
    if (usedKeys.has(newBookingKey)) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "This groomer is already assigned to the selected timeslot on this date."
          )
        );
    }

    // If no conflict, update booking
    booking.groomer = groomerId;
    booking.date = new Date(date);
    booking.timeSlot = timeSlotId;
    booking.subService = subServiceId;

    await booking.save();

    // Populate updated booking for email
    const populatedBooking = await Booking.findById(bookingId)
      .populate("customer", "_id first_name email")
      .populate("pet", "petName")
      .populate("serviceType", "name")
      .populate("subService", "name")
      .populate("groomer", "_id first_name email")
      .populate("timeSlot");

    if (!populatedBooking) {
      return res
        .status(404)
        .json(new ApiResponse(404, "Booking not found after update."));
    }

    // Send update confirmation email
    await sendBookingConfirmationEmail({
      to: populatedBooking.customer.email,
      subject: "Booking Updated!",
      bookingData: {
        customerName: populatedBooking.customer.first_name,
        petName: populatedBooking.pet.petName,
        serviceType: populatedBooking.serviceType.name,
        subService: populatedBooking.subService.name,
        date: new Date(populatedBooking.date).toDateString(),
        time: new Date(
          populatedBooking.timeSlot.startTime
        ).toLocaleTimeString(),
        groomerName: populatedBooking.groomer.first_name,
      },
    });

    // Notify customer
    await NotificationService.sendToCustomer({
      userId: populatedBooking.customer._id,
      title: "Booking Confirmed 🎉",
      message: `Your booking for ${
        populatedBooking.subService.name
      } on ${new Date(populatedBooking.date).toDateString()} at ${new Date(
        populatedBooking.timeSlot.startTime
      ).toLocaleTimeString()} has been confirmed.`,
      type: "Booking",
    });

    // Notify groomer
    await NotificationService.sendToGroomer({
      userId: populatedBooking.groomer._id,
      title: "New Booking Assigned 📅",
      message: `You have a new booking for ${
        populatedBooking.subService.name
      } on ${new Date(populatedBooking.date).toDateString()} at ${new Date(
        populatedBooking.timeSlot.startTime
      ).toLocaleTimeString()}.`,
      type: "Booking",
    });
    return res
      .status(200)
      .json(new ApiResponse(200, booking, "Booking updated successfully"));
  } catch (error) {
    console.error("Update Booking Error:", error);
    res.status(500).json(new ApiError(500, "Failed to update booking"));
  }
});

const getAllBookings = asyncHandler(async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate({
        path: "customer",
        select: "-otp -otp_time -password -refreshToken",
      })
      .populate({
        path: "pet",
        populate: [
          {
            path: "breed",
          },
          {
            path: "petType",
          },
        ],
      })
      .populate("serviceType")
      .populate("subService")
      .populate("timeSlot")
      .populate("groomer");

    const response = new ApiResponse(
      200,
      bookings,
      "Bookings fetched successfully"
    );
    res.status(200).json(response);
  } catch (error) {
    const response = new ApiError(500, "Internal Server Error", error.message);
    res.status(500).json(response);
  }
});

//get booking by id
// const getBookingById = asyncHandler(async (req, res) => {
//     try {
//         const { bookingId } = req.params;

//         const booking = await Booking.findById(bookingId)
//             .populate('customer')
//             .populate('pet')
//             .populate('serviceType')
//             .populate('subService')
//             .populate('timeSlotId')
//             .populate('groomer');

//         if (!booking) {
//             throw new ApiError(404, 'Booking not found');
//         }

//         const response = new ApiResponse(200, booking, 'Booking fetched successfully' );
//         res.status(200).json(response);
//     } catch (error) {
//         const response = new ApiError(500, 'Internal Server Error', error.message);
//         res.status(500).json(response);
//     }
// });

//delete booking
const deleteBooking = asyncHandler(async (req, res) => {
  try {
    const { bookingId } = req.params;

    const deletedBooking = await Booking.findByIdAndDelete(bookingId);

    if (!deletedBooking) {
      throw new ApiError(404, "Booking not found");
    }

    const response = new ApiResponse(
      200,
      deletedBooking,
      "Booking deleted successfully"
    );
    res.status(200).json(response);
  } catch (error) {
    const response = new ApiError(500, "Internal Server Error", error.message);
    res.status(500).json(response);
  }
});

//confirm timeslot booking
const confirmTimeslotBooking = asyncHandler(async (req, res) => {
  try {
    const { timeslotId } = req.params;
    const { customerId, groomerId } = req.body;

    const timeslot = await TimeSlot.findById(timeslotId);
    if (!timeslot) {
      return res.status(404).json(new ApiError(404, "Timeslot not found"));
    }

    if (timeslot.isBooked) {
      return res
        .status(400)
        .json(new ApiError(400, "Timeslot is already booked"));
    }

    const groomerToCheck = groomerId || timeslot.groomer;
    const bookingStart = new Date(timeslot.startTime);
    const bookingEnd = new Date(timeslot.endTime);

    // 1. Check for conflicting booked timeslots
    const conflictingBooking = await TimeSlot.findOne({
      _id: { $ne: timeslot._id },
      groomer: groomerToCheck,
      isBooked: true,
      bookingDate: timeslot.bookingDate,
      startTime: { $lt: bookingEnd },
      endTime: { $gt: bookingStart },
    });

    if (conflictingBooking) {
      return res
        .status(400)
        .json(
          new ApiError(400, "Groomer has a conflicting booking at this time")
        );
    }

    // 2. Check for groomer or office-wide holiday
    const holiday = await Holiday.findOne({
      startDate: { $lte: bookingStart },
      endDate: { $gte: bookingStart },
      $or: [
        { groomer: groomerToCheck },
        { groomer: null }, // office-wide holiday
      ],
    });

    if (holiday) {
      return res
        .status(400)
        .json(new ApiError(400, "Cannot book — it's a holiday"));
    }

    // 3. Confirm booking
    timeslot.customer = customerId;
    timeslot.groomer = groomerToCheck;
    timeslot.isBooked = true;

    await timeslot.save();

    return res
      .status(200)
      .json(new ApiResponse(200, timeslot, "Timeslot booking confirmed"));
  } catch (error) {
    console.error("Error------", error);
    return res
      .status(500)
      .json(
        new ApiError(500, error.message || "Failed to confirm timeslot booking")
      );
  }
});

//subscription booking
// Create a new booking
// const createSubscriptionBooking = asyncHandler(async (req, res) => {
//   const { subscription, discountedAmount } = req.body;
//   const customer = req.user._id;

//   if (!subscription) {
//     throw new ApiError(400, "Subscription ID is required");
//   }

//   // Fetch the subscription details
//   const foundSubscription = await Subscription.findById(subscription);
//   if (!foundSubscription) {
//     throw new ApiError(404, "Subscription not found");
//   }

//   // Validate the subscription has a valid date range
//   if (
//     !Array.isArray(foundSubscription.date) ||
//     foundSubscription.date.length < 2
//   ) {
//     throw new ApiError(400, "Subscription date range is invalid");
//   }

//   const expiryDate = new Date(foundSubscription.date[1]);
//   const today = new Date();

//   // Check if the subscription has expired
//   if (expiryDate < today) {
//     throw new ApiError(400, "This subscription has already expired");
//   }

//   // Check if the user has already booked this specific subscription
//   const existingBooking = await SubscriptionBooking.findOne({
//     customer,
//     subscription,
//   });

//   if (existingBooking) {
//     throw new ApiError(400, "You have already booked this subscription");
//   }

//   // Create the booking
//   const newBooking = await SubscriptionBooking.create({
//     subscription,
//     customer,
//     ...(discountedAmount && { discountedAmount }), // only include if sent
//   });

//   // Populate the subscription details in the response
//   const populatedBooking = await SubscriptionBooking.findById(newBooking._id).populate("subscription");

//   return res
//     .status(201)
//     .json(new ApiResponse(201, populatedBooking, "Subscription booked successfully"));
// });

//Create a new booking with notification email feature
const createSubscriptionBooking = asyncHandler(async (req, res) => {
  const { subscription, discountedAmount } = req.body;
  const customer = req.user._id;

  if (!subscription) {
    throw new ApiError(400, "Subscription ID is required");
  }

  // 🔍 1. Fetch the subscription with details
  const foundSubscription = await Subscription.findById(subscription)
    .populate("trainer", "_id first_name email")
    .populate("categoryId", "name")
    .populate("sessionType", "name");

  if (!foundSubscription) {
    throw new ApiError(404, "Subscription not found");
  }

  const isSingleClass = foundSubscription.isSingleClass;

  // 📅 2. Handle date logic based on isSingleClass
  let startDate, endDate;

  if (isSingleClass) {
    if (!foundSubscription.date || !Date.parse(foundSubscription.date)) {
      throw new ApiError(400, "Invalid or missing date for single class");
    }
    startDate = endDate = new Date(foundSubscription.date);
  } else {
    if (!Array.isArray(foundSubscription.date) || foundSubscription.date.length !== 2) {
      throw new ApiError(400, "Date range must be an array of two elements for non-single class");
    }
    startDate = new Date(foundSubscription.date[0]);
    endDate = new Date(foundSubscription.date[1]);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new ApiError(400, "One or both dates in range are invalid");
    }
  }

  const now = new Date();
  if (endDate < now) {
    throw new ApiError(400, "This subscription has already expired");
  }

  // 🔁 3. Prevent duplicate booking
  const existingBooking = await SubscriptionBooking.findOne({
    customer,
    subscription,
  });

  if (existingBooking) {
    throw new ApiError(400, "You have already booked this subscription");
  }

  // 💾 4. Create the booking
  const newBooking = await SubscriptionBooking.create({
    subscription,
    customer,
    ...(discountedAmount && { discountedAmount }),
  });

  // 🧠 5. Populate booking with details
  const populatedBooking = await SubscriptionBooking.findById(newBooking._id)
    .populate("subscription")
    .populate("customer", "_id first_name email");

  // 📧 6. Send confirmation email
  await sendBookingConfirmationEmail({
    to: populatedBooking.customer.email,
    subject: "Subscription Booked Successfully ✅",
    bookingData: {
      customerName: populatedBooking.customer.first_name,
      subscriptionName: foundSubscription.name,
      category: foundSubscription.categoryId?.name,
      sessionType: foundSubscription.sessionType?.name,
      dateRange:
        isSingleClass
          ? startDate.toDateString()
          : `${startDate.toDateString()} - ${endDate.toDateString()}`,
      trainerName: foundSubscription.trainer?.first_name || "TBA",
    },
  });

  // 🔔 7. Notify customer
  await NotificationService.sendToCustomer({
    userId: populatedBooking.customer._id,
    title: "Subscription Booked 🎉",
    message: `You've successfully booked the "${foundSubscription.name}" subscription. Valid from ${startDate.toDateString()} to ${endDate.toDateString()}.`,
    type: "Subscription",
  });

  // 🔔 8. Notify trainer (optional)
  if (foundSubscription.trainer?._id) {
    await NotificationService.sendToTrainer({
      userId: foundSubscription.trainer._id,
      title: "New Subscription Booking 📅",
      message: `A customer has booked your "${foundSubscription.name}" subscription.`,
      type: "Subscription",
    });
  }

  // ✅ 9. Respond
  return res
    .status(201)
    .json(new ApiResponse(201, populatedBooking, "Subscription booked successfully"));
});


// const updateSubscriptionBooking = asyncHandler(async (req, res) => {
//   try {
//     const { bookingId } = req.params;
//     const { subscription } = req.body;

//     if (!subscription) {
//       return res
//         .status(400)
//         .json(new ApiError(400, "Subscription is required"));
//     }

//     const booking = await SubscriptionBooking.findById(bookingId);
//     if (!booking) {
//       return res.status(404).json(new ApiError(404, "Booking not found"));
//     }

//     booking.subscription = subscription;
//     await booking.save();

//     const updatedBooking = await SubscriptionBooking.findById(bookingId)
//       .populate("subscription")
//       .populate("trainer", "first_name email");

//     return res.status(200).json(
//       new ApiResponse(200, updatedBooking, "Subscription updated successfully")
//     );
//   } catch (error) {
//     console.error("Update Subscription Error:", error);
//     res
//       .status(500)
//       .json(new ApiError(500, "Failed to update subscription", error.message));
//   }
// });

const cancelSubscriptionBooking = asyncHandler(async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await SubscriptionBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json(new ApiError(404, "Booking not found"));
    }

    // Optionally: prevent cancelling if already cancelled
    if (booking.status === "cancelled") {
      return res
        .status(400)
        .json(new ApiError(400, "Booking is already cancelled"));
    }

    booking.status = "cancelled";
    await booking.save();

    return res.status(200).json(
      new ApiResponse(200, booking, "Booking cancelled successfully")
    );
  } catch (error) {
    console.error("Cancel Booking Error:", error);
    res.status(500).json(
      new ApiError(500, "Failed to cancel booking", error.message)
    );
  }
});

// Get all bookings (populate trainer, subscription, timeSlot)
const getAllSubscriptionBookings = asyncHandler(async (req, res) => {
  const bookings = await SubscriptionBooking.find()
     .populate({
      path: "subscription",
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

  return res.status(200).json(new ApiResponse(200, bookings, "All bookings fetched"));
});

// Get All Bookings of Logged In Customer
const getCustomerBookings = asyncHandler(async (req, res) => {
  const bookings = await SubscriptionBooking.find({ customer: req.user._id })
    .populate({
      path: "subscription",
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

  res
    .status(200)
    .json(new ApiResponse(200, bookings, "Customer bookings fetched"));
});


// Get Booking by ID
const getBookingById = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const booking = await SubscriptionBooking.findById(bookingId)
    .populate("subscription")
    .populate("first_name email");

  if (!booking) {
    return res.status(404).json(new ApiResponse(404, {}, "Booking not found"));
  }

  res.status(200).json(new ApiResponse(200, booking, "Booking details"));
});

const getSingleSubscriptionByBookingId = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  if (!bookingId) {
    return res.status(400).json(new ApiError(400, "Booking ID is required"));
  }

const booking = await SubscriptionBooking.findById(bookingId)
  .populate({
    path: "subscription",
    select: "_id media price name description startTime endTime", 
    populate: [
      { path: "categoryId", select: "cName" },
      { path: "sessionType", select: "sessionName" },
      // { path: "media", select: "media" },
      { path: "trainer", select: "first_name last_name email" },
      {
        path: "Address", // ⛔️ likely should be lowercase "address"
        select: "streetName landmark country city",
        populate: [
          { path: "country", select: "name" },
          { path: "city", select: "name" }
        ]
      }
    ]
  });


  if (!booking || !booking.subscription) {
    return res.status(404).json(new ApiResponse(404, {}, "Subscription not found for this booking"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, booking, "Subscription fetched successfully from booking ID"));
});

// Get All Subscriptions by Customer/User ID
const getSubscriptionsByUserId = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const bookings = await SubscriptionBooking.find({ customer: userId })
    .populate({
      path: "subscription",
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
    new ApiResponse(200, bookings, "Subscriptions by user fetched")
  );
});

const getExpiredBookingsByCustomer = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const today = new Date();

  // Step 1: Get all bookings with full subscription data
  const bookings = await SubscriptionBooking.find({ customer: customerId })
    .populate({
      path: "subscription",
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

  // Step 2: Filter out expired ones (where subscription.date[1] is before today)
  const expiredBookings = bookings.filter(booking => {
    const dateArray = booking.subscription?.date;
    if (Array.isArray(dateArray) && dateArray.length >= 2) {
      const endDate = new Date(dateArray[1]);
      return endDate < today;
    }
    return false;
  });

  return res.status(200).json(
    new ApiResponse(200, expiredBookings, "Expired subscriptions fetched successfully")
  );
});


// LIST CUSTOMERS FOR A GIVEN SUBSCRIPTION

const getCustomersBySubscriptionId = asyncHandler(async (req, res) => {
  const { subscriptionId } = req.params;

  if (!subscriptionId) {
    throw new ApiError(400, "Subscription ID is required");
  }

  // Find all bookings for this subscription and pull the customer IDs
  const bookings = await SubscriptionBooking.find(
    { subscription: subscriptionId },
    { customer: 1 }                    // projection: only _id and customer
  ).populate({
    path: "customer",
    select: "first_name last_name email phone" // whatever you need
  });

  if (!bookings.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No customers booked this subscription"));
  }

  // Extract the populated customer docs
  const customers = bookings.map(b => b.customer);

  return res
    .status(200)
    .json(new ApiResponse(200, customers, "Customers fetched successfully"));
});



//LIST CUSTOMERS GROUPED BY SUBSCRIPTION

const getAllSubscriptionCustomers = asyncHandler(async (req, res) => {
  // aggregate to avoid N+1 populates when the dataset grows
  const result = await SubscriptionBooking.aggregate([
    {
      $group: {
        _id: "$subscription",
        customers: { $addToSet: "$customer" } // unique customers per sub
      }
    },
    // lookup customer details
    {
      $lookup: {
        from: "users",
        localField: "customers",
        foreignField: "_id",
        as: "customers"
      }
    },
    // lookup subscription details (category, trainer, etc.)
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "_id",
        as: "subscription"
      }
    },
    { $unwind: "$subscription" } // flatten for a nicer shape
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Customers per subscription"));
});

const applyPromoCodeToSubscription = asyncHandler(async (req, res) => {
  const { subscriptionId, promoCode } = req.body;
  const customerId = req.user._id;

  if (!subscriptionId || !promoCode) {
    throw new ApiError(400, "Subscription ID and promo code are required");
  }

  // Fetch subscription
  const subscription = await Subscription.findById(subscriptionId)
    .populate("categoryId")
    .populate("sessionType")
    .populate("trainer")
    .populate({
      path: "Address",
      populate: [
        { path: "country", select: "name" },
        { path: "city", select: "name" }
      ]
    });

  if (!subscription) {
    throw new ApiError(404, "Subscription not found");
  }

  // Validate date range
  if (
    !Array.isArray(subscription.date) ||
    subscription.date.length < 2 ||
    new Date(subscription.date[1]) < new Date()
  ) {
    throw new ApiError(400, "This subscription has already expired or has invalid date");
  }

  const price = parseFloat(subscription.price || 0);

  // Validate promo code
  const promo = await PromoCode.findOne({ code: promoCode, isActive: true });
  if (!promo) {
    throw new ApiError(404, "Promo code not found or inactive");
  }

  const now = new Date();

  if (
    promo.is_validation_date &&
    (
      (promo.startDate && now < promo.startDate) ||
      (promo.endDate && now > promo.endDate)
    )
  ) {
    throw new ApiError(400, "Promo code is expired or not yet active");
  }

  if (promo.usedBy.includes(customerId)) {
    throw new ApiError(400, "You have already used this promo code");
  }

  const maxUses = parseFloat(promo.maxUses?.toString() || "0");
  if (maxUses <= 0) {
    throw new ApiError(400, "Promo code usage limit reached");
  }

  const minOrderAmount = parseFloat(promo.minOrderAmount?.toString() || "0");
  if (price < minOrderAmount) {
    throw new ApiError(400, `Minimum order amount ₹${minOrderAmount} required for this promo code`);
  }

  // ✅ Calculate discount
  const discountValue = parseFloat(promo.discountValue?.toString() || "0");
  let discountAmount = 0;

  if (promo.discountType === "Percentage") {
    discountAmount = (price * discountValue) / 100;

    const maxDiscount = parseFloat(promo.maxDiscountAmount?.toString() || "0");
    if (maxDiscount > 0 && discountAmount > maxDiscount) {
      discountAmount = maxDiscount;
    }
  } else if (promo.discountType === "Fixed_Amount") {
    discountAmount = Math.min(discountValue, price);
  }

  const finalPrice = price - discountAmount;

  return res.status(200).json(
    new ApiResponse(200, {
      subscription,
      promoCodeId: promo._id,
      breakdown: {
        originalPrice: price.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        finalPrice: finalPrice.toFixed(2),
      },
      promoDetails: {
        code: promo.code,
        discountType: promo.discountType,
        discountValue: discountValue,
        maxDiscountAmount: parseFloat(promo.maxDiscountAmount?.toString() || "0"),
        termsAndConditions: promo.termsAndConditions,
      }
    }, "Promo code applied successfully")
  );
});

const markSubscriptionAttendance = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const { bookingId, subscriptionId, coordinates } = req.body; // [lng, lat]

  if (!bookingId || !subscriptionId || !Array.isArray(coordinates)) {
    throw new ApiError(400, "Missing bookingId, subscriptionId, or coordinates");
  }

  // 1️⃣ Find the booking and populate nested subscription + address
  const booking = await SubscriptionBooking.findOne({
    _id: bookingId,
    customer: customerId,
    subscription: subscriptionId,
  }).populate({
    path: "subscription",
    populate: [
      {
        path: "Address", // ✅ lowercase, as defined in subscriptionSchema
        select: "streetName landmark country city location",
        populate: [
          { path: "country", select: "name" },
          { path: "city", select: "name" },
        ],
      },
    ],
  });

  if (!booking) {
    throw new ApiError(404, "Subscription booking not found");
  }

  // 2️⃣ Check if already attended
  if (booking.attended) {
    throw new ApiError(400, "You have already marked attendance");
  }

  const subscription = booking.subscription;

  // 3️⃣ Validate Date and Time
  const now = new Date();
  const [startDateStr, endDateStr] = subscription.date || [];
  const startDate = startDateStr ? new Date(startDateStr) : null;
  const endDate = endDateStr ? new Date(endDateStr) : null;

  if (!startDate || !endDate) {
    throw new ApiError(400, "Subscription has invalid date range");
  }

  if (now < startDate || now > endDate) {
    throw new ApiError(400, "This subscription is not valid today");
  }

  const nowTime = now.getHours() * 60 + now.getMinutes();
  const startTime = getMinutesFromTimeString(subscription.startTime);
  const endTime = getMinutesFromTimeString(subscription.endTime);

  if (nowTime < startTime - 30 || nowTime > endTime + 30) {
    throw new ApiError(
      400,
      "Attendance allowed only within 30 minutes before or after class time"
    );
  }

  // 4️⃣ Distance Check
  const classCoords = subscription?.Address?.location?.coordinates;
  if (!classCoords || classCoords.length !== 2) {
    throw new ApiError(400, "Class location coordinates not available");
  }

  const distance = calculateDistance(coordinates, classCoords);
  if (distance > PROXIMITY_THRESHOLD_KM) {
    throw new ApiError(
      403,
      `You are too far from the class location (Distance: ${distance.toFixed(2)} km)`
    );
  }

  // 5️⃣ Mark Attendance
  booking.attended = true;
  booking.attendedAt = new Date();
  await booking.save();

  return res
    .status(200)
    .json(new ApiResponse(200, booking, "Attendance marked successfully"));
});



export {
  markSubscriptionAttendance,
  getExpiredBookingsByCustomer,
  getCustomersBySubscriptionId,
  getAllSubscriptionCustomers,
  getSubscriptionsByUserId,
  getAllSubscriptionBookings,
  createSubscriptionBooking,
  // updateSubscriptionBooking,
  applyPromoCodeToSubscription,
  cancelSubscriptionBooking,
  getCustomerBookings,
  getBookingById,
getSingleSubscriptionByBookingId,
  createManualBooking,
  updateManualBooking,
  getAllBookings,
  deleteBooking,
  confirmTimeslotBooking,
};
