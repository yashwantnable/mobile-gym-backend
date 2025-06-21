import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Cart } from "../../models/cart.model.js"
import {TimeSlot} from "../../models/timeslot.model.js"
import {OrderDetails} from "../../models/order.model.js"
import {User} from "../../models/user.model.js"
import mongoose from "mongoose";
import { GroomerAvailabilityService } from "../../utils/GroomerAvailabilityService.js";
//create cart

// CREATE cart item controller
// const createCartItem = asyncHandler(async (req, res) => {
//   const { serviceId, subServiceId, date, timeslot, petTypeId, pickupType, petWeight } = req.body;

//   const requiredFields = { serviceId, subServiceId, date, timeslot, petTypeId, petWeight };
//   const missingFields = Object.keys(requiredFields).filter(
//     (field) => !requiredFields[field] || requiredFields[field] === "undefined"
//   );

//   if (missingFields.length > 0) {
//     return res
//       .status(400)
//       .json(new ApiError(400, `Missing required field: ${missingFields.join(", ")}`));
//   }

//   if (!Array.isArray(petTypeId) || petTypeId.length === 0) {
//     return res
//       .status(400)
//       .json(new ApiError(400, "At least one petTypeId is required"));
//   }

//   const isValidTimeslot = await TimeSlot.findById(timeslot);
//   if (!isValidTimeslot) {
//     return res
//       .status(400)
//       .json(new ApiError(400, `Invalid timeslot: ${timeslot} does not exist`));
//   }

//   // Check for duplicate cart item
//   const isDuplicate = await Cart.findOne({
//     serviceId,
//     subServiceId,
//     date,
//     timeslot,
//     petWeight,
//     created_by: req.user?._id,
//     petTypeId: { $all: petTypeId, $size: petTypeId.length },
//   });

//   if (isDuplicate) {
//     return res.status(400).json(new ApiError(400, "Same cart item already exists"));
//   }

//   const newCartItem = await Cart.create({
//     serviceId,
//     subServiceId,
//     date,
//     timeslot,
//     petTypeId,
//     pickupType,
//     petWeight,
//     created_by: req.user?._id,
//   });

//   return res
//     .status(201)
//     .json(new ApiResponse(201, newCartItem, "Cart item created successfully"));
// });

/**--------------- */
// const createCartItem = asyncHandler(async (req, res) => {
//   const { serviceId, subServiceId, date, timeslot, petTypeId, pickupType, petWeight } = req.body;

//   const requiredFields = { serviceId, subServiceId, date, timeslot, petTypeId, petWeight };
//   const missingFields = Object.keys(requiredFields).filter(
//     (field) => !requiredFields[field] || requiredFields[field] === "undefined"
//   );

//   if (missingFields.length > 0) {
//     return res
//       .status(400)
//       .json(new ApiError(400, `Missing required field: ${missingFields.join(", ")}`));
//   }

//   if (!Array.isArray(petTypeId) || petTypeId.length === 0) {
//     return res
//       .status(400)
//       .json(new ApiError(400, "At least one petTypeId is required"));
//   }

//   const isValidTimeslot = await TimeSlot.findById(timeslot);
//   if (!isValidTimeslot) {
//     return res
//       .status(400)
//       .json(new ApiError(400, `Invalid timeslot: ${timeslot} does not exist`));
//   }

//   // If multiple pets, check available groomer
//   if (petTypeId.length > 1) {
//     // Find active groomers
//     const groomers = await User.find({ is_active: true })
//       .populate({
//         path: "user_role",
//         match: { name: "groomer" },
//         select: "_id name"
//       })
//       .lean();

//     const availableGroomers = groomers.filter(g => g.user_role !== null);

//     // Fetch all confirmed/pending orders for this timeslot
//     const conflicts = await OrderDetails.find({
//       status: { $in: ["CONFIRMED", "PENDING"] },
//       timeslot: timeslot
//     });

//     // Groomers already booked for this timeslot
//     const bookedGroomers = new Set(conflicts.map(c => c.groomer?.toString()));

//     // Check if any groomer is free
//     const isAnyGroomerFree = availableGroomers.some(g => !bookedGroomers.has(g._id.toString()));

//     if (!isAnyGroomerFree) {
//       return res.status(409).json(
//         new ApiResponse(
//           409,
//           null,
//           "No groomer is available for this timeslot — cart item not created"
//         )
//       );
//     }
//   }

