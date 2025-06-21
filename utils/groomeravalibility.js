import { TimeSlot } from "../models/timeslot.model.js";
import { Holiday } from "../models/holiday.model.js";
import { Booking } from "../models/booking.model.js";

async function isGroomerAvailable({ groomerId, date, startTime, endTime, excludeSlotId = null, excludeBookingId = null }) {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  // 1. Check if the groomer or the office is on holiday
  const onHoliday = await Holiday.exists({
    $or: [
      { groomer: null }, // Office-wide holiday
      { groomer: groomerId },
    ],
    startDate: { $lte: normalizedDate },
    endDate: { $gte: normalizedDate },
  });

  if (onHoliday) {
    return false;
  }

  // 2. Check for overlapping time slots (optional slots defined by admin)
  const timeslotQuery = {
    groomer: groomerId,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };

  if (excludeSlotId) {
    timeslotQuery._id = { $ne: excludeSlotId };
  }

  const overlappingSlot = await TimeSlot.findOne(timeslotQuery);
  if (overlappingSlot) {
    return false;
  }

  // 3. Check for overlapping bookings
  const bookingQuery = {
    groomer: groomerId,
    date: normalizedDate,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };

  if (excludeBookingId) {
    bookingQuery._id = { $ne: excludeBookingId };
  }

  const overlappingBooking = await Booking.findOne(bookingQuery);
  if (overlappingBooking) {
    return false;
  }

  return true;
}

export { isGroomerAvailable };
