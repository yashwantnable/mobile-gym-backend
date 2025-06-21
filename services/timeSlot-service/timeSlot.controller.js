import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { SubServiceType } from "../../models/subService.model.js";
import { Holiday } from "../../models/holiday.model.js";
import { TimeSlot } from "../../models/timeslot.model.js";
import { User } from "../../models/user.model.js";
import {OrderDetails} from "../../models/order.model.js"
import { isGroomerAvailable } from "../../utils/groomeravalibility.js";
import mongoose from "mongoose";

const getDefaultDuration = (subServiceName) => {
  switch (subServiceName.toLowerCase()) {
    case "basic":
      return 60;
    case "full":
      return 90;
    case "royal":
      return 120;
    default:
      return 60;
  }
};


const calculateEndTime = (startTime, duration, travelTime = 0) => {
  const totalMinutes = duration + travelTime;
  return new Date(new Date(startTime).getTime() + totalMinutes * 60000);
};

// const createTimeslot = asyncHandler(async (req, res) => {
//   console.log("Incoming Request Body ➝", req.body);

//   try {
//     const {
//       startTime,
//       subserviceId,
//       groomerId,
//       bookingDate,
//       subserviceName,
//       startDate,
//       endDate,
//       specificDate = false,
//       travelTime: payloadTravelTime,
//       customDuration: payloadCustomDuration
//     } = req.body;

//     if (!startTime || !subserviceId || (!bookingDate && !startDate && !endDate && !subserviceName)) {
//       return res.status(400).json(new ApiError(400, "Missing required fields"));
//     }

//     // const subService = await SubServiceType.findById(subserviceId);
//     const subService = await SubServiceType.find({ name: subserviceName });
//     // console.log("subService-------->",subService.name);
    
//     if (!subService) {
//       return res.status(404).json(new ApiError(404, "Sub Service Type not found"));
//     }

//     const defaultDuration = getDefaultDuration(subService.name);
//     // console.log("defaultDuration-------------------->",defaultDuration);
    
//     const duration = payloadCustomDuration != null ? payloadCustomDuration : defaultDuration;

//     const travelTime = payloadTravelTime != null ? payloadTravelTime : 30;

//     const normalizeDate = (dateInput) => {
//       const d = new Date(dateInput);
//       d.setUTCHours(0, 0, 0, 0);
//       return d;
//     };

//     const buildHolidayQuery = (date) => {
//       const query = {
//         bookingDate: normalizeDate(date),
//         isHoliday: true
//       };
//       if (groomerId) {
//         query.$or = [{ groomer: null }, { groomer: groomerId }];
//       } else {
//         query.groomer = null;
//       }
//       return query;
//     };

//     // ─────────── SPECIFIC DATE CASE ───────────
//     if (specificDate) {
//       const normalizedBookingDate = normalizeDate(bookingDate);
//       const holidayCheck = await TimeSlot.findOne(buildHolidayQuery(normalizedBookingDate));
//       if (holidayCheck) {
//         return res.status(400).json(new ApiError(400, "Cannot create timeslot on a holiday"));
//       }
      
//       const overlapCheck = await TimeSlot.findOne({
//         bookingDate: normalizedBookingDate,
//         startTime: { $lt: new Date(startTime).getTime() + duration * 60 * 1000 },
//         endTime: { $gt: new Date(startTime).getTime() },
//         subservice: subserviceId,
//         groomer: groomerId ? groomerId : { $exists: true }
//       });

//       if (overlapCheck) {
//         return res.status(400).json(new ApiError(400, "Timeslot overlaps with an existing one"));
//       }

//       const timeslotData = {
//         startTime,
//         duration,
//         travelTime,
//         endTime: calculateEndTime(startTime, duration, travelTime),
//         subservice: subserviceId,
//         bookingDate: normalizedBookingDate,
//         specificDate,
//         subserviceName,
//         customDuration: payloadCustomDuration
//       };
//       if (groomerId) timeslotData.groomer = groomerId;

//       const timeslot = new TimeSlot(timeslotData);
//       await timeslot.save();

//       return res.status(201).json(new ApiResponse(201, timeslot, "Timeslot created for specific date"));
//     }

//     // ─────────── DATE RANGE CASE ───────────
//     const timeslots = [];
//     let date = normalizeDate(startDate);
//     const lastDate = normalizeDate(endDate);

//     while (date <= lastDate) {
//       const holidayCheck = await TimeSlot.findOne(buildHolidayQuery(date));
//       if (holidayCheck) {
//         date.setDate(date.getDate() + 1);
//         continue;
//       }

//       const slotStartTime = new Date(date);
//       slotStartTime.setUTCHours(
//         new Date(startTime).getUTCHours(),
//         new Date(startTime).getUTCMinutes(),
//         0, 0
//       );

//       // console.log("Checking overlap for ➝", {
//       //   date: normalizeDate(date),
//       //   startTime: slotStartTime.getTime(),
//       //   endTime: slotStartTime.getTime() + duration * 60 * 1000,
//       //   subservice: subserviceId
//       // });

//       const overlapCheck = await TimeSlot.findOne({
//         bookingDate: normalizeDate(date),
//         startTime: { $lt: slotStartTime.getTime() + duration * 60 * 1000 },
//         endTime: { $gt: slotStartTime.getTime() },
//         subservice: subserviceId,
//         groomer: groomerId ? groomerId : { $exists: true }
//       });

//       if (overlapCheck) {
//         date.setDate(date.getDate() + 1);
//         continue;
//       }

//       const timeslotData = {
//         startTime: slotStartTime,
//         duration,
//         travelTime,
//         endTime: calculateEndTime(slotStartTime, duration, travelTime),
//         subservice: subserviceId,
//         bookingDate: new Date(date),
//         specificDate,
//         subserviceName,
//         customDuration: payloadCustomDuration
//       };
//       if (groomerId) timeslotData.groomer = groomerId;

//       const timeslot = new TimeSlot(timeslotData);
//       timeslots.push(timeslot);

//       date.setDate(date.getDate() + 1);
//     }

//     if (timeslots.length === 0) {
//       return res.status(400).json(new ApiError(400, "No timeslots created — all dates are holidays or overlaps detected"));
//     }

//     const createdTimeslots = await TimeSlot.insertMany(timeslots);

//     return res.status(201).json(new ApiResponse(201, createdTimeslots, "Timeslots created for date range"));

//   } catch (error) {
//     console.error("Error creating timeslot(s) ➝", error);
//     return res.status(400).json(new ApiError(400, error.message || error, "Error creating timeslot(s)"));
//   }
// });

/**--- */

// const createTimeslot = asyncHandler(async (req, res) => {
//   console.log("Incoming Request Body ➝", req.body);

//   try {
//     const {
//       startTime,
//       subserviceId,
//       groomerId,
//       bookingDate,
//       subserviceName,
//       startDate,
//       endDate,
//       specificDate = false,
//       travelTime: payloadTravelTime,
//       customDuration: payloadCustomDuration
//     } = req.body;

//     if (!startTime || !subserviceId ||!subserviceName || (!bookingDate && !startDate && !endDate)) {
//       return res.status(400).json(new ApiError(400, "Missing required fields"));
//     }

//     // Get all subservices with the given name
//     const subServices = await SubServiceType.find({ name: subserviceName });

//     if (!subServices.length) {
//       return res.status(404).json(new ApiError(404, "No Sub Service Types found with given name"));
//     }

//     const defaultDuration = getDefaultDuration(subserviceName);
//     const duration = payloadCustomDuration != null ? payloadCustomDuration : defaultDuration;
//     const travelTime = payloadTravelTime != null ? payloadTravelTime : 30;

//     const normalizeDate = (dateInput) => {
//       const d = new Date(dateInput);
//       d.setUTCHours(0, 0, 0, 0);
//       return d;
//     };

