import { User } from "../models/user.model.js";
import { TimeSlot } from "../models/timeslot.model.js";
import { isGroomerAvailable } from "./groomeravalibility.js";
import {OrderDetails} from "../models/order.model.js"
// const assignAvailableGroomer = async (orderDetailsDocs, session = null) => {
//   // Fetch only groomers directly for efficiency
//   const groomers = await User.find()
//     .populate("user_role")
//     .select("-password -refreshToken -otp -otp_time");

//   const filteredGroomers = groomers.filter(user => user.user_role?.name === "groomer");
//   console.log("filteredGroomers--------------------------------------->",filteredGroomers);
//   const assignedGroomers = [];

//   for (const detail of orderDetailsDocs) {
//     const slot = await TimeSlot.findById(detail.timeslot).session(session);
//     if (!slot) {
//       console.log(`Timeslot ${detail.timeslot} not found. Skipping...`);
//       assignedGroomers.push(null);
//       continue;
//     }
//     console.log("slot--------------------------------------------->",slot);

//     let foundGroomer = null;

//     for (const groomer of filteredGroomers) {
//       const groomerIdStr = groomer._id.toString();

//       // Skip if groomer is already assigned to this slot
//       console.log("alreadyAssigned-------------->",slot.groomer?.some(id => id.toString() === groomerIdStr));
      
//       if (slot.groomer?.some(id => id.toString() === groomerIdStr)) continue;

//       // Check if groomer is available
//       const isAvailable = await isGroomerAvailable({
//         groomerId: groomer._id,
//         date: slot.bookingDate,
//         startTime: slot.startTime,
//         endTime: slot.endTime,
//       });
// console.log("isAvailable------------------->",isAvailable);

//       if (isAvailable) {
//         // Assign groomer to the timeslot
//         slot.groomer = slot.groomer || [];
//         slot.groomer.push(groomer._id);

//         await slot.save({ session });

//         foundGroomer = groomer;
//         break;
//       }
//     }

//     if (!foundGroomer) {
//       console.log(`No available groomer found for timeslot ${slot._id}.`);
//     }

//     assignedGroomers.push(foundGroomer);
//   }

//   return assignedGroomers;
// };

// export { assignAvailableGroomer };

/**------------------ */

// const assignAvailableGroomer = async (orderDetailsDocs, session = null) => {
//   // Fetch groomers directly
//   const groomers = await User.find()
//     .populate("user_role")
//     .select("-password -refreshToken -otp -otp_time");

//   const filteredGroomers = groomers.filter(user => user.user_role?.name === "groomer");

//   const assignedGroomers = []; // tracks assigned groomers in this session call

//   for (const detail of orderDetailsDocs) {
//     const slot = await TimeSlot.findById(detail.timeslot).session(session);
//     if (!slot) {
//       console.log(`Timeslot ${detail.timeslot} not found. Skipping...`);
//       assignedGroomers.push(null);
//       continue;
//     }

//     let foundGroomer = null;

//     for (const groomer of filteredGroomers) {
//       const groomerIdStr = groomer._id.toString();

//       // 1️⃣ Skip if already assigned to this slot
//       if (slot.groomer?.some(id => id.toString() === groomerIdStr)) continue;

//       // 2️⃣ Skip if already assigned to another orderDetail in this batch
//       if (assignedGroomers.some(a => a?._id.toString() === groomerIdStr)) continue;

//       // 3️⃣ Check availability
//       const isAvailable = await isGroomerAvailable({
//         groomerId: groomer._id,
//         date: slot.bookingDate,
//         startTime: slot.startTime,
//         endTime: slot.endTime,
//       });

//       if (isAvailable) {
//         // 4️⃣ Assign groomer to the slot
//         slot.groomer = slot.groomer || [];
//         slot.groomer.push(groomer._id);
//         await slot.save({ session });

//         foundGroomer = groomer;
//         break;
//       }
//     }