//   // Check for duplicate cart item
//   const isDuplicate = await Cart.findOne({
//     serviceId,
//     subServiceId,
//     date,
//     timeslot,
//     petWeight,
//     created_by: req.user?._id,
//     petTypeId: { $all: petTypeId, $size: petTypeId.length },
//   });

//   if (isDuplicate) {
//     return res.status(400).json(new ApiError(400, "Same cart item already exists"));
//   }

//   const newCartItem = await Cart.create({
//     serviceId,
//     subServiceId,
//     date,
//     timeslot,
//     petTypeId,
//     pickupType,
//     petWeight,
//     created_by: req.user?._id,
//   });

//   return res
//     .status(201)
//     .json(new ApiResponse(201, newCartItem, "Cart item created successfully"));
// });

/**-----------1:30PM 13-6-2025-------------* */
// const createCartItem = asyncHandler(async (req, res) => {
//   const { serviceId, subServiceId, date, timeslot, petTypeId, pickupType, petWeight } = req.body;

//   const requiredFields = { serviceId, subServiceId, date, timeslot, petTypeId, petWeight };
//   const missingFields = Object.keys(requiredFields).filter(
//     (field) => !requiredFields[field] || requiredFields[field] === "undefined"
//   );

//   if (missingFields.length > 0) {
//     return res
//       .status(400)
//       .json(new ApiError(400, `Missing required field: ${missingFields.join(", ")}`));
//   }

//   if (!Array.isArray(petTypeId) || petTypeId.length === 0) {
//     return res
//       .status(400)
//       .json(new ApiError(400, "At least one petTypeId is required"));
//   }

//   const isValidTimeslot = await TimeSlot.findById(timeslot);
//   if (!isValidTimeslot) {
//     return res
//       .status(400)
//       .json(new ApiError(400, `Invalid timeslot: ${timeslot} does not exist`));
//   }

//   // ✅ Get total groomers for this service
//   const groomers = await User.find({ is_active: true })
//     .populate({
//       path: "user_role",
//       match: { name: "groomer" },
//       select: "_id"
//     })
//     .populate("serviceProvider", "_id")
//     .lean();

//   const availableGroomers = groomers.filter(g =>
//     g.user_role && g.serviceProvider.some(sp => sp._id.toString() === serviceId)
//   );

//   const totalAvailableGroomers = availableGroomers.length;

//   if (totalAvailableGroomers === 0) {
//     return res.status(409).json(
//       new ApiResponse(409, null, "No groomer available for this service")
//     );
//   }

//   // ✅ Count pets already booked via OrderDetails for this date+timeslot
//   const existingOrderPetsCount = await OrderDetails.countDocuments({
//     status: { $in: ["CONFIRMED", "PENDING"] },
//     "orderDetails.timeslot": timeslot,
//     "orderDetails.date": date
//   });

//   // ✅ Count pets in all carts for this date+timeslot (sum of petTypeId array lengths)
//   // const existingCartItems = await Cart.aggregate([
//   //   {
//   //     $match: {
//   //       timeslot: mongoose.Types.ObjectId(timeslot),
//   //       date: new Date(date)
//   //     }
//   //   },
//   //   {
//   //     $project: {
//   //       petCount: { $size: "$petTypeId" }
//   //     }
//   //   },
//   //   {
//   //     $group: {
//   //       _id: null,
//   //       totalPets: { $sum: "$petCount" }
//   //     }
//   //   }
//   // ]);
//   const existingCartItems = await Cart.aggregate([
//   {
//     $match: {
//       timeslot: new mongoose.Types.ObjectId(timeslot),
//       date: new Date(date)
//     }
//   },
//   {
//     $project: {
//       petCount: { $size: "$petTypeId" }
//     }
//   },
//   {
//     $group: {
//       _id: null,
//       totalPets: { $sum: "$petCount" }
//     }
//   }
// ]);


//   const existingCartPetsCount = existingCartItems.length > 0 ? existingCartItems[0].totalPets : 0;

//   // ✅ Total booked pets (orders + carts)
//   const totalPetsBookedAlready = existingOrderPetsCount + existingCartPetsCount;

//   const remainingSlots = totalAvailableGroomers - totalPetsBookedAlready;

//   // ✅ Check if adding new pets would exceed remaining slots
//   if (petTypeId.length > remainingSlots) {
//     return res.status(409).json(
//       new ApiResponse(
//         409,
//         null,
//         `Only ${remainingSlots} groomer(s) available for this timeslot — cannot add ${petTypeId.length} pet(s)`
//       )
//     );
//   }