//     const buildHolidayQuery = (date) => {
//       const query = {
//         bookingDate: normalizeDate(date),
//         isHoliday: true
//       };
//       if (groomerId) {
//         query.$or = [{ groomer: null }, { groomer: groomerId }];
//       } else {
//         query.groomer = null;
//       }
//       return query;
//     };

//     // SPECIFIC DATE CASE
//     if (specificDate) {
//       const normalizedBookingDate = normalizeDate(bookingDate);

//       for (const subService of subServices) {
//         const holidayCheck = await TimeSlot.findOne(buildHolidayQuery(normalizedBookingDate));
//         if (holidayCheck) continue;

//         const overlapCheck = await TimeSlot.findOne({
//           bookingDate: normalizedBookingDate,
//           startTime: { $lt: new Date(startTime).getTime() + duration * 60 * 1000 },
//           endTime: { $gt: new Date(startTime).getTime() },
//           subservice: subService._id,
//           groomer: groomerId ? groomerId : { $exists: true }
//         });

//         if (overlapCheck) continue;

//         const timeslotData = {
//           startTime,
//           duration,
//           travelTime,
//           endTime: calculateEndTime(startTime, duration, travelTime),
//           subservice: subService._id,
//           bookingDate: normalizedBookingDate,
//           specificDate,
//           subserviceName: subserviceName,
//           customDuration: payloadCustomDuration
//         };
//         if (groomerId) timeslotData.groomer = groomerId;

//         const timeslot = new TimeSlot(timeslotData);
//         await timeslot.save();
//       }

//       return res.status(201).json(new ApiResponse(201, null, "Timeslots created for specific date"));
//     }

//     // DATE RANGE CASE
//     const timeslots = [];
//     let date = normalizeDate(startDate);
//     const lastDate = normalizeDate(endDate);

//     while (date <= lastDate) {
//       for (const subService of subServices) {
//         const holidayCheck = await TimeSlot.findOne(buildHolidayQuery(date));
//         if (holidayCheck) continue;

//         const slotStartTime = new Date(date);
//         slotStartTime.setUTCHours(
//           new Date(startTime).getUTCHours(),
//           new Date(startTime).getUTCMinutes(),
//           0, 0
//         );

//         const overlapCheck = await TimeSlot.findOne({
//           bookingDate: normalizeDate(date),
//           startTime: { $lt: slotStartTime.getTime() + duration * 60 * 1000 },
//           endTime: { $gt: slotStartTime.getTime() },
//           subservice: subService._id,
//           groomer: groomerId ? groomerId : { $exists: true }
//         });

//         if (overlapCheck) continue;

//         const timeslotData = {
//           startTime: slotStartTime,
//           duration,
//           travelTime,
//           endTime: calculateEndTime(slotStartTime, duration, travelTime),
//           subservice: subService._id,
//           bookingDate: new Date(date),
//           specificDate,
//           subserviceName: subserviceName,
//           customDuration: payloadCustomDuration
//         };
//         if (groomerId) timeslotData.groomer = groomerId;

//         const timeslot = new TimeSlot(timeslotData);
//         timeslots.push(timeslot);
//       }

//       date.setDate(date.getDate() + 1);
//     }

//     if (!timeslots.length) {
//       return res.status(400).json(new ApiError(400, "No timeslots created — all dates are holidays or overlaps detected"));
//     }

//     const createdTimeslots = await TimeSlot.insertMany(timeslots);

//     return res.status(201).json(new ApiResponse(201, createdTimeslots, "Timeslots created for date range"));

//   } catch (error) {
//     console.error("Error creating timeslot(s) ➝", error);
//     return res.status(400).json(new ApiError(400, error.message || error, "Error creating timeslot(s)"));
//   }
// });

/**------ */

// const createTimeslot = asyncHandler(async (req, res) => {
//   const {
//     startTime,
//     subserviceName,  // now this is the key input to match subservices
//     groomerId,
//     bookingDate,
//     startDate,
//     endDate,
//     specificDate = false,
//     travelTime: payloadTravelTime,
//     customDuration: payloadCustomDuration
//   } = req.body;

//   if (!startTime || !subserviceName || (!bookingDate && !startDate && !endDate)) {
//     return res.status(400).json(new ApiError(400, "Missing required fields"));
//   }

//   // Fetch all subservices matching this name (across all services)
//   const subServices = await SubServiceType.find({ name: subserviceName });

//   if (!subServices.length) {
//     return res.status(404).json(new ApiError(404, `No subservices found with name ${subserviceName}`));
//   }

//   const getDefaultDuration = (name) => {
//     switch (name) {
//       case "basic":
//         return 60;
//       case "full":
//         return 90;
//       case "royal":
//         return 120;
//       default:
//         return 60;
//     }
//   };

//   const defaultDuration = getDefaultDuration(subserviceName);
//   const duration = payloadCustomDuration != null ? payloadCustomDuration : defaultDuration;
//   const travelTime = payloadTravelTime != null ? payloadTravelTime : 30;

//   const normalizeDate = (dateInput) => {
//     const d = new Date(dateInput);
//     d.setUTCHours(0, 0, 0, 0);
//     return d;
//   };

//   const calculateEndTime = (start, dur, travel) => {
//     const s = new Date(start);
//     return new Date(s.getTime() + (dur + travel) * 60000);
//   };

//   const buildHolidayQuery = (date) => {
//     const query = { bookingDate: normalizeDate(date), isHoliday: true };
//     if (groomerId) {
//       query.$or = [{ groomer: null }, { groomer: groomerId }];
//     } else {
//       query.groomer = null;
//     }
//     return query;
//   };

//   const timeslots = [];

//   // ========== Specific Date Case ==========
//   if (specificDate) {
//     const normalizedBookingDate = normalizeDate(bookingDate);
//     const holidayCheck = await TimeSlot.findOne(buildHolidayQuery(normalizedBookingDate));
//     if (holidayCheck) {
//       return res.status(400).json(new ApiError(400, "Cannot create timeslot on a holiday"));
//     }

//     for (const subService of subServices) {
//       const slotStartTime = new Date(startTime);
//       const slotEndTime = calculateEndTime(slotStartTime, duration, travelTime);

//       const existingTimeslot = await TimeSlot.findOne({
//         bookingDate: normalizedBookingDate,
//         startTime: slotStartTime,
//         endTime: slotEndTime,
//         subservice: subService._id,
//         groomer: groomerId ? groomerId : { $exists: true }
//       });

//       if (existingTimeslot) continue;

//       const timeslotData = {
//         startTime: slotStartTime,
//         duration,
//         travelTime,
//         endTime: slotEndTime,
//         subservice: subService._id,
//         bookingDate: normalizedBookingDate,
//         specificDate,
//         subserviceName,
//         customDuration: payloadCustomDuration
//       };
//       if (groomerId) timeslotData.groomer = groomerId;

//       timeslots.push(timeslotData);
//     }
//   } 
//   // ========== Date Range Case ==========
//   else {
//     let date = normalizeDate(startDate);
//     const lastDate = normalizeDate(endDate);

//     while (date <= lastDate) {
//       const holidayCheck = await TimeSlot.findOne(buildHolidayQuery(date));
//       if (holidayCheck) {
//         date.setDate(date.getDate() + 1);
//         continue;
//       }

//       for (const subService of subServices) {
//         const slotStartTime = new Date(date);
//         slotStartTime.setUTCHours(
//           new Date(startTime).getUTCHours(),
//           new Date(startTime).getUTCMinutes(),
//           0, 0
//         );
//         const slotEndTime = calculateEndTime(slotStartTime, duration, travelTime);

//         const existingTimeslot = await TimeSlot.findOne({
//           bookingDate: normalizeDate(date),
//           startTime: slotStartTime,
//           endTime: slotEndTime,
//           subservice: subService._id,
//           groomer: groomerId ? groomerId : { $exists: true }
//         });

//         if (existingTimeslot) continue;

