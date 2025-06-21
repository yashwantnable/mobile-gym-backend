import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Booking } from "../../models/booking.model.js";
import { TimeSlot } from "../../models/timeslot.model.js";
import { Holiday } from "../../models/holiday.model.js";
import {OrderDetails} from "../../models/order.model.js"
import {sendEmail, sendBookingConfirmationEmail} from "../../utils/email.helper.js"
import NotificationService from "../../messaging_feature/services/NotificationService.js";

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
      return res.status(400).json(new ApiResponse(400, "Groomer, TimeSlot, and Date are required"));
    }

    // Fetch the timeslot details
    const timeslot = await TimeSlot.findById(timeSlotId);
    if (!timeslot) {
      return res.status(404).json(new ApiResponse(404, "TimeSlot not found"));
    }

    const newBookingKey = `${new Date(timeslot.startTime).toISOString()}_${groomerId.toString()}`;

    const usedKeys = new Set();

    // 1️⃣ Fetch existing OrderDetails for the date
    const orderDetails = await OrderDetails.find()
      .populate('order')
      .populate('groomer').select("first_name last_name phone_number email")
      .populate('orderDetails.timeslot')
      .lean();

    //   console.log("OrderDetails------------------>",orderDetails);
      
    for (const detail of orderDetails) {
      if (!detail.timeslot) continue;
      const orderDate = new Date(detail.timeslot.bookingDate).toISOString().split('T')[0];
      const reqDate = new Date(date).toISOString().split('T')[0];
      if (orderDate !== reqDate) continue;

      const key = `${new Date(detail.timeslot.startTime).toISOString()}_${detail.groomer?._id?.toString() || ""}`;
      usedKeys.add(key);
    }

    // 2️⃣ Fetch existing Bookings for the date
    const existingBookings = await Booking.find({
      date: new Date(date)
    })
      .populate('timeSlot')
      .populate('groomer')
      .lean();

    for (const booking of existingBookings) {
      if (!booking.timeSlot) continue;
      const key = `${new Date(booking.timeSlot.startTime).toISOString()}_${booking.groomer?._id?.toString() || ""}`;
      usedKeys.add(key);
    }

    // 3️⃣ Check for conflict
    if (usedKeys.has(newBookingKey)) {
      return res.status(400).json(
        new ApiResponse(400, {},"This groomer is already assigned to the selected timeslot on this date.")
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
      return res.status(404).json(new ApiResponse(404, "Booking not found after creation."));
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
    time: new Date(populatedBooking.timeSlot.startTime).toLocaleTimeString(),
    groomerName: populatedBooking.groomer.first_name
  }
});

// Notify customer
await NotificationService.sendToCustomer({
  userId: populatedBooking.customer._id,
  title: "Booking Confirmed 🎉",
  message: `Your booking for ${populatedBooking.subService.name} on ${new Date(populatedBooking.date).toDateString()} at ${new Date(populatedBooking.timeSlot.startTime).toLocaleTimeString()} has been confirmed.`,
  type: "Booking",
});

// Notify groomer
await NotificationService.sendToGroomer({
  userId: populatedBooking.groomer._id,
  title: "New Booking Assigned 📅",
  message: `You have a new booking for ${populatedBooking.subService.name} on ${new Date(populatedBooking.date).toDateString()} at ${new Date(populatedBooking.timeSlot.startTime).toLocaleTimeString()}.`,
  type: "Booking",
});
    // console.log("newBooking--------------------------------->",populatedBooking);
    // console.log("email payload---------------------------->",emailPayload);
    
    return res.status(201).json(
      new ApiResponse(201, newBooking, "Booking created successfully")
    );

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
      return res.status(400).json(new ApiResponse(400, "Groomer, TimeSlot, Date and SubService are required"));
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

    const newBookingKey = `${new Date(timeslot.startTime).toISOString()}_${groomerId.toString()}`;

    const usedKeys = new Set();

    // Fetch existing OrderDetails for the date
    const orderDetails = await OrderDetails.find()
      .populate('order')
      .populate('groomer').select("first_name last_name phone_number email")
      .populate('orderDetails.timeslot')
      .lean();

    for (const detail of orderDetails) {
      if (!detail.timeslot) continue;
      const orderDate = new Date(detail.timeslot.bookingDate).toISOString().split('T')[0];
      const reqDate = new Date(date).toISOString().split('T')[0];
      if (orderDate !== reqDate) continue;

      const key = `${new Date(detail.timeslot.startTime).toISOString()}_${detail.groomer?._id?.toString() || ""}`;
      usedKeys.add(key);
    }

    // Fetch existing Bookings for the date (excluding this one)
    const existingBookings = await Booking.find({
      date: new Date(date),
      _id: { $ne: bookingId }
    })
      .populate('timeSlot')
      .populate('groomer')
      .lean();

    for (const b of existingBookings) {
      if (!b.timeSlot) continue;
      const key = `${new Date(b.timeSlot.startTime).toISOString()}_${b.groomer?._id?.toString() || ""}`;
      usedKeys.add(key);
    }

    // Check conflict
    if (usedKeys.has(newBookingKey)) {
      return res.status(400).json(
        new ApiResponse(400, {}, "This groomer is already assigned to the selected timeslot on this date.")
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
      return res.status(404).json(new ApiResponse(404, "Booking not found after update."));
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
        time: new Date(populatedBooking.timeSlot.startTime).toLocaleTimeString(),
        groomerName: populatedBooking.groomer.first_name
      }
    });

        // Notify customer
    await NotificationService.sendToCustomer({
      userId: populatedBooking.customer._id,
      title: "Booking Confirmed 🎉",
      message: `Your booking for ${populatedBooking.subService.name} on ${new Date(populatedBooking.date).toDateString()} at ${new Date(populatedBooking.timeSlot.startTime).toLocaleTimeString()} has been confirmed.`,
      type: "Booking",
    });