//   // ✅ Check for duplicate cart item for this user
//   const isDuplicate = await Cart.findOne({
//     serviceId,
//     subServiceId,
//     date,
//     timeslot,
//     petWeight,
//     created_by: req.user?._id,
//     petTypeId: { $all: petTypeId, $size: petTypeId.length },
//   });

//   if (isDuplicate) {
//     return res.status(400).json(new ApiError(400, "Same cart item already exists"));
//   }

//   // ✅ Add to cart
//   const newCartItem = await Cart.create({
//     serviceId,
//     subServiceId,
//     date,
//     timeslot,
//     petTypeId,
//     pickupType,
//     petWeight,
//     created_by: req.user?._id,
//   });

//   return res
//     .status(201)
//     .json(new ApiResponse(201, newCartItem, "Cart item created successfully"));
// });

/**---------13-06-25 3:41------------- */
const createCartItem = asyncHandler(async (req, res) => {
  const { serviceId, subServiceId, date, timeslot, petTypeId, pickupType, petWeight } = req.body;

  // ✅ Validate required fields
  const requiredFields = { serviceId, subServiceId, date, timeslot, petTypeId, petWeight };
  const missingFields = Object.keys(requiredFields).filter(
    (field) => !requiredFields[field] || requiredFields[field] === "undefined"
  );

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json(new ApiError(400, `Missing required field: ${missingFields.join(", ")}`));
  }

  if (!Array.isArray(petTypeId) || petTypeId.length === 0) {
    return res
      .status(400)
      .json(new ApiError(400, "At least one petTypeId is required"));
  }

  // ✅ Validate timeslot existence
  const isValidTimeslot = await TimeSlot.findById(timeslot);
  if (!isValidTimeslot) {
    return res
      .status(400)
      .json(new ApiError(400, `Invalid timeslot: ${timeslot} does not exist`));
  }

  // ✅ Groomer availability check via shared service
  const availability = await GroomerAvailabilityService.simulateTimeslotCapacity(
    serviceId,
    timeslot,
    date,
    petTypeId.length
  );

  if (!availability.canAssign) {
    return res.status(409).json(
      new ApiResponse(
        409,
        { conflictedGroomers: availability.conflictedGroomers },
        availability.message
      )
    );
  }

  // ✅ Check for duplicate cart item for this user
  const isDuplicate = await Cart.findOne({
    serviceId,
    subServiceId,
    date,
    timeslot,
    petWeight,
    created_by: req.user?._id,
    petTypeId: { $all: petTypeId, $size: petTypeId.length },
  });

  if (isDuplicate) {
    return res.status(400).json(new ApiError(400, "Same cart item already exists"));
  }

  // ✅ Add to cart
  const newCartItem = await Cart.create({
    serviceId,
    subServiceId,
    date,
    timeslot,
    petTypeId,
    pickupType,
    petWeight,
    created_by: req.user?._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newCartItem, "Cart item created successfully"));
});




const getAllCartItems = asyncHandler(async (req, res) => {
  const cartItems = await Cart.find({ created_by: req.user._id })
    .populate("subServiceId")
    .populate("petTypeId")
    .populate("timeslot")
    .sort({ _id: -1 });

  const enhancedCartItems = cartItems.map((item) => {
    const groomingDetail = item.subServiceId?.groomingDetails?.find(
      (detail) => detail._id.toString() === item.petWeight.toString()
    );

    // Remove groomingDetails from subServiceId if it exists
    const subService = item.subServiceId?.toObject();
    if (subService?.groomingDetails) {
      delete subService.groomingDetails;
    }

    return {
      ...item.toObject(),
      subServiceId: subService,
      groomingDetail: groomingDetail || null,
    };
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, enhancedCartItems, "Cart items fetched successfully")
    );
});


//delete cart item
const deleteCartItem = asyncHandler(async (req, res) => {
  const cartId = req.params.cartId;

  if (!cartId || cartId === "undefined") {
    return res.status(400).json(new ApiError(400, "Invalid cart ID"));
  }

  const deletedItem = await Cart.findByIdAndDelete(cartId);

  if (!deletedItem) {
    return res.status(404).json(new ApiError(404, "Cart item not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Cart item deleted successfully"));
});



export {
  createCartItem,
  getAllCartItems,
  deleteCartItem,
}