//         const timeslotData = {
//           startTime: slotStartTime,
//           duration,
//           travelTime,
//           endTime: slotEndTime,
//           subservice: subService._id,
//           bookingDate: new Date(date),
//           specificDate,
//           subserviceName,
//           customDuration: payloadCustomDuration
//         };
//         if (groomerId) timeslotData.groomer = groomerId;

//         timeslots.push(timeslotData);
//       }

//       date.setDate(date.getDate() + 1);
//     }
//   }

//   if (!timeslots.length) {
//     return res.status(400).json(new ApiError(400, "No new timeslots created — all slots exist or holidays"));
//   }

//   const createdTimeslots = await TimeSlot.insertMany(timeslots);

//   return res.status(201).json(new ApiResponse(201, createdTimeslots, "Timeslots created successfully"));

// });

/**-----------10-6-25 10:25pm-------------- */
const createTimeslot = asyncHandler(async (req, res) => {
  const {
    startTime,
    subserviceName,
    groomerId,
    bookingDate,
    startDate,
    endDate,
    specificDate = false,
    travelTime: payloadTravelTime,
    customDuration: payloadCustomDuration
  } = req.body;

  if (!startTime || !subserviceName || (!bookingDate && !startDate && !endDate)) {
    return res.status(400).json(new ApiError(400, "Missing required fields"));
  }

  const subServices = await SubServiceType.find({ name: subserviceName });
  if (!subServices.length) {
    return res.status(404).json(new ApiError(404, `No subservices found with name ${subserviceName}`));
  }

  const getDefaultDuration = (name) => {
    switch (name) {
      case "basic": return 60;
      case "full": return 90;
      case "royal": return 120;
      default: return 60;
    }
  };

  const defaultDuration = getDefaultDuration(subserviceName);
  const duration = payloadCustomDuration != null ? payloadCustomDuration : defaultDuration;
  const travelTime = payloadTravelTime != null ? payloadTravelTime : 30;

  const normalizeDate = (dateInput) => {
    const d = new Date(dateInput);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  };

  const calculateEndTime = (start, dur, travel) => {
    return new Date(new Date(start).getTime() + (dur + travel) * 60000);
  };

  const buildHolidayQuery = (date) => {
    const query = { bookingDate: normalizeDate(date), isHoliday: true };
    if (groomerId) {
      query.$or = [{ groomer: null }, { groomer: groomerId }];
    } else {
      query.groomer = null;
    }
    return query;
  };

  const timeslots = [];

  if (specificDate) {
    const normalizedBookingDate = normalizeDate(bookingDate);
    const holidayCheck = await TimeSlot.findOne(buildHolidayQuery(normalizedBookingDate));
    if (holidayCheck) {
      return res.status(400).json(new ApiError(400, "Cannot create timeslot on a holiday"));
    }

    for (const subService of subServices) {
      const slotStartTime = new Date(startTime);
      const slotEndTime = calculateEndTime(slotStartTime, duration, travelTime);

      // Get latest endTime for this groomer/subservice on the date
      const latestSlot = await TimeSlot.findOne({
        bookingDate: normalizedBookingDate,
        subservice: subService._id,
        ...(groomerId ? { groomer: groomerId } : {})
      }).sort({ endTime: -1 });

      if (latestSlot && slotStartTime < latestSlot.endTime) {
        return res.status(400).json(new ApiError(400, "New slot must start after last scheduled slot ends."));
      }

      // Prevent overlapping with other slots
      const conflict = await TimeSlot.findOne({
        bookingDate: normalizedBookingDate,
        subservice: subService._id,
        ...(groomerId ? { groomer: groomerId } : {}),
        $or: [
          { startTime: { $lt: slotEndTime }, endTime: { $gt: slotStartTime } }
        ]
      });

      if (conflict) {
        return res.status(400).json(new ApiError(400, "Timeslot overlaps with an existing one"));
      }

      const timeslotData = {
        startTime: slotStartTime,
        duration,
        travelTime,
        endTime: slotEndTime,
        subservice: subService._id,
        bookingDate: normalizedBookingDate,
        specificDate,
        subserviceName,
        customDuration: payloadCustomDuration
      };
      if (groomerId) timeslotData.groomer = groomerId;

      timeslots.push(timeslotData);
    }
  } else {
    let date = normalizeDate(startDate);
    const lastDate = normalizeDate(endDate);

    while (date <= lastDate) {
      const holidayCheck = await TimeSlot.findOne(buildHolidayQuery(date));
      if (holidayCheck) {
        date.setDate(date.getDate() + 1);
        continue;
      }

      for (const subService of subServices) {
        const slotStartTime = new Date(date);
        slotStartTime.setUTCHours(
          new Date(startTime).getUTCHours(),
          new Date(startTime).getUTCMinutes(),
          0, 0
        );
        const slotEndTime = calculateEndTime(slotStartTime, duration, travelTime);

        const latestSlot = await TimeSlot.findOne({
          bookingDate: normalizeDate(date),
          subservice: subService._id,
          ...(groomerId ? { groomer: groomerId } : {})
        }).sort({ endTime: -1 });

        if (latestSlot && slotStartTime < latestSlot.endTime) {
          date.setDate(date.getDate() + 1);
          continue;
        }

        const conflict = await TimeSlot.findOne({
          bookingDate: normalizeDate(date),
          subservice: subService._id,
          ...(groomerId ? { groomer: groomerId } : {}),
          $or: [
            { startTime: { $lt: slotEndTime }, endTime: { $gt: slotStartTime } }
          ]
        });

        if (conflict) {
          date.setDate(date.getDate() + 1);
          continue;
        }

        const timeslotData = {
          startTime: slotStartTime,
          duration,
          travelTime,
          endTime: slotEndTime,
          subservice: subService._id,
          bookingDate: new Date(date),
          specificDate,
          subserviceName,
          customDuration: payloadCustomDuration
        };
        if (groomerId) timeslotData.groomer = groomerId;

        timeslots.push(timeslotData);
      }

      date.setDate(date.getDate() + 1);
    }
  }

  if (!timeslots.length) {
    return res.status(400).json(new ApiError(400, "No valid timeslots could be created"));
  }

  const createdTimeslots = await TimeSlot.insertMany(timeslots);

  return res.status(201).json(new ApiResponse(201, createdTimeslots, "Timeslots created successfully"));
});
const updateTimeslot = asyncHandler(async (req, res) => {
  console.log("Incoming Update Request ➝", req.body);

  try {
    const { timeslotId } = req.params;
    const {
      startTime,
      travelTime,
      subserviceId,
      groomerId,
      subserviceName,
      bookingDate,
      customDuration
    } = req.body;

    if (!timeslotId) {
      return res.status(400).json(new ApiError(400, "Timeslot ID is required"));
    }

    const existingTimeslot = await TimeSlot.findById(timeslotId);
    if (!existingTimeslot) {
      return res.status(404).json(new ApiError(404, "Timeslot not found"));
    }

    // Check if the subserviceName was provided
    let subService;
    if (subserviceName) {
      // If subserviceName is provided, find the subservice by name
      subService = await SubServiceType.findOne({ name: subserviceName });
    } else {
      // Otherwise, use the subserviceId or existing timeslot's service
      subService = await SubServiceType.findById(subserviceId || existingTimeslot.service);
    }

    if (!subService) {
      return res.status(404).json(new ApiError(404, "Sub Service Type not found"));
    }

    const defaultDuration = getDefaultDuration(subService.name);
    const duration = customDuration || defaultDuration;

    const targetDate = bookingDate || existingTimeslot.bookingDate;
    const normalizedDate = new Date(targetDate);
    normalizedDate.setHours(0, 0, 0, 0);

    // Holiday check
    const officeHoliday = await TimeSlot.findOne({
      bookingDate: normalizedDate,
      isHoliday: true,
      groomer: { $exists: false }
    });

    const groomerHoliday = await TimeSlot.findOne({
      bookingDate: normalizedDate,
      isHoliday: true,
      groomer: groomerId || existingTimeslot.groomer
    });

    if (officeHoliday || groomerHoliday) {
      return res.status(400).json(new ApiError(400, "Cannot update timeslot on a holiday"));
    }

    // Update timeslot fields
    existingTimeslot.startTime = startTime || existingTimeslot.startTime;
    existingTimeslot.travelTime = travelTime !== undefined ? travelTime : existingTimeslot.travelTime;
    existingTimeslot.service = subserviceId || existingTimeslot.service;
    existingTimeslot.groomer = groomerId || existingTimeslot.groomer;
    existingTimeslot.bookingDate = normalizedDate;
    existingTimeslot.duration = duration;

    // Recalculate endTime
    const slotStart = new Date(existingTimeslot.startTime);
    existingTimeslot.endTime = calculateEndTime(slotStart, duration, existingTimeslot.travelTime);

    const updatedTimeslot = await existingTimeslot.save();
    console.log("Timeslot updated successfully ➝", updatedTimeslot);

    return res.status(200).json(new ApiResponse(200, updatedTimeslot, "Timeslot updated successfully"));
  } catch (error) {
    console.error("Error occurred during timeslot update ➝", error);
    return res.status(400).json(new ApiError(400, error.message || error, "Error updating timeslot"));
  }
});