//     if (!foundGroomer) {
//       console.log(`No available groomer found for timeslot ${slot._id}.`);
//     }

//     assignedGroomers.push(foundGroomer);
//   }

//   return assignedGroomers;
// };

/**--------working partial------ */

// const getGroomerAvailability = async (startDate, endDate, subServiceId) => {
//   const groomers = await User.find({ user_role: GROOMER_ROLE_ID, is_active: true });

//   const timeslots = await TimeSlot.find({
//     bookingDate: { $gte: startDate, $lte: endDate },
//     subservice: subServiceId,
//   });

//   const slotIds = timeslots.map(slot => slot._id);

//   const bookedDetails = await OrderDetails.find({
//     "orderDetails.timeslot": { $in: slotIds },
//     status: { $in: ["CONFIRMED", "PENDING"] },
//   });

//   const bookedMap = {};
//   for (const detail of bookedDetails) {
//     const tsId = detail.orderDetails.timeslot.toString();
//     const groomerId = detail.groomer?.toString();
//     if (!bookedMap[tsId]) bookedMap[tsId] = new Set();
//     if (groomerId) bookedMap[tsId].add(groomerId);
//   }

//   const availability = {};
//   for (const slot of timeslots) {
//     const slotId = slot._id.toString();
//     const bookedGroomers = bookedMap[slotId] || new Set();
//     const availableGroomers = groomers
//       .filter(g => !bookedGroomers.has(g._id.toString()))
//       .map(g => ({ _id: g._id, name: `${g.first_name} ${g.last_name}` }));

//     availability[slotId] = {
//       slot: slot,
//       availableGroomers,
//       bookedGroomers: Array.from(bookedGroomers),
//     };
//   }

//   return availability;
// };

// export { assignAvailableGroomer };

/**---testing---- */

// import { User } from "../models/User.js"; // make sure import path is correct

async function assignAvailableGroomer(orderItems, session) {
  // 1. Fetch only users whose role name is "groomer"
  const allUsers = await User.find({ is_active: true })
    .populate({
      path: 'user_role',
      match: { name: 'groomer' },
      select: '_id name',
    })
    .lean();

  const groomers = allUsers.filter(user => user.user_role !== null);

  const assignments = [];

  for (const item of orderItems) {
    const tsId = item.timeslot;
    const date = item.date;

    // 2. Find groomers already booked for this timeslot
    const existing = await OrderDetails.find({
      "orderDetails.timeslot": tsId,
      status: { $in: ["CONFIRMED", "PENDING"] },
    }).session(session);

    const bookedGroomers = new Set(existing.map(e => e.groomer?.toString()));
    const availableGroomer = groomers.find(
      g => !bookedGroomers.has(g._id.toString())
    );

    if (availableGroomer) {
      assignments.push({ _id: availableGroomer._id, assigned: true, alternatives: [] });
    } else {
      // 3. Suggest alternative timeslots and groomers
      const nearSlots = await TimeSlot.find({
        bookingDate: {
          $gte: new Date(new Date(date).setDate(new Date(date).getDate() - 1)),
          $lte: new Date(new Date(date).setDate(new Date(date).getDate() + 2))
        },
        subservice: item.subServiceId,
      }).session(session);

      const alternatives = [];

      for (const slot of nearSlots) {
        const conflicts = await OrderDetails.find({
          "orderDetails.timeslot": slot._id,
          status: { $in: ["CONFIRMED", "PENDING"] },
        }).session(session);

        const conflictGroomers = new Set(conflicts.map(c => c.groomer?.toString()));

        for (const groomer of groomers) {
          if (!conflictGroomers.has(groomer._id.toString())) {
            alternatives.push({
              groomer: groomer._id,
              timeslot: slot._id,
              date: slot.bookingDate,
            });
          }
        }
      }

      assignments.push({ _id: null, assigned: false, alternatives });
    }
  }

  return assignments;
}

export default assignAvailableGroomer;
