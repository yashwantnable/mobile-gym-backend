import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { OrderDetails } from "../models/order.model.js";
import { TimeSlot } from "../models/timeslot.model.js";
import { Cart } from "../models/cart.model.js";
import { Booking } from "../models/booking.model.js";
// export const GroomerAvailabilityService = {
//   /**
//    * Check if any groomer is available (no conflicting bookings) for a timeslot+date
//    * considering confirmed orders and pets already in carts.
//    */
//   async isAnyGroomerFreeForTimeslot(serviceId, timeslotId, date, numberOfPets = 1) {
//     const requestedSlot = await TimeSlot.findById(timeslotId).lean();
//     if (!requestedSlot) {
//       throw new Error("Invalid timeslot");
//     }

//     // ✅ Fetch all active groomers
//     const groomers = await User.find({ is_active: true })
//       .populate({
//         path: "user_role",
//         match: { name: "groomer" },
//         select: "_id"
//       })
//       .lean();

//     // ✅ No serviceProvider filtering — all active groomers are considered
//     const availableGroomers = groomers.filter(g => g.user_role);

//     if (availableGroomers.length === 0) {
//       return {
//         canAssign: false,
//         message: "No groomer available",
//         conflictedGroomers: []
//       };
//     }

//     let freeGroomersCount = 0;
//     const conflictedGroomers = [];

//     for (const groomer of availableGroomers) {
//       const existingOrders = await OrderDetails.find({
//         groomer: groomer._id,
//         status: { $in: ["CONFIRMED", "PENDING"] },
//         "orderDetails.date": date
//       })
//         .populate("orderDetails.timeslot", "startTime endTime bookingDate")
//         .lean();

//       const conflictingTimeslots = existingOrders.filter(order => {
//         const s = order.orderDetails.timeslot;
//         return (
//           s.bookingDate.toISOString() === requestedSlot.bookingDate.toISOString() &&
//           s.startTime < requestedSlot.endTime &&
//           s.endTime > requestedSlot.startTime
//         );
//       });

//       if (conflictingTimeslots.length === 0) {
//         freeGroomersCount++;
//       } else {
//         conflictedGroomers.push({
//           groomerId: groomer._id.toString(),
//           timeslots: conflictingTimeslots.map(o => ({
//             startTime: o.orderDetails.timeslot.startTime,
//             endTime: o.orderDetails.timeslot.endTime
//           }))
//         });
//       }
//     }

//     // ✅ Total pets already added in all carts for this timeslot+date
//     const existingCartPetsCount = await Cart.aggregate([
//       {
//         $match: {
//           timeslot: new mongoose.Types.ObjectId(timeslotId),
//           date: new Date(date)
//         }
//       },
//       {
//         $project: {
//           petCount: { $size: "$petTypeId" }
//         }
//       },
//       {
//         $group: {
//           _id: null,
//           totalPets: { $sum: "$petCount" }
//         }
//       }
//     ]);

//     const totalCartPetsForThisSlot = existingCartPetsCount.length > 0 ? existingCartPetsCount[0].totalPets : 0;

//     // ✅ Check against free groomers count
//     if (totalCartPetsForThisSlot + numberOfPets <= freeGroomersCount) {
//       return { canAssign: true };
//     }

//     return {
//       canAssign: false,
//       message: "No groomer free for this timeslot on this date",
//       conflictedGroomers
//     };
//   }
// };

/**------------------- */
export const GroomerAvailabilityService = {
  /**
   * Simulate per-timeslot capacity check:
   * Available groomers - (existing confirmed/pending bookings) - (cart pets)
   */
  async simulateTimeslotCapacity(serviceId, timeslotId, date, numberOfPets = 1) {
    const requestedSlot = await TimeSlot.findById(timeslotId).lean();
    if (!requestedSlot) {
      throw new Error("Invalid timeslot");
    }

    // Get active groomers
    const groomers = await User.find({ is_active: true })
      .populate({
        path: "user_role",
        match: { name: "groomer" },
        select: "_id"
      })
      .lean();

    const availableGroomers = groomers.filter(g => g.user_role);
    const conflictedGroomers = [];

    let freeGroomersCount = 0;

    for (const groomer of availableGroomers) {
      const existingOrders = await OrderDetails.find({
        groomer: groomer._id,
        status: { $in: ["CONFIRMED", "PENDING"] },
        "orderDetails.date": date
      })
        .populate("orderDetails.timeslot", "startTime endTime bookingDate")
        .lean();

      const hasConflict = existingOrders.some(order => {
        const s = order.orderDetails.timeslot;
        return (
          s.bookingDate.toISOString() === requestedSlot.bookingDate.toISOString() &&
          s.startTime < requestedSlot.endTime &&
          s.endTime > requestedSlot.startTime
        );
      });

      if (!hasConflict) {
        freeGroomersCount++;
      } else {
        conflictedGroomers.push(groomer._id.toString());
      }
    }

    // Count total pets already in Cart for this timeslot+date
    const existingCartPetsCount = await Cart.aggregate([
      {
        $match: {
          timeslot: new mongoose.Types.ObjectId(timeslotId),
          date: new Date(date)
        }
      },
      {
        $project: {
          petCount: { $size: "$petTypeId" }
        }
      },
      {
        $group: {
          _id: null,
          totalPets: { $sum: "$petCount" }
        }
      }
    ]);

    const totalCartPetsForThisSlot = existingCartPetsCount.length > 0 ? existingCartPetsCount[0].totalPets : 0;

    // // ✅ Final capacity check
    // if (totalCartPetsForThisSlot + numberOfPets <= freeGroomersCount) {
    //   return { canAssign: true };
    // }

    // return {
    //   canAssign: false,
    //   message: `Only ${freeGroomersCount - totalCartPetsForThisSlot} slot(s) remaining for this timeslot.`,
    //   conflictedGroomers
    // };
    /**------------------------------6:17 13 6 25----- */
        const existingBookingCount = await Booking.countDocuments({
          timeSlot: timeslotId,
          date: new Date(date),
          status: { $in: ["Pending", "Confirmed"] }
        });
    
        // ✅ Final capacity check
        const totalExistingPets = totalCartPetsForThisSlot + existingBookingCount;
    
        if (totalExistingPets + numberOfPets <= freeGroomersCount) {
          return { canAssign: true };
        }
    
        return {
          canAssign: false,
          message: `Only ${freeGroomersCount - totalExistingPets} slot(s) remaining for this timeslot.`,
          conflictedGroomers
        };
  }
};