//get Timeslot by ID
const getTimeslotById = asyncHandler(async (req, res) => {
  try {
    const { timeslotId } = req.params;

    const timeslot = await TimeSlot.findById(timeslotId).populate("groomer").populate("service");

    if (!timeslot) {
      return res.status(404).json(new ApiError(404, "Timeslot not found"));
    }

    return res.status(200).json(new ApiResponse(200, timeslot, "Timeslot retrieved successfully"));

  } catch (error) {
    console.log("Error------", error);
    return res.status(400).json(new ApiError(400, error, "Error"))
  }
})


//get all Timeslot
// const getAllTimeslots = asyncHandler(async (req, res) => {
//   try {
//     const { search = "",  sortOrder = 1 } = req.query;
//     const {date, subServiceId ,filter = {} } = req.body;
//     // const {date,filter = {} } = req.body;
//     const userRole = req.user?.user_role;

//     let searchCondition = {};

//     if (search && search !== "undefined") {
//       const regex = new RegExp(search, "i");
//       searchCondition.name = { $regex: regex };
//     }

//     const finalQuery = {
//       ...searchCondition,
//       ...filter,
//     };
//     if (subServiceId) {
//       finalQuery.subservice = new mongoose.Types.ObjectId(subServiceId);
//     }
//     const now = new Date();
//     let checkDate;

//     if (date) {
//       if (date === "today") {
//         const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
//         const currentTime = now.getTime();
//         const threeHoursFromNow = currentTime + 3 * 60 * 60 * 1000;

//         if (userRole.name === "customer") {
//           finalQuery.startTime = { $gte: threeHoursFromNow };
//         } else {
//           finalQuery.startTime = { $gte: startOfToday };
//         }

//         checkDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
//       } else {
//         const [year, month, day] = date.split("-").map(Number);
//         checkDate = new Date(Date.UTC(year, month - 1, day));

//         const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
//         const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

//         finalQuery.bookingDate = {
//           $gte: startOfDay.getTime(),
//           $lte: endOfDay.getTime(),
//         };
//       }

//       const holidayExists = await Holiday.findOne({
//         groomer: { $exists: false },
//         startDate: { $lte: checkDate },
//         endDate: { $gte: checkDate },
//       });

//       if (holidayExists) {
//         const formattedDate = `${checkDate.getUTCFullYear()}-${String(checkDate.getUTCMonth() + 1).padStart(2, '0')}-${String(checkDate.getUTCDate()).padStart(2, '0')}`;
//         return res.status(200).json(
//           new ApiResponse(
//             200,
//             {
//               timeslots: [],
//               isHoliday: true,
//               Date: formattedDate,
//               holidayReason: holidayExists.reason || "Office closed",
//             },
//             "Office holiday – no timeslots available"
//           )
//         );
//       }
//     }

//     let timeslots;

//     if (userRole.name === "admin") {
//       timeslots = await TimeSlot.find(finalQuery)
//         // .populate("groomer")
//         // .populate("subservice")
//          .populate({
//           path: "subservice",
//           populate: {
//             path: "serviceTypeId",
//             select: "name"
//           }
//         })
//         .sort({ startTime: sortOrder });
//     } else if (userRole.name === "customer") {
//       const availableSlotsQuery = { ...finalQuery, isBooked: false };
//       timeslots = await TimeSlot.find(availableSlotsQuery)
//         // .populate("groomer")
//         // .populate("subservice")
//         .populate({
//           path: "subservice",
//           populate: {
//             path: "serviceTypeId",
//             select: "name"
//           }
//         })
//         .sort({ startTime: sortOrder });
//     } else {
//       return res.status(403).json(new ApiError(403, "User role is not authorized to view timeslots"));
//     }

//     return res.status(200).json(new ApiResponse(200, timeslots, "Timeslots retrieved successfully"));
//   } catch (error) {
//     console.error("Error------", error);
//     return res.status(400).json(new ApiError(400, error.message || error, "Error retrieving timeslots"));
//   }
// });

/***----------------- */

const getAllTimeslots = asyncHandler(async (req, res) => {
  try {
    const { search = "", sortOrder = 1 } = req.query;
    const { date, subServiceId, filter = {} } = req.body;
    const userRole = req.user?.user_role;

    let searchCondition = {};

    if (search && search !== "undefined") {
      const regex = new RegExp(search, "i");
      searchCondition.name = { $regex: regex };
    }

    const finalQuery = {
      ...searchCondition,
      ...filter,
    };
    
    if (subServiceId) {
      finalQuery.subservice = new mongoose.Types.ObjectId(subServiceId);
    }
    
    const now = new Date();
    let checkDate;

    if (date) {
      if (date === "today") {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const currentTime = now.getTime();
        const threeHoursFromNow = currentTime + 3 * 60 * 60 * 1000;

        if (userRole.name === "customer") {
          finalQuery.startTime = { $gte: threeHoursFromNow };
        } else {
          finalQuery.startTime = { $gte: startOfToday };
        }

        checkDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      } else {
        const [year, month, day] = date.split("-").map(Number);
        checkDate = new Date(Date.UTC(year, month - 1, day));

        const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

        finalQuery.bookingDate = {
          $gte: startOfDay.getTime(),
          $lte: endOfDay.getTime(),
        };
      }

      const holidayExists = await Holiday.findOne({
        groomer: { $exists: false },
        startDate: { $lte: checkDate },
        endDate: { $gte: checkDate },
      });

      if (holidayExists) {
        const formattedDate = `${checkDate.getUTCFullYear()}-${String(checkDate.getUTCMonth() + 1).padStart(2, '0')}-${String(checkDate.getUTCDate()).padStart(2, '0')}`;
        return res.status(200).json(
          new ApiResponse(
            200,
            {
              timeslots: [],
              isHoliday: true,
              Date: formattedDate,
              holidayReason: holidayExists.reason || "Office closed",
            },
            "Office holiday – no timeslots available"
          )
        );
      }
    }

    let timeslots;

    if (userRole.name === "admin") {
      timeslots = await TimeSlot.find(finalQuery)
        .populate({
          path: "subservice",
          populate: {
            path: "serviceTypeId",
            select: "name"
          }
        })
        .sort({ startTime: sortOrder });
    } else if (userRole.name === "customer") {
      const availableSlotsQuery = { ...finalQuery, isBooked: false };
      timeslots = await TimeSlot.find(availableSlotsQuery)
        .populate({
          path: "subservice",
          populate: {
            path: "serviceTypeId",
            select: "name"
          }
        })
        .sort({ startTime: sortOrder });
    } else {
      return res.status(403).json(new ApiError(403, "User role is not authorized to view timeslots"));
    }

    // Enhanced response with order details for matched timeslots
    const enhancedTimeslots = await Promise.all(timeslots.map(async (slot) => {
      // Convert bookingDate to match orderDetails date format
      const slotDate = new Date(slot.bookingDate);
      const formattedSlotDate = new Date(Date.UTC(
        slotDate.getUTCFullYear(),
        slotDate.getUTCMonth(),
        slotDate.getUTCDate()
      ));

      // Find matching orderDetails
      const matchingOrders = await OrderDetails.find({
        "orderDetails.date": formattedSlotDate,
        "orderDetails.subServiceId": slot.subservice._id,
        "orderDetails.timeslot": slot._id.toString()
      }).populate('groomer', 'name email phone');

      if (matchingOrders.length > 0) {
        return {
          ...slot.toObject(),
          isOccupied: true,
          occupiedBy: matchingOrders.map(order => ({
            groomer: order.groomer,
            orderId: order.order,
            status: order.status,
            bookingStatus: order.bookingStatus
          }))
        };
      }

      return {
        ...slot.toObject(),
        isOccupied: false
      };
    }));

    return res.status(200).json(
      new ApiResponse(
        200, 
        enhancedTimeslots, 
        "Timeslots retrieved successfully with occupation details"
      )
    );
  } catch (error) {
    console.error("Error------", error);
    return res.status(400).json(new ApiError(400, error.message || error, "Error retrieving timeslots"));
  }
});