// Notify groomer
    await NotificationService.sendToGroomer({
      userId: populatedBooking.groomer._id,
      title: "New Booking Assigned 📅",
      message: `You have a new booking for ${populatedBooking.subService.name} on ${new Date(populatedBooking.date).toDateString()} at ${new Date(populatedBooking.timeSlot.startTime).toLocaleTimeString()}.`,
      type: "Booking",
    });
    return res.status(200).json(
      new ApiResponse(200, booking, "Booking updated successfully")
    );

  } catch (error) {
    console.error("Update Booking Error:", error);
    res.status(500).json(new ApiError(500, "Failed to update booking"));
  }
});

const getAllBookings = asyncHandler(async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate({
                path: 'customer',
                select: '-otp -otp_time -password -refreshToken' 
            })
            .populate({
                path: 'pet',
                populate: [
                    {
                        path: 'breed', 
                    },
                    {
                        path: 'petType', 
                    }
                ]
            })
            .populate('serviceType')
            .populate('subService')
            .populate('timeSlot')
            .populate('groomer');

        const response = new ApiResponse(200, bookings, 'Bookings fetched successfully');
        res.status(200).json(response);
    } catch (error) {
        const response = new ApiError(500, 'Internal Server Error', error.message);
        res.status(500).json(response);
    }
});


//get booking by id
const getBookingById = asyncHandler(async (req, res) => {
    try {
        const { bookingId } = req.params;

        const booking = await Booking.findById(bookingId)
            .populate('customer')
            .populate('pet')
            .populate('serviceType')
            .populate('subService')
            .populate('timeSlotId')
            .populate('groomer');

        if (!booking) {
            throw new ApiError(404, 'Booking not found');
        }

        const response = new ApiResponse(200, booking, 'Booking fetched successfully' );
        res.status(200).json(response);
    } catch (error) {
        const response = new ApiError(500, 'Internal Server Error', error.message);
        res.status(500).json(response);
    }
});


//delete booking
const deleteBooking = asyncHandler(async (req, res) => {
    try {
        const { bookingId } = req.params;

        const deletedBooking = await Booking.findByIdAndDelete(bookingId);

        if (!deletedBooking) {
            throw new ApiError(404, 'Booking not found');
        }

        const response = new ApiResponse(200, deletedBooking,  'Booking deleted successfully');
        res.status(200).json(response);
    } catch (error) {
        const response = new ApiError(500, 'Internal Server Error', error.message);
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
      return res.status(400).json(new ApiError(400, "Timeslot is already booked"));
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
      return res.status(400).json(new ApiError(400, "Groomer has a conflicting booking at this time"));
    }

    // 2. Check for groomer or office-wide holiday
    const holiday = await Holiday.findOne({
      startDate: { $lte: bookingStart },
      endDate: { $gte: bookingStart },
      $or: [
        { groomer: groomerToCheck },
        { groomer: null }, // office-wide holiday
      ]
    });

    if (holiday) {
      return res.status(400).json(new ApiError(400, "Cannot book — it's a holiday"));
    }

    // 3. Confirm booking
    timeslot.customer = customerId;
    timeslot.groomer = groomerToCheck;
    timeslot.isBooked = true;

    await timeslot.save();

    return res.status(200).json(new ApiResponse(200, timeslot, "Timeslot booking confirmed"));

  } catch (error) {
    console.error("Error------", error);
    return res.status(500).json(new ApiError(500, error.message || "Failed to confirm timeslot booking"));
  }
});


export {
    createManualBooking,
    updateManualBooking,
    getAllBookings,
    getBookingById,
    deleteBooking,
    confirmTimeslotBooking
};