const deleteTimeSlot = asyncHandler(async (req, res) => {
  const { timeslotId } = req.params;
// console.log("timeslotId----------------->", timeslotId);

  if (timeslotId == "undefined" || !timeslotId) {
    return res.status(400).json(new ApiError(400, "Timeslot ID not provided"));
  }

  // Check if this timeslot is used in any OrderDetails
  const existingOrderDetails = await OrderDetails.findOne({
    "orderDetails.timeslot": timeslotId,
  });
// console.log("existingOrderDetails----------------------->",existingOrderDetails);

  if (existingOrderDetails) {
    return res.status(400).json(
      new ApiError(
        400,
        "Cannot delete timeslot — it is associated with existing orders"
      )
    );
  }

  // Delete the timeslot if no association found
  const timeSlot = await TimeSlot.findByIdAndDelete(timeslotId);
// console.log("timeSlot---------------------------->", timeSlot);

  if (!timeSlot) {
    return res.status(404).json(new ApiError(404, "Timeslot not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Timeslot deleted successfully"));
});


//mark holiday
const markOfficeHoliday = asyncHandler(async (req, res) => {
  console.log("req.body", req.body);

  const { startDate, endDate, reason } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json(new ApiError(400, "Start date and end date are required"));
  }

  const parseDateParts = (dateStr) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return { year, month: month - 1, day }; // JS months are 0-indexed
  };
  
  const { year: startY, month: startM, day: startD } = parseDateParts(startDate);
  const { year: endY, month: endM, day: endD } = parseDateParts(endDate);
  
  // Construct UTC-safe dates
  const normalizedStart = new Date(Date.UTC(startY, startM, startD, 0, 0, 0, 0));
  const normalizedEnd = new Date(Date.UTC(endY, endM, endD, 23, 59, 59, 999));

  const existingHoliday = await Holiday.findOne({
    groomer: { $exists: false },
    startDate: { $lte: normalizedEnd },
    endDate: { $gte: normalizedStart },
  });

  if (existingHoliday) {
    return res.status(400).json(new ApiError(400, "Office holiday already exists for these dates"));
  }

  const holiday = await Holiday.create({
    startDate: normalizedStart,
    endDate: normalizedEnd,
    reason: reason?.trim() || "Office closed",
  });

  return res.status(201).json(new ApiResponse(201, holiday, "Office holiday marked successfully"));
});


//mark groomer holiday
const markGroomerHoliday = asyncHandler(async (req, res) => {
  console.log("req.body", req.body);
  
  const { groomerId, startDate, endDate, reason } = req.body;

  if (!groomerId || !startDate || !endDate) {
    return res.status(400).json(new ApiError(400, "Groomer ID, start date, and end date are required"));
  }

  const normalizedStart = new Date(startDate);
  normalizedStart.setHours(0, 0, 0, 0);

  const normalizedEnd = new Date(endDate);
  normalizedEnd.setHours(23, 59, 59, 999);

  const existingHoliday = await Holiday.findOne({
    groomer: groomerId,
    startDate: { $lte: normalizedEnd },
    endDate: { $gte: normalizedStart }
  });

  if (existingHoliday) {
    return res.status(400).json(new ApiError(400, "Groomer already has a holiday during these dates"));
  }

  const holiday = await Holiday.create({
    groomer: groomerId,
    startDate: normalizedStart,
    endDate: normalizedEnd,
    reason: reason || "Absent"
  });

  return res.status(201).json(new ApiResponse(201, holiday, "Groomer's holiday marked successfully"));
});


//find Groomer
const getFreeGroomers = asyncHandler(async (req, res) => {
  try {
    const { bookingDate, timeSlotId } = req.body;

    if (!bookingDate || !timeSlotId) {
      return res.status(400).json(new ApiError(400, "bookingDate and timeSlotId are required"));
    }

    const selectedSlot = await TimeSlot.findById(timeSlotId);
    if (!selectedSlot) {
      return res.status(404).json(new ApiError(404, "TimeSlot not found"));
    }

    // Anchor startTime and endTime to the given bookingDate
    const bookingDateObj = new Date(bookingDate);
    bookingDateObj.setHours(0, 0, 0, 0);

    const originalStart = new Date(selectedSlot.startTime);
    const originalEnd = new Date(selectedSlot.endTime);

    const adjustedStartTime = new Date(bookingDateObj);
    adjustedStartTime.setHours(originalStart.getHours(), originalStart.getMinutes());

    const adjustedEndTime = new Date(bookingDateObj);
    adjustedEndTime.setHours(originalEnd.getHours(), originalEnd.getMinutes());

    const users = await User.find()
      .populate("user_role")
      .select("-password -refreshToken -otp -otp_time");

    const groomers = users.filter(
      (user) => user.user_role && user.user_role.name === "groomer"
    );

    const freeGroomers = [];

    for (const groomer of groomers) {
      const available = await isGroomerAvailable({
        groomerId: groomer._id,
        date: bookingDate,
        startTime: adjustedStartTime,
        endTime: adjustedEndTime,
      });

      if (available) {
        freeGroomers.push(groomer);
      }
    }

    return res
      .status(200)
      .json(new ApiResponse(200, freeGroomers, "Available groomers fetched successfully"));
  } catch (error) {
    console.error("Error fetching available groomers:", error);
    return res
      .status(500)
      .json(new ApiError(500, error.message || "Internal Server Error"));
  }
});


//get available timeslots original code
// const getAvailableTimeSlots = asyncHandler(async (req, res) => {
//   try {
//     const { subServiceId } = req.params;
//     const { dateTime } = req.body;
//     console.log("reqbody------------------>", req.body);
//     console.log("params------------------>", req.params);

//     if (!dateTime) {
//       return res.status(400).json(new ApiError(400, "Please provide dateTime and subServiceId"));
//     }

//     const subService = await SubServiceType.findById(subServiceId);
//     // console.log("subservice--------->",subService);
    
//     if (!subService) {
//       return res.status(404).json(new ApiError(404, "Sub Service Type not found"));
//     }

//     const duration = getDefaultDuration(subService.name);
//     const requestedDate = new Date(dateTime);
//     // console.log("duration------------------>", duration);
//     // console.log("requestedDate------------------>", requestedDate);

//     const dayStart = new Date(requestedDate);
//     dayStart.setHours(0, 0, 0, 0);

//     const dayEnd = new Date(requestedDate);
//     dayEnd.setHours(23, 59, 59, 999);

//     const now = new Date();

//     // Get all groomers
//     const groomers = await User.find().populate("user_role");
//     // console.log("groomer------->",groomers);
    
//     const allGroomerIds = groomers
//       .filter(user => user.user_role?.name === "groomer")
//       .map(user => user._id.toString());

//     if (!allGroomerIds.length) {
//       return res.status(404).json(new ApiError(404, "No groomers found"));
//     }

//     // Fetch timeslots for the day and subservice
//     const slots = await TimeSlot.find({
//       startTime: { $gte: dayStart, $lte: dayEnd },
//       duration,
//       // subserviceName: subService.name
//       subservice: subServiceId  
//     });
// console.log("slots------------------>",slots);

//     if (!slots.length) {
//       return res.status(404).json(new ApiError(404, "No timeslots found"));
//     }

//     // Preload holidays
//     const holidays = await Holiday.find({
//       $or: [
//         { groomer: null },
//         { groomer: { $in: allGroomerIds } }
//       ],
//       startDate: { $lte: dayStart },
//       endDate: { $gte: dayStart }
//     });
// console.log("holidays-------------------->",holidays);

//     const isOfficeHoliday = holidays.some(h => h.groomer === null);
//     const holidayGroomerIds = new Set(
//       holidays.filter(h => h.groomer).map(h => h.groomer.toString())
//     );

//     const slotResults = [];
//     const isToday = requestedDate.toDateString() === now.toDateString();
//     for (const slot of slots) {
//       const assignedGroomers = slot.groomers?.map(g => g.toString()) || [];

//       // If slot is already full, skip
//       if (assignedGroomers.length >= allGroomerIds.length) continue;

//       const availableGroomers = [];

//       for (const groomerId of allGroomerIds) {
//         if (assignedGroomers.includes(groomerId)) continue;
//         if (holidayGroomerIds.has(groomerId) || isOfficeHoliday) continue;

//         const isAvailable = await isGroomerAvailable({
//           groomerId,
//           date: requestedDate,
//           startTime: slot.startTime,
//           endTime: slot.endTime,
//         });

//         if (isAvailable) {
//           availableGroomers.push(groomerId);
//         }
//       }

//         if (availableGroomers.length > 0) {
//         if (isToday) {
//           if (slot.startTime > now) {
//             slotResults.push({
//               _id: slot._id,
//               startTime: slot.startTime,
//               endTime: slot.endTime,
//               availableGroomers: availableGroomers.length,
//               groomerIds: availableGroomers
//             });
//           }
//         } else {
//           // For other dates, include all available slots
//           slotResults.push({
//             _id: slot._id,
//             startTime: slot.startTime,
//             endTime: slot.endTime,
//             availableGroomers: availableGroomers.length,
//             groomerIds: availableGroomers
//           });
//         }
//       }
//     }
// console.log("slotResults----------------->",slotResults);

//     return res.status(200).json(
//       new ApiResponse(200, slotResults, "Available timeslots with groomer availability fetched successfully")
//     );
//   } catch (error) {
//     console.error("Error fetching timeslots:", error);
//     return res.status(400).json(
//       new ApiError(400, error.message || "Unexpected error", "Error fetching available timeslots")
//     );
//   }
// });


/**--------working------- */

// const getAvailableTimeSlots = asyncHandler(async (req, res) => {
//   try {
//     const { subServiceId } = req.params;
//     const { dateTime } = req.body;

//     if (!dateTime) {
//       return res.status(400).json(new ApiError(400, "Please provide dateTime and subServiceId"));
//     }

//     const subService = await SubServiceType.findById(subServiceId);
//     if (!subService) {
//       return res.status(404).json(new ApiError(404, "Sub Service Type not found"));
//     }

//     const requestedDate = new Date(dateTime);
//     const dayStart = new Date(requestedDate);
//     dayStart.setHours(0, 0, 0, 0);

//     const dayEnd = new Date(requestedDate);
//     dayEnd.setHours(23, 59, 59, 999);

//     const now = new Date();

//     // Get all groomers
//     const groomers = await User.find().populate("user_role");
//     const allGroomerIds = groomers
//       .filter(user => user.user_role?.name === "groomer")
//       .map(user => user._id.toString());

//     if (!allGroomerIds.length) {
//       return res.status(404).json(new ApiError(404, "No groomers found"));
//     }

//     // Fetch timeslots for the day and subservice
//     const slots = await TimeSlot.find({
//       subservice: subServiceId,
//       bookingDate: { $gte: dayStart, $lte: dayEnd }
//     });

//     if (!slots.length) {
//       return res.status(404).json(new ApiError(404, "No timeslots found"));
//     }

//     // Fetch orderDetails for these slots
//     const orderDetailsList = await OrderDetails.find({
//       "orderDetails.subServiceId": subServiceId,
//       "orderDetails.date": { $gte: dayStart, $lte: dayEnd },
//       "orderDetails.timeslot": { $in: slots.map(s => s._id.toString()) }
//     });

//     // Map timeslotId -> orderDetails with groomer assigned
//     const orderDetailsMap = {};
//     for (const od of orderDetailsList) {
//       const timeslotId = od.orderDetails.timeslot;
//       if (!orderDetailsMap[timeslotId]) {
//         orderDetailsMap[timeslotId] = [];
//       }
//       orderDetailsMap[timeslotId].push(od);
//     }

//     // Holidays
//     const holidays = await Holiday.find({
//       $or: [{ groomer: null }, { groomer: { $in: allGroomerIds } }],
//       startDate: { $lte: dayStart },
//       endDate: { $gte: dayStart }
//     });

//     const isOfficeHoliday = holidays.some(h => h.groomer === null);
//     const holidayGroomerIds = new Set(
//       holidays.filter(h => h.groomer).map(h => h.groomer.toString())
//     );

//     const isToday = requestedDate.toDateString() === now.toDateString();
//     const slotResults = [];

//     for (const slot of slots) {
//       const slotIdStr = slot._id.toString();
//       const odForSlot = orderDetailsMap[slotIdStr];

//       // If orderDetails exist for this slot and any has groomer assigned → skip
//       if (odForSlot && odForSlot.some(od => od.groomer)) {
//         continue;
//       }

//       const assignedGroomers = slot.groomer?.map(g => g.toString()) || [];

//       if (assignedGroomers.length >= allGroomerIds.length) continue;

//       const availableGroomers = [];

//       for (const groomerId of allGroomerIds) {
//         if (assignedGroomers.includes(groomerId)) continue;
//         if (holidayGroomerIds.has(groomerId) || isOfficeHoliday) continue;

//         const isAvailable = await isGroomerAvailable({
//           groomerId,
//           date: requestedDate,
//           startTime: slot.startTime,
//           endTime: slot.endTime,
//         });

//         if (isAvailable) {
//           availableGroomers.push(groomerId);
//         }
//       }

//       if (availableGroomers.length > 0) {
//         if (isToday) {
//           if (slot.startTime > now) {
//             slotResults.push({
//               _id: slot._id,
//               startTime: slot.startTime,
//               endTime: slot.endTime,
//               availableGroomers: availableGroomers.length,
//               groomerIds: availableGroomers
//             });
//           }
//         } else {
//           slotResults.push({
//             _id: slot._id,
//             startTime: slot.startTime,
//             endTime: slot.endTime,
//             availableGroomers: availableGroomers.length,
//             groomerIds: availableGroomers
//           });
//         }
//       }
//     }

//     return res.status(200).json(
//       new ApiResponse(200, slotResults, "Available timeslots fetched successfully")
//     );

//   } catch (error) {
//     console.error("Error fetching timeslots:", error);
//     return res.status(400).json(
//       new ApiError(400, error.message || "Unexpected error")
//     );
//   }
// });

/**----------working with advance coding */

// const getAvailableTimeSlots = asyncHandler(async (req, res) => {
//   try {
//     const { subServiceId } = req.params;
//     const { dateTime } = req.body;

//     if (!dateTime) {
//       return res.status(400).json(new ApiError(400, "Please provide dateTime and subServiceId"));
//     }

//     const subService = await SubServiceType.findById(subServiceId);
//     if (!subService) {
//       return res.status(404).json(new ApiError(404, "Sub Service Type not found"));
//     }

//     const duration = getDefaultDuration(subService.name);
//     const requestedDate = new Date(dateTime);
//     const dayStart = new Date(requestedDate);
//     dayStart.setHours(0, 0, 0, 0);
//     const dayEnd = new Date(requestedDate);
//     dayEnd.setHours(23, 59, 59, 999);
//     const now = new Date();

//     // Get all groomers
//     const groomers = await User.find().populate("user_role");
//     const allGroomerIds = groomers
//       .filter(user => user.user_role?.name === "groomer")
//       .map(user => user._id.toString());

//     if (!allGroomerIds.length) {
//       return res.status(404).json(new ApiError(404, "No groomers found"));
//     }

//     // Fetch timeslots for the day and subservice
//     const slots = await TimeSlot.find({
//       bookingDate: { $gte: dayStart, $lte: dayEnd },
//       subservice: subServiceId
//     });

//     if (!slots.length) {
//       return res.status(404).json(new ApiError(404, "No timeslots found"));
//     }

//     // Preload holidays
//     const holidays = await Holiday.find({
//       $or: [{ groomer: null }, { groomer: { $in: allGroomerIds } }],
//       startDate: { $lte: dayStart },
//       endDate: { $gte: dayStart }
//     });

//     const isOfficeHoliday = holidays.some(h => h.groomer === null);
//     const holidayGroomerIds = new Set(
//       holidays.filter(h => h.groomer).map(h => h.groomer.toString())
//     );

//     // Fetch OrderDetails with matching subService, date and timeslot
//     const orderDetails = await OrderDetails.find({
//       "orderDetails.subServiceId": subServiceId,
//       "orderDetails.date": requestedDate
//     });

//     const slotResults = [];
//     const isToday = requestedDate.toDateString() === now.toDateString();

//     for (const slot of slots) {
//       // Check if this slot is already assigned in OrderDetails with a groomer
//       const slotHasAssignedGroomer = orderDetails.some(od =>
//         od.orderDetails.timeslot.toString() === slot._id.toString() &&
//         od.groomer !== null
//       );

//       if (slotHasAssignedGroomer) continue; // skip this timeslot

//       const assignedGroomers = slot.groomers?.map(g => g.toString()) || [];

//       // If slot is already full, skip
//       if (assignedGroomers.length >= allGroomerIds.length) continue;

//       // Groomers to check availability
//       const groomersToCheck = allGroomerIds.filter(
//         groomerId =>
//           !assignedGroomers.includes(groomerId) &&
//           !holidayGroomerIds.has(groomerId) &&
//           !isOfficeHoliday
//       );

//       // Run availability checks in parallel
//       const availabilityResults = await Promise.all(
//         groomersToCheck.map(groomerId =>
//           isGroomerAvailable({
//             groomerId,
//             date: requestedDate,
//             startTime: slot.startTime,
//             endTime: slot.endTime,
//           }).then(isAvailable => ({ groomerId, isAvailable }))
//         )
//       );

//       const availableGroomers = availabilityResults
//         .filter(result => result.isAvailable)
//         .map(result => result.groomerId);

//       if (availableGroomers.length > 0) {
//         if (isToday) {
//           if (slot.startTime > now) {
//             slotResults.push({
//               _id: slot._id,
//               startTime: slot.startTime,
//               endTime: slot.endTime,
//               availableGroomers: availableGroomers.length,
//               groomerIds: availableGroomers,
//             });
//           }
//         } else {
//           slotResults.push({
//             _id: slot._id,
//             startTime: slot.startTime,
//             endTime: slot.endTime,
//             availableGroomers: availableGroomers.length,
//             groomerIds: availableGroomers,
//           });
//         }
//       }
//     }

//     return res.status(200).json(
//       new ApiResponse(200, slotResults, "Available timeslots with groomer availability fetched successfully")
//     );

//   } catch (error) {
//     console.error("Error fetching timeslots:", error);
//     return res.status(400).json(
//       new ApiError(400, error.message || "Unexpected error", "Error fetching available timeslots")
//     );
//   }
// });

/**-----5:52---- */

// const getAvailableTimeSlots = asyncHandler(async (req, res) => {
//   try {
//     const { subServiceId } = req.params;
//     const { dateTime } = req.body;

//     if (!dateTime) {
//       return res.status(400).json(new ApiError(400, "Please provide dateTime and subServiceId"));
//     }

//     const subService = await SubServiceType.findById(subServiceId);
//     if (!subService) {
//       return res.status(404).json(new ApiError(404, "Sub Service Type not found"));
//     }

//     const duration = getDefaultDuration(subService.name);
//     const requestedDate = new Date(dateTime);
//     const dayStart = new Date(requestedDate);
//     dayStart.setHours(0, 0, 0, 0);
//     const dayEnd = new Date(requestedDate);
//     dayEnd.setHours(23, 59, 59, 999);
//     const now = new Date();

//     // Get all groomers
//     const groomers = await User.find().populate("user_role");
//     const allGroomerIds = groomers
//       .filter(user => user.user_role?.name === "groomer")
//       .map(user => user._id.toString());

//     if (!allGroomerIds.length) {
//       return res.status(404).json(new ApiError(404, "No groomers found"));
//     }

//     // Fetch timeslots for the day and subservice
//     const slots = await TimeSlot.find({
//       bookingDate: { $gte: dayStart, $lte: dayEnd },
//       subservice: subServiceId
//     });

//     if (!slots.length) {
//       return res.status(404).json(new ApiError(404, "No timeslots found"));
//     }

//     // Preload holidays
//     const holidays = await Holiday.find({
//       $or: [{ groomer: null }, { groomer: { $in: allGroomerIds } }],
//       startDate: { $lte: dayStart },
//       endDate: { $gte: dayStart }
//     });

//     const isOfficeHoliday = holidays.some(h => h.groomer === null);
//     const holidayGroomerIds = new Set(
//       holidays.filter(h => h.groomer).map(h => h.groomer.toString())
//     );

//     // Fetch OrderDetails with matching subService, date and timeslot
//     const orderDetails = await OrderDetails.find({
//       "orderDetails.subServiceId": subServiceId,
//       "orderDetails.date": requestedDate
//     });

//     const slotResults = [];
//     const isToday = requestedDate.toDateString() === now.toDateString();

//     for (const slot of slots) {
//       const assignedGroomers = orderDetails
//         .filter(od => od.orderDetails.timeslot.toString() === slot._id.toString())
//         .map(od => od.groomer?.toString())
//         .filter(Boolean);

//       const groomersToCheck = allGroomerIds.filter(
//         groomerId =>
//           !assignedGroomers.includes(groomerId) &&
//           !holidayGroomerIds.has(groomerId) &&
//           !isOfficeHoliday
//       );

//       const availabilityResults = await Promise.all(
//         groomersToCheck.map(groomerId =>
//           isGroomerAvailable({
//             groomerId,
//             date: requestedDate,
//             startTime: slot.startTime,
//             endTime: slot.endTime
//           }).then(isAvailable => ({ groomerId, isAvailable }))
//         )
//       );

//       const availableGroomers = availabilityResults
//         .filter(result => result.isAvailable)
//         .map(result => result.groomerId);

//       if (availableGroomers.length > 0) {
//         if (!isToday || slot.startTime > now) {
//           slotResults.push({
//             _id: slot._id,
//             startTime: slot.startTime,
//             endTime: slot.endTime,
//             availableGroomers: availableGroomers.length,
//             groomerIds: availableGroomers
//           });
//         }
//       }
//     }

//     return res.status(200).json(
//       new ApiResponse(200, slotResults, "Available timeslots with groomer availability fetched successfully")
//     );

//   } catch (error) {
//     console.error("Error fetching timeslots:", error);
//     return res.status(400).json(
//       new ApiError(400, error.message || "Unexpected error", "Error fetching available timeslots")
//     );
//   }
// });

/**6PM working 100% good and well on 11-6-25 1:10PM*/
// const getAvailableTimeSlots = asyncHandler(async (req, res) => {
//   try {
//     const { subServiceId } = req.params;
//     const { dateTime } = req.body;

//     if (!dateTime) {
//       return res.status(400).json(new ApiError(400, "Please provide dateTime and subServiceId"));
//     }

//     const subService = await SubServiceType.findById(subServiceId);
//     if (!subService) {
//       return res.status(404).json(new ApiError(404, "Sub Service Type not found"));
//     }

//     const duration = getDefaultDuration(subService.name);
//     const requestedDate = new Date(dateTime);
//     const dayStart = new Date(requestedDate);
//     dayStart.setHours(0, 0, 0, 0);
//     const dayEnd = new Date(requestedDate);
//     dayEnd.setHours(23, 59, 59, 999);
//     const now = new Date();

//     const groomers = await User.find().populate("user_role");
//     const allGroomerIds = groomers
//       .filter(user => user.user_role?.name === "groomer")
//       .map(user => user._id.toString());

//     if (!allGroomerIds.length) {
//       return res.status(404).json(new ApiError(404, "No groomers found"));
//     }

//     const slots = await TimeSlot.find({
//       bookingDate: { $gte: dayStart, $lte: dayEnd },
//       subservice: subServiceId
//     });

//     if (!slots.length) {
//       return res.status(404).json(new ApiError(404, "No timeslots found"));
//     }

//     const holidays = await Holiday.find({
//       $or: [{ groomer: null }, { groomer: { $in: allGroomerIds } }],
//       startDate: { $lte: dayStart },
//       endDate: { $gte: dayStart }
//     });

//     const isOfficeHoliday = holidays.some(h => h.groomer === null);
//     const holidayGroomerIds = new Set(
//       holidays.filter(h => h.groomer).map(h => h.groomer.toString())
//     );

//     // Fetch OrderDetails for the requested date (not just subServiceId)
//     const allOrderDetails = await OrderDetails.find({
//       "orderDetails.date": requestedDate
//     });

//     const slotResults = [];
//     const isToday = requestedDate.toDateString() === now.toDateString();

//     for (const slot of slots) {
//       const assignedGroomers = allOrderDetails
//         .filter(od => od.orderDetails.timeslot.toString() === slot._id.toString())
//         .map(od => od.groomer?.toString())
//         .filter(Boolean);

//       const groomersToCheck = allGroomerIds.filter(
//         groomerId =>
//           !assignedGroomers.includes(groomerId) &&
//           !holidayGroomerIds.has(groomerId) &&
//           !isOfficeHoliday
//       );

//       const availabilityResults = await Promise.all(
//         groomersToCheck.map(groomerId =>
//           isGroomerAvailable({
//             groomerId,
//             date: requestedDate,
//             startTime: slot.startTime,
//             endTime: slot.endTime
//           }).then(isAvailable => ({ groomerId, isAvailable }))
//         )
//       );

//       const availableGroomers = availabilityResults
//         .filter(result => result.isAvailable)
//         .map(result => result.groomerId);

//       if (availableGroomers.length > 0) {
//         if (!isToday || slot.startTime > now) {
//           slotResults.push({
//             _id: slot._id,
//             startTime: slot.startTime,
//             endTime: slot.endTime,
//             availableGroomers: availableGroomers.length,
//             groomerIds: availableGroomers
//           });
//         }
//       }
//     }

//     return res.status(200).json(
//       new ApiResponse(200, slotResults, "Available timeslots with groomer availability fetched successfully")
//     );
//   } catch (error) {
//     console.error("Error fetching timeslots:", error);
//     return res.status(400).json(
//       new ApiError(400, error.message || "Unexpected error", "Error fetching available timeslots")
//     );
//   }
// });

/***--------- */
const getAvailableTimeSlots = asyncHandler(async (req, res) => {
  try {
    const { subServiceId } = req.params;
    const { dateTime } = req.body;

    if (!dateTime) {
      return res.status(400).json(new ApiError(400, "Please provide dateTime and subServiceId"));
    }

    const subService = await SubServiceType.findById(subServiceId).populate("serviceTypeId");
    if (!subService) {
      return res.status(404).json(new ApiError(404, "Sub Service Type not found"));
    }

    const serviceTypeId = subService.serviceTypeId?._id?.toString();
    if (!serviceTypeId) {
      return res.status(400).json(new ApiError(400, "SubService has no linked ServiceType"));
    }

    const duration = getDefaultDuration(subService.name);
    const requestedDate = new Date(dateTime);
    const dayStart = new Date(requestedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(requestedDate);
    dayEnd.setHours(23, 59, 59, 999);
    const now = new Date();

    const groomers = await User.find({}).populate("user_role");
    const allGroomerIds = groomers
      .filter(user =>
        user.user_role?.name === "groomer" &&
        user.serviceProvider?.map(s => s.toString()).includes(serviceTypeId)
      )
      .map(user => user._id.toString());

    if (!allGroomerIds.length) {
      return res.status(404).json(new ApiError(404, "No groomers found for this service type"));
    }

    const slots = await TimeSlot.find({
      bookingDate: { $gte: dayStart, $lte: dayEnd },
      subservice: subServiceId
    });

    if (!slots.length) {
      return res.status(404).json(new ApiError(404, "No timeslots found"));
    }

    const holidays = await Holiday.find({
      $or: [{ groomer: null }, { groomer: { $in: allGroomerIds } }],
      startDate: { $lte: dayStart },
      endDate: { $gte: dayStart }
    });

    const isOfficeHoliday = holidays.some(h => h.groomer === null);
    const holidayGroomerIds = new Set(
      holidays.filter(h => h.groomer).map(h => h.groomer.toString())
    );

    const allOrderDetails = await OrderDetails.find({
      "orderDetails.date": requestedDate
    });

    const slotResults = [];
    const isToday = requestedDate.toDateString() === now.toDateString();

    for (const slot of slots) {
      const assignedGroomers = allOrderDetails
        .filter(od => od.orderDetails.timeslot.toString() === slot._id.toString())
        .map(od => od.groomer?.toString())
        .filter(Boolean);

      const groomersToCheck = allGroomerIds.filter(
        groomerId =>
          !assignedGroomers.includes(groomerId) &&
          !holidayGroomerIds.has(groomerId) &&
          !isOfficeHoliday
      );

      const availabilityResults = await Promise.all(
        groomersToCheck.map(groomerId =>
          isGroomerAvailable({
            groomerId,
            date: requestedDate,
            startTime: slot.startTime,
            endTime: slot.endTime
          }).then(isAvailable => ({ groomerId, isAvailable }))
        )
      );

      const availableGroomers = availabilityResults
        .filter(result => result.isAvailable)
        .map(result => result.groomerId);

      if (availableGroomers.length > 0) {
        if (!isToday || slot.startTime > now) {
          slotResults.push({
            _id: slot._id,
            startTime: slot.startTime,
            endTime: slot.endTime,
            availableGroomers: availableGroomers.length,
            groomerIds: availableGroomers
          });
        }
      }
    }

    return res.status(200).json(
      new ApiResponse(200, slotResults, "Available timeslots with groomer availability fetched successfully")
    );

  } catch (error) {
    console.error("Error fetching timeslots:", error);
    return res.status(400).json(
      new ApiError(400, error.message || "Unexpected error", "Error fetching available timeslots")
    );
  }
});

export {
  createTimeslot,
  updateTimeslot,
  getTimeslotById,
  getAllTimeslots,
  deleteTimeSlot,
  markOfficeHoliday,
  markGroomerHoliday,
  getFreeGroomers,
  getAvailableTimeSlots,
}