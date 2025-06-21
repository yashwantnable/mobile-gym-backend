import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Cart } from "../../models/cart.model.js";
import { Order, OrderDetails } from "../../models/order.model.js"
import mongoose from "mongoose";
// import { assignAvailableGroomer } from "../../utils/groomerAssignment.js";
import assignAvailableGroomer  from "../../utils/groomerAssignment.js";
import {PromoCode} from "../../models/admin.model.js"
import {Booking} from "../../models/booking.model.js"
import NotificationService from "../../messaging_feature/services/NotificationService.js";
import { User } from "../../models/user.model.js";
import { TimeSlot } from "../../models/timeslot.model.js";
import {SubServiceType} from "../../models/subService.model.js"
// Create a new order
// const createOrder = asyncHandler(async (req, res) => {
//   console.log("createOrder body:", req.body);

//   const session = await mongoose.startSession();
//   session.startTransaction();
//   let transactionCommitted = false;

//   const {
//     total_delivery_price,
//     pay_type,
//     defaultAddress,
//     orderDetails,
//     applied_promocode,
//     promoCode,
//     paymentIntentId
//   } = req.body;

//   try {
//     const cartItems = await Cart.find({ created_by: req.user._id }).session(session);
//     if (!cartItems.length) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json(new ApiError(400, "Cart is empty"));
//     }

//     const cartSubServiceIds = cartItems.map(item => item.subServiceId.toString());
//     const invalidSubServiceIds = orderDetails.filter(item =>
//       !cartSubServiceIds.includes(item.subServiceId)
//     );
//     if (invalidSubServiceIds.length) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json(new ApiError(400, "Some items in your order are not in the cart"));
//     }

//     const cleanedOrderDetails = orderDetails.map(item => ({
//       ...item,
//       timeslot: typeof item.timeslot === 'object' && item.timeslot._id
//         ? item.timeslot._id
//         : item.timeslot
//     }));

//     // Groomer assignment logic
//     const assignedGroomers = await assignAvailableGroomer(cleanedOrderDetails, session);

//     // Create the order
//     const [createdOrder] = await Order.create([{
//     // const createdOrder = await Order.create([{
//       total_delivery_price,
//       pay_type,
//       defaultAddress,
//       promoCode,
//       paymentIntentId,
//       created_by: req.user._id
//     }], { session });

//     await Promise.all(
//       cleanedOrderDetails.map((item, index) =>
//         OrderDetails.create([{
//           order: createdOrder._id,
//           orderDetails: {
//             serviceId: item.serviceId,
//             subServiceId: item.subServiceId,
//             date: item.date,
//             timeslot: item.timeslot,
//             petTypeId: item.petTypeId,
//             pickupType: item.pickupType,
//             petWeight: item.petWeight
//           },
//           applied_promocode: applied_promocode || null,
//           groomer: assignedGroomers?.[index]?._id || null,
//           status: 'CONFIRMED', 
//           bookingStatus : 'NOT_STARTED',
//           created_by: req.user._id
//         }], { session })
//       )
//     );

//     // Apply promocode usage if applicable
// if (promoCode) {
//   const promoData = await PromoCode.findOne({
//     _id: promoCode,
//     isActive: true,
//   })
//   .select("_id code discountType startDate endDate is_validation_date maxUses usedBy")
//   .session(session);
// // console.log("promoData--------------------------->",promoData);

//   if (promoData) {
//     const now = new Date();
//     if (
//       promoData.is_validation_date &&
//       (promoData.startDate > now || promoData.endDate < now)
//     ) {
//       throw new Error("Promo code is not active currently");
//     }

//     const userIdStr = req.user._id.toString();
//     const alreadyUsed = promoData.usedBy.some(id => id.toString() === userIdStr);

//     if (alreadyUsed) {
//       throw new Error("You have already used this promo code");
//     }

//     const currentUses = parseFloat(promoData.maxUses.toString());
//     if (currentUses <= 0) {
//       throw new Error("Promo code usage limit reached");
//     }

//     // Decrease maxUses by 1
//     promoData.maxUses = mongoose.Types.Decimal128.fromString((currentUses - 1).toFixed(2));

//     // Add user to usedBy
//     promoData.usedBy.push(req.user._id);
//     await promoData.save({ session });

//     // Add user to order's promoCodeUsedBy
//     createdOrder.promoCodeUsedBy.push(req.user._id);
//     await createdOrder.save({ session });
//   } else {
//     throw new Error("Invalid or inactive promo code");
//   }
// }

//     // Clear cart after creating order
//     await Cart.deleteMany({ created_by: req.user._id }).session(session);

//     // Commit transaction
//     await session.commitTransaction();
//     transactionCommitted = true;
//     session.endSession();

//     // Populate the created order and order details
//     const populatedOrder = await Order.findById(createdOrder._id)
//       .populate("defaultAddress", "_id name city phone_number pincode street country")
//       .populate("created_by", "_id first_name email")
//       .lean();
// // console.log("populatedOrder----------------------->",populatedOrder);

//     const populatedOrderDetails = await OrderDetails.find({ order: createdOrder._id })
//       .populate("orderDetails.serviceId", "name")
//       .populate("orderDetails.subServiceId", "name")
//       .populate("orderDetails.petTypeId", "name")
//       .populate("groomer", "_id first_name last_name")
//       .lean();
// // console.log("populatedOrderDetails----------------------->",populatedOrderDetails);

//              NotificationService.sendToCustomer({
//             // userId: populatedOrder.created_by.first_name,
//             userId: populatedOrder.created_by._id,
//             title: "Order Confirmed 🎉",
//             message: `Your booking for ${populatedOrderDetails.length} service(s) on ${new Date(populatedOrder.order_date).toDateString()} has been confirmed.`,
//             type: "Booking",
//           });
      
//     return res.status(201).json(new ApiResponse(201, {
//       order: populatedOrder,
//       orderDetails: populatedOrderDetails
//     }, "Order created successfully"));

//   } catch (err) {
//     if (!transactionCommitted) {
//       await session.abortTransaction();
//     }
//     session.endSession();
//     console.error("createOrder error:", err);
//     res.status(500).json(new ApiError(500, err.message));
//   }
// });

/**------------------------- */
// const createOrder = asyncHandler(async (req, res) => {
//   console.log("createOrder body:", req.body);

//   const session = await mongoose.startSession();
//   session.startTransaction();
//   let transactionCommitted = false;

//   const {
//     total_delivery_price,
//     pay_type,
//     defaultAddress,
//     orderDetails,
//     applied_promocode,
//     promoCode,
//     paymentIntentId
//   } = req.body;

//   try {
//     // 1. Get cart items and validate
//     const cartItems = await Cart.find({ created_by: req.user._id }).session(session);
//     if (!cartItems.length) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json(new ApiError(400, "Cart is empty"));
//     }

//     // 2. Validate order details against cart items
//     const cartSubServiceIds = cartItems.map(item => item.subServiceId.toString());
//     const invalidSubServiceIds = orderDetails.filter(item =>
//       !cartSubServiceIds.includes(item.subServiceId)
//     );
//     if (invalidSubServiceIds.length) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json(new ApiError(400, "Some items in your order are not in the cart"));
//     }

//     // 3. Prepare order details with proper petTypeId
//     const cleanedOrderDetails = orderDetails.map((item, index) => {
//       const cartItem = cartItems.find(ci => 
//         ci.subServiceId.toString() === item.subServiceId
//       );
      
//       if (!cartItem || !cartItem.petTypeId || cartItem.petTypeId.length === 0) {
//         throw new Error(`No pets selected for service ${item.subServiceId}`);
//       }

//       return {
//         ...item,
//         petTypeId: item.petTypeId || cartItem.petTypeId, // Use from order or fallback to cart
//         timeslot: typeof item.timeslot === 'object' && item.timeslot._id
//           ? item.timeslot._id
//           : item.timeslot,
//         petWeight: item.petWeight || cartItem.petWeight // Ensure petWeight is properly set
//       };
//     });

//     // 4. Validate all order details have petTypeId
//     const missingPetDetails = cleanedOrderDetails.filter(
//       item => !item.petTypeId || item.petTypeId.length === 0
//     );
//     if (missingPetDetails.length > 0) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json(
//         new ApiError(400, "Please select pets for all services")
//       );
//     }

//     // 5. Groomer assignment logic
//     const assignedGroomers = await assignAvailableGroomer(cleanedOrderDetails, session);
//     console.log("assignedGroomers--------%%%%%------------------>",assignedGroomers);
    
//     // 6. Create the order
//     const [createdOrder] = await Order.create([{
//       total_delivery_price,
//       pay_type,
//       defaultAddress,
//       promoCode,
//       paymentIntentId,
//       created_by: req.user._id
//     }], { session });

//     // 7. Create order details
//     await Promise.all(
//       cleanedOrderDetails.map((item, index) =>
//         OrderDetails.create([{
//           order: createdOrder._id,
//           orderDetails: {
//             serviceId: item.serviceId,
//             subServiceId: item.subServiceId,
//             date: item.date,
//             timeslot: item.timeslot,
//             petTypeId: item.petTypeId, // Now guaranteed to have at least one pet
//             pickupType: item.pickupType,
//             petWeight: item.petWeight
//           },
//           applied_promocode: applied_promocode || null,
//           groomer: assignedGroomers?.[index]?._id || null,
//           status: 'CONFIRMED',
//           bookingStatus: 'NOT_STARTED',
//           created_by: req.user._id
//         }], { session })
//       )
//     );

//     // 8. Apply promocode usage if applicable
//     if (promoCode) {
//       const promoData = await PromoCode.findOne({
//         _id: promoCode,
//         isActive: true,
//       })
//       .select("_id code discountType startDate endDate is_validation_date maxUses usedBy")
//       .session(session);

//       if (promoData) {
//         const now = new Date();
//         if (
//           promoData.is_validation_date &&
//           (promoData.startDate > now || promoData.endDate < now)
//         ) {
//           throw new Error("Promo code is not active currently");
//         }

//         const userIdStr = req.user._id.toString();
//         const alreadyUsed = promoData.usedBy.some(id => id.toString() === userIdStr);

//         if (alreadyUsed) {
//           throw new Error("You have already used this promo code");
//         }

//         const currentUses = parseFloat(promoData.maxUses.toString());
//         if (currentUses <= 0) {
//           throw new Error("Promo code usage limit reached");
//         }

//         promoData.maxUses = mongoose.Types.Decimal128.fromString((currentUses - 1).toFixed(2));
//         promoData.usedBy.push(req.user._id);
//         await promoData.save({ session });

//         createdOrder.promoCodeUsedBy.push(req.user._id);
//         await createdOrder.save({ session });
//       } else {
//         throw new Error("Invalid or inactive promo code");
//       }
//     }

//     // 9. Clear cart after creating order
//     await Cart.deleteMany({ created_by: req.user._id }).session(session);

//     // 10. Commit transaction
//     await session.commitTransaction();
//     transactionCommitted = true;
//     session.endSession();

//     // 11. Populate the created order and order details
//     const populatedOrder = await Order.findById(createdOrder._id)
//       .populate("defaultAddress", "_id name city phone_number pincode street country")
//       .populate("created_by", "_id first_name email")
//       .lean();

//     const populatedOrderDetails = await OrderDetails.find({ order: createdOrder._id })
//       .populate("orderDetails.serviceId", "name")
//       .populate("orderDetails.subServiceId", "name")
//       .populate("orderDetails.petTypeId", "name")
//       .populate("groomer", "_id first_name last_name")
//       .lean();

//     // 12. Send notification
//     NotificationService.sendToCustomer({
//       userId: populatedOrder.created_by._id,
//       title: "Order Confirmed 🎉",
//       message: `Your booking for ${populatedOrderDetails.length} service(s) on ${new Date(populatedOrder.order_date).toDateString()} has been confirmed.`,
//       type: "Booking",
//     });

//     return res.status(201).json(new ApiResponse(201, {
//       order: populatedOrder,
//       orderDetails: populatedOrderDetails
//     }, "Order created successfully"));

//   } catch (err) {
//     if (!transactionCommitted) {
//       await session.abortTransaction();
//     }
//     session.endSession();
//     console.error("createOrder error:", err);
//     res.status(500).json(new ApiError(500, err.message));
//   }
// });
// update order status

/**----testing work but timeslot full then internal server erro----------------- */

// const createOrder = asyncHandler(async (req, res) => {
//   console.log("createOrder body:", req.body);

//   const session = await mongoose.startSession();
//   session.startTransaction();
//   let transactionCommitted = false;

//   const {
//     total_delivery_price,
//     pay_type,
//     defaultAddress,
//     orderDetails,
//     applied_promocode,
//     promoCode,
//     paymentIntentId
//   } = req.body;

//   try {
//     // 1. Get cart items and validate
//     const cartItems = await Cart.find({ created_by: req.user._id }).session(session);
//     if (!cartItems.length) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json(new ApiError(400, "Cart is empty"));
//     }

//     // 2. Validate order details against cart items
//     const cartSubServiceIds = cartItems.map(item => item.subServiceId.toString());
//     const invalidSubServiceIds = orderDetails.filter(item =>
//       !cartSubServiceIds.includes(item.subServiceId)
//     );
//     if (invalidSubServiceIds.length) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json(new ApiError(400, "Some items in your order are not in the cart"));
//     }

//     // 3. Prepare order details with proper petTypeId
//     const cleanedOrderDetails = orderDetails.map((item) => {
//       const cartItem = cartItems.find(ci => 
//         ci.subServiceId.toString() === item.subServiceId
//       );

//       if (!cartItem || !cartItem.petTypeId || cartItem.petTypeId.length === 0) {
//         throw new Error(`No pets selected for service ${item.subServiceId}`);
//       }

//       return {
//         ...item,
//         petTypeId: item.petTypeId || cartItem.petTypeId,
//         timeslot: typeof item.timeslot === 'object' && item.timeslot._id
//           ? item.timeslot._id
//           : item.timeslot,
//         petWeight: item.petWeight || cartItem.petWeight
//       };
//     });

//     // 4. Validate all order details have petTypeId
//     const missingPetDetails = cleanedOrderDetails.filter(
//       item => !item.petTypeId || item.petTypeId.length === 0
//     );
//     if (missingPetDetails.length > 0) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json(
//         new ApiError(400, "Please select pets for all services")
//       );
//     }

//     // 5. Groomer assignment logic with fallback alternatives
//     const assignedGroomers = await assignAvailableGroomer(cleanedOrderDetails, session);
//     const unassignedItems = assignedGroomers.filter(g => !g.assigned);

//     if (unassignedItems.length > 0) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(409).json(new ApiResponse(409, assignedGroomers, "Some services could not be assigned a groomer. Please review available alternatives."));
//     }

//     // 6. Create the order
//     const [createdOrder] = await Order.create([{
//       total_delivery_price,
//       pay_type,
//       defaultAddress,
//       promoCode,
//       paymentIntentId,
//       created_by: req.user._id
//     }], { session });

//     // 7. Create order details
//     await Promise.all(
//       cleanedOrderDetails.map((item, index) =>
//         OrderDetails.create([{
//           order: createdOrder._id,
//           orderDetails: {
//             serviceId: item.serviceId,
//             subServiceId: item.subServiceId,
//             date: item.date,
//             timeslot: item.timeslot,
//             petTypeId: item.petTypeId,
//             pickupType: item.pickupType,
//             petWeight: item.petWeight
//           },
//           applied_promocode: applied_promocode || null,
//           groomer: assignedGroomers?.[index]?._id || null,
//           status: 'CONFIRMED',
//           bookingStatus: 'NOT_STARTED',
//           created_by: req.user._id
//         }], { session })
//       )
//     );

//     // 8. Promo code usage
//     if (promoCode) {
//       const promoData = await PromoCode.findOne({
//         _id: promoCode,
//         isActive: true,
//       })
//       .select("_id code discountType startDate endDate is_validation_date maxUses usedBy")
//       .session(session);

//       if (promoData) {
//         const now = new Date();
//         if (
//           promoData.is_validation_date &&
//           (promoData.startDate > now || promoData.endDate < now)
//         ) {
//           throw new Error("Promo code is not active currently");
//         }

//         const userIdStr = req.user._id.toString();
//         const alreadyUsed = promoData.usedBy.some(id => id.toString() === userIdStr);

//         if (alreadyUsed) {
//           throw new Error("You have already used this promo code");
//         }

//         const currentUses = parseFloat(promoData.maxUses.toString());
//         if (currentUses <= 0) {
//           throw new Error("Promo code usage limit reached");
//         }

//         promoData.maxUses = mongoose.Types.Decimal128.fromString((currentUses - 1).toFixed(2));
//         promoData.usedBy.push(req.user._id);
//         await promoData.save({ session });

//         createdOrder.promoCodeUsedBy.push(req.user._id);
//         await createdOrder.save({ session });
//       } else {
//         throw new Error("Invalid or inactive promo code");
//       }
//     }

//     // 9. Clear cart
//     await Cart.deleteMany({ created_by: req.user._id }).session(session);

//     // 10. Commit transaction
//     await session.commitTransaction();
//     transactionCommitted = true;
//     session.endSession();

//     // 11. Populate order and details
//     const populatedOrder = await Order.findById(createdOrder._id)
//       .populate("defaultAddress", "_id name city phone_number pincode street country")
//       .populate("created_by", "_id first_name email")
//       .lean();

//     const populatedOrderDetails = await OrderDetails.find({ order: createdOrder._id })
//       .populate("orderDetails.serviceId", "name")
//       .populate("orderDetails.subServiceId", "name")
//       .populate("orderDetails.petTypeId", "name")
//       .populate("groomer", "_id first_name last_name")
//       .lean();

//     // 12. Notify user
//     NotificationService.sendToCustomer({
//       userId: populatedOrder.created_by._id,
//       title: "Order Confirmed 🎉",
//       message: `Your booking for ${populatedOrderDetails.length} service(s) on ${new Date(populatedOrder.order_date).toDateString()} has been confirmed.`,
//       type: "Booking",
//     });

//     return res.status(201).json(new ApiResponse(201, {
//       order: populatedOrder,
//       orderDetails: populatedOrderDetails
//     }, "Order created successfully"));

//   } catch (err) {
//     if (!transactionCommitted) {
//       await session.abortTransaction();
//     }
//     session.endSession();
//     console.error("createOrder error:", err);
//     res.status(500).json(new ApiError(500, err.message));
//   }
// });

/**-------- */

// const createOrder = asyncHandler(async (req, res) => {
//   console.log("createOrder body:", req.body);

//   const session = await mongoose.startSession();
//   session.startTransaction();
//   let transactionCommitted = false;

//   const {
//     total_delivery_price,
//     pay_type,
//     defaultAddress,
//     orderDetails,
//     applied_promocode,
//     promoCode,
//     paymentIntentId
//   } = req.body;

//   try {
//     const cartItems = await Cart.find({ created_by: req.user._id }).session(session);
//     if (!cartItems.length) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json(new ApiError(400, "Cart is empty"));
//     }

//     const cartSubServiceIds = cartItems.map(item => item.subServiceId.toString());
//     const invalidSubServiceIds = orderDetails.filter(item =>
//       !cartSubServiceIds.includes(item.subServiceId)
//     );
//     if (invalidSubServiceIds.length) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json(new ApiError(400, "Some items in your order are not in the cart"));
//     }

//     // Check for null timeslot before processing further
//     const invalidTimeslotItems = orderDetails.filter(item => !item.timeslot);
//     if (invalidTimeslotItems.length > 0) {
//       const subServiceId = invalidTimeslotItems[0].subServiceId;
//       const date = new Date(orderDetails[0].date);

//       const nearbySlots = await TimeSlot.find({
//         subservice: subServiceId,
//         bookingDate: {
//           $gte: new Date(date.setDate(date.getDate() - 1)),
//           $lte: new Date(date.setDate(date.getDate() + 2))
//         }
//       }).session(session);

//       await session.abortTransaction();
//       session.endSession();
//       return res.status(409).json(
//         new ApiResponse(409, nearbySlots, "No timeslot selected. Please choose one of the available options.")
//       );
//     }

//     const cleanedOrderDetails = orderDetails.map((item) => {
//       const cartItem = cartItems.find(ci => 
//         ci.subServiceId.toString() === item.subServiceId
//       );

//       if (!cartItem || !cartItem.petTypeId || cartItem.petTypeId.length === 0) {
//         throw new Error(`No pets selected for service ${item.subServiceId}`);
//       }

//       return {
//         ...item,
//         petTypeId: item.petTypeId || cartItem.petTypeId,
//         timeslot: typeof item.timeslot === 'object' && item.timeslot._id
//           ? item.timeslot._id
//           : item.timeslot,
//         petWeight: item.petWeight || cartItem.petWeight
//       };
//     });

//     const missingPetDetails = cleanedOrderDetails.filter(
//       item => !item.petTypeId || item.petTypeId.length === 0
//     );
//     if (missingPetDetails.length > 0) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json(
//         new ApiError(400, "Please select pets for all services")
//       );
//     }

//     const missingTimeslots = cleanedOrderDetails.filter(item => !item.timeslot);
//     if (missingTimeslots.length > 0) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json(
//         new ApiError(400, "Please select a valid timeslot for all services")
//       );
//     }

//     const groomers = await User.find({ is_active: true })
//       .populate({
//         path: 'user_role',
//         match: { name: 'groomer' },
//         select: '_id name'
//       })
//       .lean();

//     const availableGroomers = groomers.filter(g => g.user_role !== null);
//     const assignments = [];

//     for (const item of cleanedOrderDetails) {
//       const ts = await TimeSlot.findById(item.timeslot).session(session);

//       const conflicts = await OrderDetails.find({
//         status: { $in: ["CONFIRMED", "PENDING"] },
//       })
//         .populate("orderDetails.timeslot")
//         .session(session);

//       const bookedGroomers = new Set(
//         conflicts
//           .filter(c => {
//             const s = c.orderDetails?.timeslot;
//             return (
//               s &&
//               s.bookingDate.toISOString() === ts.bookingDate.toISOString() &&
//               s.startTime < ts.endTime &&
//               s.endTime > ts.startTime
//             );
//           })
//           .map(c => c.groomer?.toString())
//       );

//       const available = availableGroomers.find(g => !bookedGroomers.has(g._id.toString()));

//       if (available) {
//         assignments.push({ _id: available._id, assigned: true, alternatives: [] });
//       } else {
//         const alternatives = [];
//         const nearSlots = await TimeSlot.find({
//           bookingDate: {
//             $gte: new Date(new Date(ts.bookingDate).setDate(new Date(ts.bookingDate).getDate() - 1)),
//             $lte: new Date(new Date(ts.bookingDate).setDate(new Date(ts.bookingDate).getDate() + 2))
//           },
//           subservice: item.subServiceId
//         }).session(session);

//         for (const altSlot of nearSlots) {
//           const altConflicts = await OrderDetails.find({
//             status: { $in: ["CONFIRMED", "PENDING"] }
//           })
//             .populate("orderDetails.timeslot")
//             .session(session);

//           const altBooked = new Set(
//             altConflicts
//               .filter(c => {
//                 const s = c.orderDetails?.timeslot;
//                 return (
//                   s &&
//                   s.bookingDate.toISOString() === altSlot.bookingDate.toISOString() &&
//                   s.startTime < altSlot.endTime &&
//                   s.endTime > altSlot.startTime
//                 );
//               })
//               .map(c => c.groomer?.toString())
//           );

//           for (const g of availableGroomers) {
//             if (!altBooked.has(g._id.toString())) {
//               alternatives.push({ groomer: g._id, timeslot: altSlot._id, date: altSlot.bookingDate });
//             }
//           }
//         }

//         assignments.push({ _id: null, assigned: false, alternatives });
//       }
//     }

//     const unassigned = assignments.filter(a => !a.assigned);
//     if (unassigned.length > 0) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(409).json(new ApiResponse(409, assignments, "No groomer was available during the requested time."));
//     }

//     // 6. Create the order
//     const [createdOrder] = await Order.create([{
//       total_delivery_price,
//       pay_type,
//       defaultAddress,
//       promoCode,
//       paymentIntentId,
//       created_by: req.user._id
//     }], { session });

//     // 7. Create order details
//     await Promise.all(
//       cleanedOrderDetails.map((item, index) =>
//         OrderDetails.create([{
//           order: createdOrder._id,
//           orderDetails: {
//             serviceId: item.serviceId,
//             subServiceId: item.subServiceId,
//             date: item.date,
//             timeslot: item.timeslot,
//             petTypeId: item.petTypeId,
//             pickupType: item.pickupType,
//             petWeight: item.petWeight
//           },
//           applied_promocode: applied_promocode || null,
//           groomer: assignments?.[index]?._id || null,
//           status: 'CONFIRMED',
//           bookingStatus: 'NOT_STARTED',
//           created_by: req.user._id
//         }], { session })
//       )
//     );

//     // 8. Promo code logic (if any)
//     if (promoCode) {
//       const promoData = await PromoCode.findOne({
//         _id: promoCode,
//         isActive: true,
//       })
//       .select("_id code discountType startDate endDate is_validation_date maxUses usedBy")
//       .session(session);

//       if (promoData) {
//         const now = new Date();
//         if (
//           promoData.is_validation_date &&
//           (promoData.startDate > now || promoData.endDate < now)
//         ) {
//           throw new Error("Promo code is not active currently");
//         }

//         const userIdStr = req.user._id.toString();
//         const alreadyUsed = promoData.usedBy.some(id => id.toString() === userIdStr);

//         if (alreadyUsed) {
//           throw new Error("You have already used this promo code");
//         }

//         const currentUses = parseFloat(promoData.maxUses.toString());
//         if (currentUses <= 0) {
//           throw new Error("Promo code usage limit reached");
//         }

//         promoData.maxUses = mongoose.Types.Decimal128.fromString((currentUses - 1).toFixed(2));
//         promoData.usedBy.push(req.user._id);
//         await promoData.save({ session });

//         createdOrder.promoCodeUsedBy.push(req.user._id);
//         await createdOrder.save({ session });
//       } else {
//         throw new Error("Invalid or inactive promo code");
//       }
//     }

//     // 9. Clear the cart
//     await Cart.deleteMany({ created_by: req.user._id }).session(session);

//     // 10. Commit transaction
//     await session.commitTransaction();
//     transactionCommitted = true;
//     session.endSession();

//     // 11. Populate order and details for response
//     const populatedOrder = await Order.findById(createdOrder._id)
//       .populate("defaultAddress", "_id name city phone_number pincode street country")
//       .populate("created_by", "_id first_name email")
//       .lean();

//     const populatedOrderDetails = await OrderDetails.find({ order: createdOrder._id })
//       .populate("orderDetails.serviceId", "name")
//       .populate("orderDetails.subServiceId", "name")
//       .populate("orderDetails.petTypeId", "name")
//       .populate("groomer", "_id first_name last_name")
//       .lean();

//     // 12. Send confirmation notification
//     NotificationService.sendToCustomer({
//       userId: populatedOrder.created_by._id,
//       title: "Order Confirmed 🎉",
//       message: `Your booking for ${populatedOrderDetails.length} service(s) on ${new Date(populatedOrder.order_date).toDateString()} has been confirmed.`,
//       type: "Booking",
//     });

//     return res.status(201).json(new ApiResponse(201, {
//       order: populatedOrder,
//       orderDetails: populatedOrderDetails
//     }, "Order created successfully"));
//   } catch (err) {
//     if (!transactionCommitted) {
//       await session.abortTransaction();
//     }
//     session.endSession();
//     console.error("createOrder error:", err);
//     res.status(500).json(new ApiError(500, err.message));
//   }
// });

/***---conflict when same groomer of different subservice----- */

// const createOrder = asyncHandler(async (req, res) => {
//   console.log("createOrder body:", req.body);

//   const session = await mongoose.startSession();
//   session.startTransaction();
//   let transactionCommitted = false;

//   const {
//     total_delivery_price,
//     pay_type,
//     defaultAddress,
//     orderDetails,
//     applied_promocode,
//     promoCode,
//     paymentIntentId
//   } = req.body;

//   try {
//     const cartItems = await Cart.find({ created_by: req.user._id }).session(session);
//     if (!cartItems.length) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json(new ApiError(400, "Cart is empty"));
//     }

//     // Expand orderDetails to one per pet
//     let expandedOrderDetails = [];

//     orderDetails.forEach((item) => {
//       const cartItem = cartItems.find(ci => ci.subServiceId.toString() === item.subServiceId);
//       if (!cartItem || !cartItem.petTypeId || cartItem.petTypeId.length === 0) {
//         throw new Error(`No pets selected for service ${item.subServiceId}`);
//       }

//       const petWeight = item.petWeight || cartItem.petWeight;
//       const timeslot = typeof item.timeslot === 'object' && item.timeslot._id
//         ? item.timeslot._id
//         : item.timeslot;

//       cartItem.petTypeId.forEach(petId => {
//         expandedOrderDetails.push({
//           ...item,
//           petTypeId: petId,
//           timeslot,
//           petWeight
//         });
//       });
//     });

//     // Groomer assignment
//     const groomers = await User.find({ is_active: true })
//       .populate({ path: 'user_role', match: { name: 'groomer' }, select: '_id name' })
//       .lean();
//     const availableGroomers = groomers.filter(g => g.user_role);

//     const uniqueCombos = [...new Set(expandedOrderDetails.map(i => `${i.timeslot}_${i.subServiceId}`))];

//     for (const combo of uniqueCombos) {
//       const [timeslotId, subServiceId] = combo.split('_');
//       const ts = await TimeSlot.findById(timeslotId).session(session);

//       const conflicts = await OrderDetails.find({
//         status: { $in: ["CONFIRMED", "PENDING"] }
//       }).populate("orderDetails.timeslot").session(session);

//       const bookedGroomers = new Set(
//         conflicts.filter(c => {
//           const s = c.orderDetails?.timeslot;
//           return s && s.bookingDate.toISOString() === ts.bookingDate.toISOString() && s.startTime < ts.endTime && s.endTime > ts.startTime;
//         }).map(c => c.groomer?.toString())
//       );

//       const available = availableGroomers.find(g => !bookedGroomers.has(g._id.toString()));

//       if (available) {
//         expandedOrderDetails
//           .filter(d => d.timeslot === timeslotId && d.subServiceId === subServiceId)
//           .forEach(d => d.assignedGroomer = available._id);
//       } else {
//         throw new Error(`No groomer available for timeslot ${ts.bookingDate}`);
//       }
//     }

//     const [createdOrder] = await Order.create([{
//       total_delivery_price,
//       pay_type,
//       defaultAddress,
//       promoCode,
//       paymentIntentId,
//       created_by: req.user._id
//     }], { session });

//     await Promise.all(
//       expandedOrderDetails.map(item =>
//         OrderDetails.create([{
//           order: createdOrder._id,
//           orderDetails: {
//             serviceId: item.serviceId,
//             subServiceId: item.subServiceId,
//             date: item.date,
//             timeslot: item.timeslot,
//             petTypeId: item.petTypeId,
//             pickupType: item.pickupType,
//             petWeight: item.petWeight
//           },
//           applied_promocode: applied_promocode || null,
//           groomer: item.assignedGroomer || null,
//           status: 'CONFIRMED',
//           bookingStatus: 'NOT_STARTED',
//           created_by: req.user._id
//         }], { session })
//       )
//     );

//     // Promo logic
//     if (promoCode) {
//       const promoData = await PromoCode.findOne({ _id: promoCode, isActive: true })
//         .select("_id code discountType startDate endDate is_validation_date maxUses usedBy")
//         .session(session);

//       if (promoData) {
//         const now = new Date();
//         if (promoData.is_validation_date && (promoData.startDate > now || promoData.endDate < now)) {
//           throw new Error("Promo code is not active currently");
//         }
//         const userIdStr = req.user._id.toString();
//         const alreadyUsed = promoData.usedBy.some(id => id.toString() === userIdStr);
//         if (alreadyUsed) throw new Error("You have already used this promo code");
//         const currentUses = parseFloat(promoData.maxUses.toString());
//         if (currentUses <= 0) throw new Error("Promo code usage limit reached");
//         promoData.maxUses = mongoose.Types.Decimal128.fromString((currentUses - 1).toFixed(2));
//         promoData.usedBy.push(req.user._id);
//         await promoData.save({ session });
//         createdOrder.promoCodeUsedBy.push(req.user._id);
//         await createdOrder.save({ session });
//       } else {
//         throw new Error("Invalid or inactive promo code");
//       }
//     }

//     await Cart.deleteMany({ created_by: req.user._id }).session(session);
//     await session.commitTransaction();
//     transactionCommitted = true;
//     session.endSession();

//     const populatedOrder = await Order.findById(createdOrder._id)
//       .populate("defaultAddress", "_id name city phone_number pincode street country")
//       .populate("created_by", "_id first_name email")
//       .lean();

//     const populatedOrderDetails = await OrderDetails.find({ order: createdOrder._id })
//       .populate("orderDetails.serviceId", "name")
//       .populate("orderDetails.subServiceId", "name")
//       .populate("orderDetails.petTypeId", "name")
//       .populate("groomer", "_id first_name last_name")
//       .lean();

//     NotificationService.sendToCustomer({
//       userId: populatedOrder.created_by._id,
//       title: "Order Confirmed 🎉",
//       message: `Your booking for ${populatedOrderDetails.length} service(s) on ${new Date(populatedOrder.order_date).toDateString()} has been confirmed.`,
//       type: "Booking",
//     });

//     return res.status(201).json(new ApiResponse(201, {
//       order: populatedOrder,
//       orderDetails: populatedOrderDetails
//     }, "Order created successfully"));
//   } catch (err) {
//     if (!transactionCommitted) await session.abortTransaction();
//     session.endSession();
//     console.error("createOrder error:", err);
//     res.status(500).json(new ApiError(500, err.message));
//   }
// });
/**-------working well 100 %-------4:50 */
// const createOrder = asyncHandler(async (req, res) => {
//   console.log("createOrder body:", req.body);

//   const session = await mongoose.startSession();
//   session.startTransaction();
//   let transactionCommitted = false;

//   const {
//     total_delivery_price,
//     pay_type,
//     defaultAddress,
//     orderDetails,
//     applied_promocode,
//     promoCode,
//     paymentIntentId
//   } = req.body;

//   try {
//     const cartItems = await Cart.find({ created_by: req.user._id }).session(session);
//     if (!cartItems.length) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json(new ApiError(400, "Cart is empty"));
//     }

//     // Expand orderDetails to one per pet
//     let expandedOrderDetails = [];

//     orderDetails.forEach((item) => {
//       const cartItem = cartItems.find(ci => ci.subServiceId.toString() === item.subServiceId);
//       if (!cartItem || !cartItem.petTypeId || cartItem.petTypeId.length === 0) {
//         throw new Error(`No pets selected for service ${item.subServiceId}`);
//       }

//       const petWeight = item.petWeight || cartItem.petWeight;
//       const timeslot = typeof item.timeslot === 'object' && item.timeslot._id
//         ? item.timeslot._id
//         : item.timeslot;

//       cartItem.petTypeId.forEach(petId => {
//         expandedOrderDetails.push({
//           ...item,
//           petTypeId: petId,
//           timeslot,
//           petWeight
//         });
//       });
//     });

//     // Groomer assignment
//     const groomers = await User.find({ is_active: true })
//       .populate({ path: 'user_role', match: { name: 'groomer' }, select: '_id name' })
//       .lean();
//     const availableGroomers = groomers.filter(g => g.user_role);

//     const uniqueCombos = [...new Set(expandedOrderDetails.map(i => `${i.timeslot}_${i.subServiceId}`))];

//     for (const combo of uniqueCombos) {
//       const [timeslotId, subServiceId] = combo.split('_');
//       const ts = await TimeSlot.findById(timeslotId).session(session);

//       const conflicts = await OrderDetails.find({
//         status: { $in: ["CONFIRMED", "PENDING"] }
//       }).populate("orderDetails.timeslot").session(session);

//       const bookedGroomers = new Set(
//         conflicts.filter(c => {
//           const s = c.orderDetails?.timeslot;
//           const subMatch = c.orderDetails?.subServiceId?.toString() === subServiceId;
//           return s &&
//             subMatch &&
//             s.bookingDate.toISOString() === ts.bookingDate.toISOString() &&
//             s.startTime < ts.endTime &&
//             s.endTime > ts.startTime;
//         }).map(c => c.groomer?.toString())
//       );

//       const available = availableGroomers.find(g => !bookedGroomers.has(g._id.toString()));

//       if (available) {
//         expandedOrderDetails
//           .filter(d => d.timeslot === timeslotId && d.subServiceId === subServiceId)
//           .forEach(d => d.assignedGroomer = available._id);
//       } else {
//         throw new Error(`No groomer available for timeslot ${ts.bookingDate}`);
//       }
//     }

//     const [createdOrder] = await Order.create([{
//       total_delivery_price,
//       pay_type,
//       defaultAddress,
//       promoCode,
//       paymentIntentId,
//       created_by: req.user._id
//     }], { session });

//     await Promise.all(
//       expandedOrderDetails.map(item =>
//         OrderDetails.create([{
//           order: createdOrder._id,
//           orderDetails: {
//             serviceId: item.serviceId,
//             subServiceId: item.subServiceId,
//             date: item.date,
//             timeslot: item.timeslot,
//             petTypeId: item.petTypeId,
//             pickupType: item.pickupType,
//             petWeight: item.petWeight
//           },
//           applied_promocode: applied_promocode || null,
//           groomer: item.assignedGroomer || null,
//           status: 'CONFIRMED',
//           bookingStatus: 'NOT_STARTED',
//           created_by: req.user._id
//         }], { session })
//       )
//     );

//     // Promo logic
//     if (promoCode) {
//       const promoData = await PromoCode.findOne({ _id: promoCode, isActive: true })
//         .select("_id code discountType startDate endDate is_validation_date maxUses usedBy")
//         .session(session);

//       if (promoData) {
//         const now = new Date();
//         if (promoData.is_validation_date && (promoData.startDate > now || promoData.endDate < now)) {
//           throw new Error("Promo code is not active currently");
//         }
//         const userIdStr = req.user._id.toString();
//         const alreadyUsed = promoData.usedBy.some(id => id.toString() === userIdStr);
//         if (alreadyUsed) throw new Error("You have already used this promo code");
//         const currentUses = parseFloat(promoData.maxUses.toString());
//         if (currentUses <= 0) throw new Error("Promo code usage limit reached");
//         promoData.maxUses = mongoose.Types.Decimal128.fromString((currentUses - 1).toFixed(2));
//         promoData.usedBy.push(req.user._id);
//         await promoData.save({ session });
//         createdOrder.promoCodeUsedBy.push(req.user._id);
//         await createdOrder.save({ session });
//       } else {
//         throw new Error("Invalid or inactive promo code");
//       }
//     }

//     await Cart.deleteMany({ created_by: req.user._id }).session(session);
//     await session.commitTransaction();
//     transactionCommitted = true;
//     session.endSession();

//     const populatedOrder = await Order.findById(createdOrder._id)
//       .populate("defaultAddress", "_id name city phone_number pincode street country")
//       .populate("created_by", "_id first_name email")
//       .lean();

//     const populatedOrderDetails = await OrderDetails.find({ order: createdOrder._id })
//       .populate("orderDetails.serviceId", "name")
//       .populate("orderDetails.subServiceId", "name")
//       .populate("orderDetails.petTypeId", "name")
//       .populate("groomer", "_id first_name last_name")
//       .lean();

//     NotificationService.sendToCustomer({
//       userId: populatedOrder.created_by._id,
//       title: "Order Confirmed 🎉",
//       message: `Your booking for ${populatedOrderDetails.length} service(s) on ${new Date(populatedOrder.order_date).toDateString()} has been confirmed.`,
//       type: "Booking",
//     });

//     return res.status(201).json(new ApiResponse(201, {
//       order: populatedOrder,
//       orderDetails: populatedOrderDetails
//     }, "Order created successfully"));
//   } catch (err) {
//     if (!transactionCommitted) await session.abortTransaction();
//     session.endSession();
//     console.error("createOrder error:", err);
//     res.status(500).json(new ApiError(500, err.message));
//   }
// });
/**9-6-25 10:30PM */
// const createOrder = asyncHandler(async (req, res) => {
//   console.log("createOrder body:", req.body);

//   const session = await mongoose.startSession();
//   session.startTransaction();
//   let transactionCommitted = false;

//   const {
//     total_delivery_price,
//     pay_type,
//     defaultAddress,
//     orderDetails,
//     applied_promocode,
//     promoCode,
//     paymentIntentId
//   } = req.body;

//   try {
//     // 1. Validate cart items
//     const cartItems = await Cart.find({ created_by: req.user._id }).session(session);
//     if (!cartItems.length) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json(new ApiError(400, "Cart is empty"));
//     }

//     // 2. Expand order details for each pet
//     let expandedOrderDetails = [];
//     orderDetails.forEach((item) => {
//       console.log("Received orderDetail item:", JSON.stringify(item));
//       const cartItem = cartItems.find(ci => ci.subServiceId.toString() === item.subServiceId);
//       if (!cartItem || !Array.isArray(cartItem.petTypeId) || cartItem.petTypeId.length === 0) {
//         throw new Error(`No pets selected for service ${item.subServiceId}`);
//       }

//       const petWeight = item.petWeight || cartItem.petWeight;
//       cartItem.petTypeId.forEach(petId => {
//         expandedOrderDetails.push({
//           ...item,
//           petTypeId: petId,
//           petWeight
//         });
//       });
//     });

//     // 3. Get available groomers
//     const groomers = await User.find({ is_active: true })
//       .populate({ path: 'user_role', match: { name: 'groomer' }, select: '_id name' })
//       .lean();
//     const availableGroomers = groomers.filter(g => g.user_role);

//     // 4. Track groomer assignments across all pets
//     const groomerAssignments = new Map(); // groomerId -> { bookedSlots: Set, petCount: number }

//     // 5. Assign groomers and timeslots to each pet
//     for (const petDetail of expandedOrderDetails) {
//       const subServiceId = petDetail.subServiceId;
//       const subServiceData = await SubServiceType.findById(subServiceId);
//       const subServiceName = subServiceData.name;
//       const petDate = new Date(petDetail.date);

//       let assigned = false;

//       // Get all matching slots for this subservice
//       const allMatchingSlots = await TimeSlot.find({
//         subserviceName: subServiceName,
//         bookingDate: petDate
//       }).sort({ startTime: 1 }).session(session);

//       // Group slots by time window
//       const groupedSlots = Array.from(
//         allMatchingSlots.reduce((acc, slot) => {
//           const key = `${slot.startTime.toISOString()}_${slot.endTime.toISOString()}`;
//           if (!acc.has(key)) acc.set(key, []);
//           acc.get(key).push(slot);
//           return acc;
//         }, new Map()).values()
//       );

//       // Sort groomers by:
//       // 1. Already assigned groomers (with least assignments first)
//       // 2. Other available groomers
//       const prioritizedGroomers = [...availableGroomers]
//         .sort((a, b) => {
//           const aAssigned = groomerAssignments.has(a._id.toString());
//           const bAssigned = groomerAssignments.has(b._id.toString());
          
//           if (aAssigned && !bAssigned) return -1;
//           if (!aAssigned && bAssigned) return 1;
//           if (aAssigned && bAssigned) {
//             const aCount = groomerAssignments.get(a._id.toString()).petCount;
//             const bCount = groomerAssignments.get(b._id.toString()).petCount;
//             return aCount - bCount;
//           }
//           return 0;
//         });

//       // Try each groomer in priority order
//       groomerLoop: for (const groomer of prioritizedGroomers) {
//         const groomerId = groomer._id.toString();
        
//         // Initialize groomer assignment tracking if needed
//         if (!groomerAssignments.has(groomerId)) {
//           groomerAssignments.set(groomerId, {
//             bookedSlots: new Set(),
//             petCount: 0
//           });
//         }
//         const groomerAssignment = groomerAssignments.get(groomerId);

//         // Check groomer's existing time conflicts from DB
//         const timeConflicts = await OrderDetails.find({
//           groomer: groomer._id,
//           status: { $in: ["CONFIRMED", "PENDING"] },
//           'orderDetails.timeslot': { $exists: true }
//         }).populate("orderDetails.timeslot")
//           .session(session);

//         // Check all time blocks for this groomer
//         for (const slotGroup of groupedSlots) {
//           const slot = slotGroup[0];
//           const slotKey = `${slot.startTime.toISOString()}_${slot.endTime.toISOString()}`;

//           // Skip if groomer already has this time slot assigned
//           if (groomerAssignment.bookedSlots.has(slotKey)) {
//             continue;
//           }

//           // Check for conflicts with existing DB bookings
//           const hasDBConflict = timeConflicts.some(order => {
//             const s = order.orderDetails.timeslot;
//             return (
//               s.bookingDate.toISOString() === slot.bookingDate.toISOString() &&
//               s.startTime < slot.endTime &&
//               s.endTime > slot.startTime
//             );
//           });

//           if (hasDBConflict) {
//             continue;
//           }

//           // Find the specific slot for this subservice
//           const selectedSlot = slotGroup.find(s => 
//             s.subservice.toString() === subServiceId.toString()
//           ) || slotGroup[0];

//           // Assign the pet to this groomer and time slot
//           petDetail.assignedGroomer = groomer._id;
//           petDetail.timeslot = selectedSlot._id;
          
//           // Update groomer assignment tracking
//           groomerAssignment.bookedSlots.add(slotKey);
//           groomerAssignment.petCount += 1;
          
//           console.log(`🧼 Assigned Pet ${petDetail.petTypeId} to Groomer ${groomer.first_name} on ${selectedSlot.startTime.toLocaleTimeString()} - ${selectedSlot.endTime.toLocaleTimeString()}`);
//           assigned = true;
//           break groomerLoop; // Exit both loops
//         }
//       }

//       if (!assigned) {
//         throw new Error(`No groomer or timeslot available for pet on ${petDate.toDateString()}`);
//       }
//     }

//     // 6. Create the order
//     const [createdOrder] = await Order.create([{
//       total_delivery_price,
//       pay_type,
//       defaultAddress,
//       promoCode,
//       paymentIntentId,
//       created_by: req.user._id
//     }], { session });

//     // 7. Create order details
//     await Promise.all(
//       expandedOrderDetails.map(item =>
//         OrderDetails.create([{
//           order: createdOrder._id,
//           orderDetails: {
//             serviceId: item.serviceId,
//             subServiceId: item.subServiceId,
//             date: item.date,
//             timeslot: item.timeslot,
//             petTypeId: item.petTypeId,
//             pickupType: item.pickupType,
//             petWeight: item.petWeight,
//           },
//           defaultAddress: defaultAddress,
//           applied_promocode: applied_promocode || null,
//           groomer: item.assignedGroomer || null,
//           status: 'CONFIRMED',
//           bookingStatus: 'NOT_STARTED',
//           created_by: req.user._id
//         }], { session })
//       )
//     );

//     // 8. Handle promo code if applied
//     if (promoCode) {
//       const promoData = await PromoCode.findOne({ _id: promoCode, isActive: true })
//         .select("_id code discountType startDate endDate is_validation_date maxUses usedBy")
//         .session(session);

//       if (promoData) {
//         const now = new Date();
//         if (promoData.is_validation_date && (promoData.startDate > now || promoData.endDate < now)) {
//           throw new Error("Promo code is not active currently");
//         }
//         const userIdStr = req.user._id.toString();
//         const alreadyUsed = promoData.usedBy.some(id => id.toString() === userIdStr);
//         if (alreadyUsed) throw new Error("You have already used this promo code");
//         const currentUses = parseFloat(promoData.maxUses.toString());
//         if (currentUses <= 0) throw new Error("Promo code usage limit reached");
//         promoData.maxUses = mongoose.Types.Decimal128.fromString((currentUses - 1).toFixed(2));
//         promoData.usedBy.push(req.user._id);
//         await promoData.save({ session });
//         createdOrder.promoCodeUsedBy.push(req.user._id);
//         await createdOrder.save({ session });
//       } else {
//         throw new Error("Invalid or inactive promo code");
//       }
//     }

//     // 9. Clear cart and commit transaction
//     await Cart.deleteMany({ created_by: req.user._id }).session(session);
//     await session.commitTransaction();
//     transactionCommitted = true;
//     session.endSession();

//     // 10. Fetch populated order data for response
//     const populatedOrder = await Order.findById(createdOrder._id)
//       .populate("defaultAddress", "_id name city phone_number pincode street country")
//       .populate("created_by", "_id first_name email")
//       .lean();

//     const populatedOrderDetails = await OrderDetails.find({ order: createdOrder._id })
//       .populate("orderDetails.serviceId", "name")
//       .populate("orderDetails.subServiceId", "name")
//       .populate("orderDetails.petTypeId", "name")
//       .populate("groomer", "_id first_name last_name")
//       .lean();

//     // 11. Send notification
//     NotificationService.sendToCustomer({
//       userId: populatedOrder.created_by._id,
//       title: "Order Confirmed 🎉",
//       message: `Your booking for ${populatedOrderDetails.length} service(s) on ${new Date(populatedOrder.order_date).toDateString()} has been confirmed.`,
//       type: "Booking",
//     });

//     return res.status(201).json(new ApiResponse(201, {
//       order: populatedOrder,
//       orderDetails: populatedOrderDetails
//     }, "Order created successfully"));
//   } catch (err) {
//     if (!transactionCommitted) await session.abortTransaction();
//     session.endSession();
//     console.error("createOrder error:", err);
//     res.status(500).json(new ApiError(500, err.message));
//   }
// });

/**---------------12:15AM 10-6-25 assign groomer on basis of service provider--- working notification for each order details---------*/
// const createOrder = asyncHandler(async (req, res) => {
//   console.log("createOrder body:", req.body);

//   const session = await mongoose.startSession();
//   session.startTransaction();
//   let transactionCommitted = false;

//   const {
//     total_delivery_price,
//     pay_type,
//     defaultAddress,
//     orderDetails,
//     applied_promocode,
//     promoCode,
//     paymentIntentId
//   } = req.body;

//   try {
//     // 1. Validate cart items
//     const cartItems = await Cart.find({ created_by: req.user._id }).session(session);
//     if (!cartItems.length) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json(new ApiError(400, "Cart is empty"));
//     }

//     // 2. Expand order details for each pet
//     let expandedOrderDetails = [];
//     orderDetails.forEach((item) => {
//       console.log("Received orderDetail item:", JSON.stringify(item));
//       const cartItem = cartItems.find(ci => ci.subServiceId.toString() === item.subServiceId);
//       if (!cartItem || !Array.isArray(cartItem.petTypeId) || cartItem.petTypeId.length === 0) {
//         throw new Error(`No pets selected for service ${item.subServiceId}`);
//       }

//       const petWeight = item.petWeight || cartItem.petWeight;
//       cartItem.petTypeId.forEach(petId => {
//         expandedOrderDetails.push({
//           ...item,
//           petTypeId: petId,
//           petWeight
//         });
//       });
//     });

//     // 3. Get available groomers with their serviceProvider info
//     const groomers = await User.find({ is_active: true })
//       .populate([
//         { path: 'user_role', match: { name: 'groomer' }, select: '_id name' },
//         { path: 'serviceProvider', select: '_id' } // Populate serviceProvider array
//       ])
//       .lean();
      
//     const availableGroomers = groomers.filter(g => g.user_role);

//     // 4. Track groomer assignments across all pets
//     const groomerAssignments = new Map(); // groomerId -> { bookedSlots: Set, petCount: number }

//     // 5. Assign groomers and timeslots to each pet
//     for (const petDetail of expandedOrderDetails) {
//       const subServiceId = petDetail.subServiceId;
//       const serviceId = petDetail.serviceId; // Get the serviceId from petDetail
//       const subServiceData = await SubServiceType.findById(subServiceId);
//       const subServiceName = subServiceData.name;
//       const petDate = new Date(petDetail.date);

//       let assigned = false;

//       // Get all matching slots for this subservice
//       const allMatchingSlots = await TimeSlot.find({
//         subserviceName: subServiceName,
//         bookingDate: petDate
//       }).sort({ startTime: 1 }).session(session);

//       // Group slots by time window
//       const groupedSlots = Array.from(
//         allMatchingSlots.reduce((acc, slot) => {
//           const key = `${slot.startTime.toISOString()}_${slot.endTime.toISOString()}`;
//           if (!acc.has(key)) acc.set(key, []);
//           acc.get(key).push(slot);
//           return acc;
//         }, new Map()).values()
//       );

//       // Filter groomers who provide this service
//       const serviceProviderGroomers = availableGroomers.filter(groomer => {
//         return groomer.serviceProvider.some(provider => 
//           provider._id.toString() === serviceId.toString()
//         );
//       });

//       // Sort groomers by:
//       // 1. Groomers who provide the service (with least assignments first)
//       // 2. Other available groomers (if none found in first group)
//       const prioritizedGroomers = [
//         ...serviceProviderGroomers.sort((a, b) => {
//           const aAssigned = groomerAssignments.has(a._id.toString());
//           const bAssigned = groomerAssignments.has(b._id.toString());
          
//           if (aAssigned && !bAssigned) return 1;
//           if (!aAssigned && bAssigned) return -1;
//           if (aAssigned && bAssigned) {
//             const aCount = groomerAssignments.get(a._id.toString()).petCount;
//             const bCount = groomerAssignments.get(b._id.toString()).petCount;
//             return aCount - bCount;
//           }
//           return 0;
//         }),
//         ...availableGroomers.filter(g => 
//           !serviceProviderGroomers.some(sg => sg._id.toString() === g._id.toString())
//         )
//       ];

//       // Try each groomer in priority order
//       groomerLoop: for (const groomer of prioritizedGroomers) {
//         const groomerId = groomer._id.toString();
        
//         // Initialize groomer assignment tracking if needed
//         if (!groomerAssignments.has(groomerId)) {
//           groomerAssignments.set(groomerId, {
//             bookedSlots: new Set(),
//             petCount: 0
//           });
//         }
//         const groomerAssignment = groomerAssignments.get(groomerId);

//         // Check groomer's existing time conflicts from DB
//         const timeConflicts = await OrderDetails.find({
//           groomer: groomer._id,
//           status: { $in: ["CONFIRMED", "PENDING"] },
//           'orderDetails.timeslot': { $exists: true }
//         }).populate("orderDetails.timeslot")
//           .session(session);

//         // Check all time blocks for this groomer
//         for (const slotGroup of groupedSlots) {
//           const slot = slotGroup[0];
//           const slotKey = `${slot.startTime.toISOString()}_${slot.endTime.toISOString()}`;

//           // Skip if groomer already has this time slot assigned
//           if (groomerAssignment.bookedSlots.has(slotKey)) {
//             continue;
//           }

//           // Check for conflicts with existing DB bookings
//           const hasDBConflict = timeConflicts.some(order => {
//             const s = order.orderDetails.timeslot;
//             return (
//               s.bookingDate.toISOString() === slot.bookingDate.toISOString() &&
//               s.startTime < slot.endTime &&
//               s.endTime > slot.startTime
//             );
//           });

//           if (hasDBConflict) {
//             continue;
//           }

//           // Find the specific slot for this subservice
//           const selectedSlot = slotGroup.find(s => 
//             s.subservice.toString() === subServiceId.toString()
//           ) || slotGroup[0];

//           // Assign the pet to this groomer and time slot
//           petDetail.assignedGroomer = groomer._id;
//           petDetail.timeslot = selectedSlot._id;
          
//           // Update groomer assignment tracking
//           groomerAssignment.bookedSlots.add(slotKey);
//           groomerAssignment.petCount += 1;
          
//           console.log(`🧼 Assigned Pet ${petDetail.petTypeId} to Groomer ${groomer.first_name} (Service Provider) on ${selectedSlot.startTime.toLocaleTimeString()} - ${selectedSlot.endTime.toLocaleTimeString()}`);
//           assigned = true;
//           break groomerLoop; // Exit both loops
//         }
//       }

//       if (!assigned) {
//         throw new Error(`No groomer or timeslot available for pet on ${petDate.toDateString()}`);
//       }
//     }

//     // 6. Create the order
//     const [createdOrder] = await Order.create([{
//       total_delivery_price,
//       pay_type,
//       defaultAddress,
//       promoCode,
//       paymentIntentId,
//       created_by: req.user._id
//     }], { session });

//     // 7. Create order details
//     await Promise.all(
//       expandedOrderDetails.map(item =>
//         OrderDetails.create([{
//           order: createdOrder._id,
//           orderDetails: {
//             serviceId: item.serviceId,
//             subServiceId: item.subServiceId,
//             date: item.date,
//             timeslot: item.timeslot,
//             petTypeId: item.petTypeId,
//             pickupType: item.pickupType,
//             petWeight: item.petWeight,
//           },
//           defaultAddress: defaultAddress,
//           applied_promocode: applied_promocode || null,
//           groomer: item.assignedGroomer || null,
//           status: 'CONFIRMED',
//           bookingStatus: 'NOT_STARTED',
//           created_by: req.user._id
//         }], { session })
//       )
//     );

//     // 8. Handle promo code if applied
//     if (promoCode) {
//       const promoData = await PromoCode.findOne({ _id: promoCode, isActive: true })
//         .select("_id code discountType startDate endDate is_validation_date maxUses usedBy")
//         .session(session);

//       if (promoData) {
//         const now = new Date();
//         if (promoData.is_validation_date && (promoData.startDate > now || promoData.endDate < now)) {
//           throw new Error("Promo code is not active currently");
//         }
//         const userIdStr = req.user._id.toString();
//         const alreadyUsed = promoData.usedBy.some(id => id.toString() === userIdStr);
//         if (alreadyUsed) throw new Error("You have already used this promo code");
//         const currentUses = parseFloat(promoData.maxUses.toString());
//         if (currentUses <= 0) throw new Error("Promo code usage limit reached");
//         promoData.maxUses = mongoose.Types.Decimal128.fromString((currentUses - 1).toFixed(2));
//         promoData.usedBy.push(req.user._id);
//         await promoData.save({ session });
//         createdOrder.promoCodeUsedBy.push(req.user._id);
//         await createdOrder.save({ session });
//       } else {
//         throw new Error("Invalid or inactive promo code");
//       }
//     }

//     // 9. Clear cart and commit transaction
//     await Cart.deleteMany({ created_by: req.user._id }).session(session);
//     await session.commitTransaction();
//     transactionCommitted = true;
//     session.endSession();

//     // 10. Fetch populated order data for response
//     const populatedOrder = await Order.findById(createdOrder._id)
//       .populate("defaultAddress", "_id name city phone_number pincode street country")
//       .populate("created_by", "_id first_name email")
//       .lean();

//     const populatedOrderDetails = await OrderDetails.find({ order: createdOrder._id })
//       .populate("orderDetails.serviceId", "name")
//       .populate("orderDetails.subServiceId", "name")
//       .populate("orderDetails.petTypeId", "name")
//       .populate("groomer", "_id first_name last_name")
//       .lean();

//     // 11. Send notification
//     NotificationService.sendToCustomer({
//       userId: populatedOrder.created_by._id,
//       title: "Order Confirmed 🎉",
//       message: `Your booking for ${populatedOrderDetails.length} service(s) on ${new Date(populatedOrder.order_date).toDateString()} has been confirmed.`,
//       type: "Booking",
//     });

//     return res.status(201).json(new ApiResponse(201, {
//       order: populatedOrder,
//       orderDetails: populatedOrderDetails
//     }, "Order created successfully"));
//   } catch (err) {
//     if (!transactionCommitted) await session.abortTransaction();
//     session.endSession();
//     console.error("createOrder error:", err);
//     res.status(500).json(new ApiError(500, err.message));
//   }
// });

/**------------------11-06-25-----2:36PM testing------working notification for each order details----- */
const createOrder = asyncHandler(async (req, res) => {
  console.log("createOrder body:", req.body);

  const session = await mongoose.startSession();
  session.startTransaction();
  let transactionCommitted = false;

  const {
    total_delivery_price,
    pay_type,
    defaultAddress,
    orderDetails,
    applied_promocode,
    promoCode,
    paymentIntentId
  } = req.body;

  try {
    const cartItems = await Cart.find({ created_by: req.user._id }).session(session);
    if (!cartItems.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json(new ApiError(400, "Cart is empty"));
    }

    let expandedOrderDetails = [];
    orderDetails.forEach((item) => {
      console.log("Received orderDetail item:", JSON.stringify(item));
      const cartItem = cartItems.find(ci => ci.subServiceId.toString() === item.subServiceId);
      if (!cartItem || !Array.isArray(cartItem.petTypeId) || cartItem.petTypeId.length === 0) {
        throw new Error(`No pets selected for service ${item.subServiceId}`);
      }

      const petWeight = item.petWeight || cartItem.petWeight;
      cartItem.petTypeId.forEach(petId => {
        expandedOrderDetails.push({
          ...item,
          petTypeId: petId,
          petWeight
        });
      });
    });

    const groomers = await User.find({ is_active: true })
      .populate([
        { path: 'user_role', match: { name: 'groomer' }, select: '_id name' },
        { path: 'serviceProvider', select: '_id' }
      ])
      .lean();

    const availableGroomers = groomers.filter(g => g.user_role);
    const groomerAssignments = new Map();

    for (const petDetail of expandedOrderDetails) {
      const subServiceId = petDetail.subServiceId;
      const serviceId = petDetail.serviceId;
      const subServiceData = await SubServiceType.findById(subServiceId);
      const subServiceName = subServiceData.name;
      const petDate = new Date(petDetail.date);

      let assigned = false;

      const allMatchingSlots = await TimeSlot.find({
        subserviceName: subServiceName,
        bookingDate: petDate
      }).sort({ startTime: 1 }).session(session);

      const groupedSlots = Array.from(
        allMatchingSlots.reduce((acc, slot) => {
          const key = `${slot.startTime.toISOString()}_${slot.endTime.toISOString()}`;
          if (!acc.has(key)) acc.set(key, []);
          acc.get(key).push(slot);
          return acc;
        }, new Map()).values()
      );

      const serviceProviderGroomers = availableGroomers.filter(groomer => {
        return groomer.serviceProvider.some(provider => 
          provider._id.toString() === serviceId.toString()
        );
      });

      for (const slotGroup of groupedSlots) {
        const slot = slotGroup[0];
        const slotKey = `${slot.startTime.toISOString()}_${slot.endTime.toISOString()}`;

        const availableServiceGroomers = serviceProviderGroomers.filter(groomer => {
          const groomerId = groomer._id.toString();
          if (!groomerAssignments.has(groomerId)) {
            groomerAssignments.set(groomerId, { bookedSlots: new Set(), petCount: 0 });
          }
          const groomerAssignment = groomerAssignments.get(groomerId);
          if (groomerAssignment.bookedSlots.has(slotKey)) return false;
          return true;
        });

        for (const groomer of availableServiceGroomers) {
          const groomerId = groomer._id.toString();
          const groomerAssignment = groomerAssignments.get(groomerId);

          const timeConflicts = await OrderDetails.find({
            groomer: groomer._id,
            status: { $in: ["CONFIRMED", "PENDING"] },
            'orderDetails.timeslot': { $exists: true }
          }).populate("orderDetails.timeslot").session(session);

          const hasDBConflict = timeConflicts.some(order => {
            const s = order.orderDetails.timeslot;
            return (
              s.bookingDate.toISOString() === slot.bookingDate.toISOString() &&
              s.startTime < slot.endTime &&
              s.endTime > slot.startTime
            );
          });

          if (hasDBConflict) continue;

          const selectedSlot = slotGroup.find(s => 
            s.subservice.toString() === subServiceId.toString()
          ) || slotGroup[0];

          petDetail.assignedGroomer = groomer._id;
          petDetail.timeslot = selectedSlot._id;

          groomerAssignment.bookedSlots.add(slotKey);
          groomerAssignment.petCount += 1;

          console.log(`✅ Assigned Pet ${petDetail.petTypeId} to Groomer ${groomer.first_name} for Service Provider at ${selectedSlot.startTime.toLocaleTimeString()}`);
          assigned = true;
          break;
        }

        if (assigned) break;
      }

      if (!assigned) {
        throw new Error(`No available groomer from the service provider for pet on ${petDate.toDateString()}`);
      }
    }

    const [createdOrder] = await Order.create([{
      total_delivery_price,
      pay_type,
      defaultAddress,
      promoCode,
      paymentIntentId,
      created_by: req.user._id
    }], { session });

    await Promise.all(
      expandedOrderDetails.map(item =>
        OrderDetails.create([{
          order: createdOrder._id,
          orderDetails: {
            serviceId: item.serviceId,
            subServiceId: item.subServiceId,
            date: item.date,
            timeslot: item.timeslot,
            petTypeId: item.petTypeId,
            pickupType: item.pickupType,
            petWeight: item.petWeight,
          },
          defaultAddress: defaultAddress,
          applied_promocode: applied_promocode || null,
          groomer: item.assignedGroomer || null,
          status: 'CONFIRMED',
          bookingStatus: 'NOT_STARTED',
          created_by: req.user._id
        }], { session })
      )
    );

    await Cart.deleteMany({ created_by: req.user._id }).session(session);
    await session.commitTransaction();
    transactionCommitted = true;
    session.endSession();

    const populatedOrder = await Order.findById(createdOrder._id)
      .populate("defaultAddress", "_id name city phone_number pincode street country")
      .populate("created_by", "_id first_name email")
      .lean();
      console.log("populatedOrder------>",populatedOrder);
      
    const populatedOrderDetails = await OrderDetails.find({ order: createdOrder._id })
      .populate("orderDetails.serviceId", "name")
      .populate("orderDetails.subServiceId", "name")
      .populate("orderDetails.petTypeId", "name")
      .populate("orderDetails.timeslot", "startTime")
      .populate("groomer", "_id first_name last_name")
      .lean();
console.log("populatedOrderDetails--->",populatedOrderDetails);

    // NotificationService.sendToCustomer({
    //   userId: populatedOrder.created_by._id,
    //   title: "Order Confirmed 🎉",
    //   message: `Your booking for ${populatedOrderDetails?.name || "pet"} with ${
    //     groomer ? groomer.first_name : "a groomer"
    //   } at ${new Date(timeslot.startTime).toLocaleTimeString()} has been confirmed.`,
    //   type: "Booking",
    // });

    populatedOrderDetails.forEach(orderDetail => {
  const petNames = orderDetail.orderDetails.petTypeId.map(pet => pet.name).join(", ");
  console.log("petNames---------->",petNames)
  const groomerName = orderDetail.groomer
    ? `${orderDetail.groomer.first_name} ${orderDetail.groomer.last_name}`
    : "a groomer";
    console.log("groomerName---------->",groomerName)
  const time = orderDetail.orderDetails.timeslot
    ? new Date(orderDetail.orderDetails.timeslot.startTime).toLocaleTimeString()
    : "scheduled time";
     console.log("time---------->",time)
  NotificationService.sendToCustomer({
    userId: populatedOrder.created_by._id,
    title: "Booking Confirmed ✅",
    message: `Your booking for ${petNames} with ${groomerName} at ${time} has been confirmed.`,
    type: "Booking"
  });
});


    return res.status(201).json(new ApiResponse(201, {
      order: populatedOrder,
      orderDetails: populatedOrderDetails
    }, "Order created successfully"));

  } catch (err) {
    if (!transactionCommitted) await session.abortTransaction();
    session.endSession();
    console.error("createOrder error:", err);
    res.status(500).json(new ApiError(500, err.message));
  }
});

/**---1306025----11:57AM */
// const createOrder = asyncHandler(async (req, res) => {
//   console.log("createOrder body:", req.body);

//   const session = await mongoose.startSession();
//   session.startTransaction();
//   let transactionCommitted = false;

//   const {
//     total_delivery_price,
//     pay_type,
//     defaultAddress,
//     orderDetails,
//     applied_promocode,
//     promoCode,
//     paymentIntentId
//   } = req.body;

//   try {
//     const cartItems = await Cart.find({ created_by: req.user._id }).session(session);
//     if (!cartItems.length) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json(new ApiError(400, "Cart is empty"));
//     }

//     let expandedOrderDetails = [];
//     orderDetails.forEach((item) => {
//       console.log("Received orderDetail item:", JSON.stringify(item));
//       const cartItem = cartItems.find(ci => ci.subServiceId.toString() === item.subServiceId);
//       if (!cartItem || !Array.isArray(cartItem.petTypeId) || cartItem.petTypeId.length === 0) {
//         throw new Error(`No pets selected for service ${item.subServiceId}`);
//       }

//       const petWeight = item.petWeight || cartItem.petWeight;
//       cartItem.petTypeId.forEach(petId => {
//         expandedOrderDetails.push({
//           ...item,
//           petTypeId: petId,
//           petWeight
//         });
//       });
//     });

//     const groomers = await User.find({ is_active: true })
//       .populate([
//         { path: 'user_role', match: { name: 'groomer' }, select: '_id name' },
//         { path: 'serviceProvider', select: '_id' }
//       ])
//       .lean();

//     const availableGroomers = groomers.filter(g => g.user_role);
//     const groomerAssignments = new Map();

//     for (const petDetail of expandedOrderDetails) {
//       const subServiceId = petDetail.subServiceId;
//       const serviceId = petDetail.serviceId;
//       const subServiceData = await SubServiceType.findById(subServiceId);
//       const subServiceName = subServiceData.name;
//       const petDate = new Date(petDetail.date);

//       let assigned = false;

//       const allMatchingSlots = await TimeSlot.find({
//         subserviceName: subServiceName,
//         bookingDate: petDate
//       }).sort({ startTime: 1 }).session(session);

//       const groupedSlots = Array.from(
//         allMatchingSlots.reduce((acc, slot) => {
//           const key = `${slot.startTime.toISOString()}_${slot.endTime.toISOString()}`;
//           if (!acc.has(key)) acc.set(key, []);
//           acc.get(key).push(slot);
//           return acc;
//         }, new Map()).values()
//       );

//       const serviceProviderGroomers = availableGroomers.filter(groomer => {
//         return groomer.serviceProvider.some(provider =>
//           provider._id.toString() === serviceId.toString()
//         );
//       });

//       for (const slotGroup of groupedSlots) {
//         const slot = slotGroup[0];
//         const slotKey = `${slot.startTime.toISOString()}_${slot.endTime.toISOString()}`;

//         const availableServiceGroomers = serviceProviderGroomers.filter(groomer => {
//           const groomerId = groomer._id.toString();
//           if (!groomerAssignments.has(groomerId)) {
//             groomerAssignments.set(groomerId, { bookedSlots: new Set(), petCount: 0 });
//           }
//           const groomerAssignment = groomerAssignments.get(groomerId);
//           if (groomerAssignment.bookedSlots.has(slotKey)) return false;
//           return true;
//         });

//         for (const groomer of availableServiceGroomers) {
//           const groomerId = groomer._id.toString();
//           const groomerAssignment = groomerAssignments.get(groomerId);

//           const timeConflicts = await OrderDetails.find({
//             groomer: groomer._id,
//             status: { $in: ["CONFIRMED", "PENDING"] },
//             'orderDetails.timeslot': { $exists: true }
//           }).populate("orderDetails.timeslot").session(session);

//           const hasDBConflict = timeConflicts.some(order => {
//             const s = order.orderDetails.timeslot;
//             return (
//               s.bookingDate.toISOString() === slot.bookingDate.toISOString() &&
//               s.startTime < slot.endTime &&
//               s.endTime > slot.startTime
//             );
//           });

//           if (hasDBConflict) continue;

//           const selectedSlot = slotGroup.find(s =>
//             s.subservice.toString() === subServiceId.toString()
//           ) || slotGroup[0];

//           petDetail.assignedGroomer = groomer._id;
//           petDetail.timeslot = selectedSlot._id;

//           groomerAssignment.bookedSlots.add(slotKey);
//           groomerAssignment.petCount += 1;

//           console.log(`✅ Assigned Pet ${petDetail.petTypeId} to Groomer ${groomer.first_name} for Service Provider at ${selectedSlot.startTime.toLocaleTimeString()}`);
//           assigned = true;
//           break;
//         }

//         if (assigned) break;
//       }

//       if (!assigned) {
//         throw new Error(`No available groomer from the service provider for pet on ${petDate.toDateString()}`);
//       }
//     }

//     const [createdOrder] = await Order.create([{
//       total_delivery_price,
//       pay_type,
//       defaultAddress,
//       promoCode,
//       paymentIntentId,
//       created_by: req.user._id
//     }], { session });

//     const notificationPayloads = [];

//     await Promise.all(
//       expandedOrderDetails.map(async (item) => {
//         const [createdOrderDetail] = await OrderDetails.create([{
//           order: createdOrder._id,
//           orderDetails: {
//             serviceId: item.serviceId,
//             subServiceId: item.subServiceId,
//             date: item.date,
//             timeslot: item.timeslot,
//             petTypeId: item.petTypeId,
//             pickupType: item.pickupType,
//             petWeight: item.petWeight,
//           },
//           defaultAddress: defaultAddress,
//           applied_promocode: applied_promocode || null,
//           groomer: item.assignedGroomer || null,
//           status: 'CONFIRMED',
//           bookingStatus: 'NOT_STARTED',
//           created_by: req.user._id
//         }], { session });

//         notificationPayloads.push({
//           userId: req.user._id,
//           title: "Booking Confirmed ✅",
//           message: `Your booking for service ${item.subServiceId} on ${new Date(item.date).toDateString()} has been confirmed.`,
//           type: "Booking"
//         });
//       })
//     );

//     await Cart.deleteMany({ created_by: req.user._id }).session(session);
//     await session.commitTransaction();
//     transactionCommitted = true;
//     session.endSession();

//     // send per-orderDetails notifications
//     notificationPayloads.forEach(payload => {
//       NotificationService.sendToCustomer(payload);
//     });

//     const populatedOrder = await Order.findById(createdOrder._id)
//       .populate("defaultAddress", "_id name city phone_number pincode street country")
//       .populate("created_by", "_id first_name email")
//       .lean();

//     const populatedOrderDetails = await OrderDetails.find({ order: createdOrder._id })
//       .populate("orderDetails.serviceId", "name")
//       .populate("orderDetails.subServiceId", "name")
//       .populate("orderDetails.petTypeId", "name")
//       .populate("groomer", "_id first_name last_name")
//       .lean();

//     console.log("populatedOrder------>", populatedOrder);
//     console.log("populatedOrderDetails--->", populatedOrderDetails);

//     // Existing summary notification (keep this)
//     NotificationService.sendToCustomer({
//       userId: populatedOrder.created_by._id,
//       title: "Order Confirmed 🎉",
//       message: `Your booking for ${populatedOrderDetails.length} service(s) on ${new Date(populatedOrder.order_date).toDateString()} has been confirmed.`,
//       type: "Booking",
//     });

//     return res.status(201).json(new ApiResponse(201, {
//       order: populatedOrder,
//       orderDetails: populatedOrderDetails
//     }, "Order created successfully"));

//   } catch (err) {
//     if (!transactionCommitted) await session.abortTransaction();
//     session.endSession();
//     console.error("createOrder error:", err);
//     res.status(500).json(new ApiError(500, err.message));
//   }
// });

const updateOrder = asyncHandler(async (req, res) => {
  const { orderId, updates } = req.body;

  try {
    // Validate order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json(new ApiError(404, "Order not found"));
    }

    const updatedDetails = [];

    for (const update of updates) {
      const detail = await OrderDetails.findById(update.orderDetailsId);
      if (!detail) continue;

      const previousGroomer = detail.groomer;
      const newGroomerId = update.groomer || detail.groomer;
      const newTimeslotId = update.timeslotId || detail.orderDetails.timeslot;
      const newDate = update.date || detail.orderDetails.date;

      // Conflict check: in OrderDetails
      const conflictOrderDetail = await OrderDetails.findOne({
        _id: { $ne: update.orderDetailsId },
        "orderDetails.date": newDate,
        "orderDetails.timeslot": newTimeslotId,
        groomer: newGroomerId
      });

      if (conflictOrderDetail) {
        return res.status(400).json(
          new ApiError(400, `Conflict: Groomer is already assigned to this timeslot on ${newDate}.`)
        );
      }

      // Conflict check: in Bookings
      const conflictBooking = await Booking.findOne({
        date: new Date(newDate),
        timeSlot: newTimeslotId,
        groomer: newGroomerId
      });

      if (conflictBooking) {
        return res.status(400).json(
          new ApiError(400, `Conflict: Groomer has an existing booking at this timeslot on ${newDate}.`)
        );
      }

      // ✅ No conflict — update fields
      if (update.timeslotId) {
        detail.orderDetails.timeslot = update.timeslotId;
      }
      if (update.date) {
        detail.orderDetails.date = update.date;
      }
      if (update.subServiceId) {
        detail.orderDetails.subServiceId = update.subServiceId;
      }
      if (update.groomer) {
        detail.groomer = update.groomer;
      }

      // Save the updated order detail
      await detail.save();

      updatedDetails.push({
        detailId: detail._id,
        previousGroomer,
        newGroomer: detail.groomer,
        updatedFields: update
      });
    }

    // Populate updated data
    const populatedOrder = await Order.findById(orderId)
      .populate("defaultAddress", "name city phone_number pincode street country")
      .populate("created_by", "first_name email")
      .lean();
// console.log("populatedOrder--------------->",populatedOrder);

    const populatedOrderDetails = await OrderDetails.find({ order: orderId })
      .populate("orderDetails.serviceId", "name")
      .populate("orderDetails.subServiceId", "name")
      .populate("groomer", "first_name last_name")
      .lean();
// console.log("populatedOrderDetails--------->",populatedOrderDetails);

            NotificationService.sendToCustomer({
            userId: populatedOrder.created_by._id,
            title: "Order Confirmed 🎉",
            message: `Your booking for ${populatedOrderDetails.length} service(s) on ${new Date(populatedOrder.order_date).toDateString()} has been confirmed.`,
            type: "Booking",
          });
    return res.status(200).json(new ApiResponse(200, {
      order: populatedOrder,
      orderDetails: populatedOrderDetails,
      updatedDetails
    }, "Order updated successfully"));

  } catch (err) {
    console.error("updateOrder error:", err);
    res.status(500).json(new ApiError(500, err.message));
  }
});


// Get all orders for a user
const getAllOrder = asyncHandler(async (req, res) => {
  const orders = await Order.find({ created_by: req.user._id })
    .sort({ createdAt: -1 })
    .populate({
      path: "defaultAddress", 
      select: "name city phone_number pincode street flat_no",
      populate: { path: "city", select: "name latitude longitude country" }
    })
    .populate("created_by", "first_name last_name")
    .lean();

  if (!orders?.length) {
    return res.status(404).json(new ApiResponse(404, null, "No orders found"));
  }

  const orderIds = orders.map(order => order._id);

  const orderDetails = await OrderDetails.find({ order: { $in: orderIds } })
    .populate("order", "orderid invoice total_delivery_price pay_type")
    .populate("orderDetails.serviceId", "name")
    .populate("orderDetails.subServiceId", "name") 
    .populate("orderDetails.petTypeId", "name")
    .populate("groomer", "first_name last_name")
    .populate("applied_promocode", "code discount") 
    .lean();

  // Create a mapping of orderDetails by order ID
  const orderDetailsMap = orderDetails.reduce((acc, detail) => {
    const key = detail.order.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(detail);
    return acc;
  }, {});

  // Combine order data with its respective details
  const enrichedOrders = orders.map(order => ({
    ...order,
    orderDetails: orderDetailsMap[order._id.toString()] || [] 
  }));

  res.status(200).json(new ApiResponse(200, enrichedOrders));
});


// Get all order details by order ID
const getAllOrderDetails = asyncHandler(async (req, res) => {
  const orderId = req.params.orderId;

  const orderDetails = await OrderDetails.aggregate([
    { $match: { order: new mongoose.Types.ObjectId(orderId) } },

    // Populate order
    {
      $lookup: {
        from: "orders",
        localField: "order",
        foreignField: "_id",
        as: "order"
      }
    },
    { $unwind: "$order" },

    // Populate defaultAddress and city
    {
      $lookup: {
        from: "addresses",
        localField: "order.defaultAddress",
        foreignField: "_id",
        as: "order.defaultAddress"
      }
    },
    { $unwind: { path: "$order.defaultAddress", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "cities",
        localField: "order.defaultAddress.city",
        foreignField: "_id",
        as: "order.defaultAddress.city"
      }
    },
    { $unwind: { path: "$order.defaultAddress.city", preserveNullAndEmptyArrays: true } },

    // Populate applied_promocode
    {
      $lookup: {
        from: "promocodes",
        localField: "applied_promocode",
        foreignField: "_id",
        as: "applied_promocode"
      }
    },
    { $unwind: { path: "$applied_promocode", preserveNullAndEmptyArrays: true } },

    // Populate created_by
    {
      $lookup: {
        from: "users",
        let: { createdById: "$created_by" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$createdById"] } } },
          { $project: { first_name: 1, last_name: 1, email: 1 } }
        ],
        as: "created_by"
      }
    },
    { $unwind: { path: "$created_by", preserveNullAndEmptyArrays: true } },

    // Populate serviceId, subServiceId, petTypeId
    {
      $lookup: {
        from: "servicetypes",
        localField: "orderDetails.serviceId",
        foreignField: "_id",
        as: "orderDetails.serviceId"
      }
    },
    { $unwind: { path: "$orderDetails.serviceId", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "subservicetypes",
        localField: "orderDetails.subServiceId",
        foreignField: "_id",
        as: "orderDetails.subServiceId"
      }
    },
    { $unwind: { path: "$orderDetails.subServiceId", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "petregistrations",
        localField: "orderDetails.petTypeId",
        foreignField: "_id",
        as: "orderDetails.petTypeId"
      }
    },
    { $unwind: { path: "$orderDetails.petTypeId", preserveNullAndEmptyArrays: true } },

    // Convert timeslot string to ObjectId and populate
    {
      $set: {
        timeslotId: {
          $cond: [
            { $ne: ["$orderDetails.timeslot", null] },
            { $toObjectId: "$orderDetails.timeslot" },
            null
          ]
        }
      }
    },
    {
      $lookup: {
        from: "timeslots",
        localField: "timeslotId",
        foreignField: "_id",
        as: "orderDetails.timeslot"
      }
    },
    { $unwind: { path: "$orderDetails.timeslot", preserveNullAndEmptyArrays: true } },

    // Match groomingDetails by petWeight
    { $unwind: "$orderDetails.subServiceId.groomingDetails" },
    {
      $match: {
        $expr: {
          $eq: [
            "$orderDetails.petWeight",
            { $toString: "$orderDetails.subServiceId.groomingDetails._id" }
          ]
        }
      }
    },

    // Populate groomer
    {
      $lookup: {
        from: "users",
        let: { groomerId: "$groomer" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$groomerId"] } } },
          { $project: { password: 0, otp: 0, otp_time: 0, refreshToken: 0 } }
        ],
        as: "groomer"
      }
    },
    { $unwind: { path: "$groomer", preserveNullAndEmptyArrays: true } },
    

    // Group without mergeObjects
    {
      $group: {
        _id: "$_id",
        orderDetails: { $first: "$orderDetails" },
        groomer: { $first: "$groomer" },
        petWeight: { $first: "$orderDetails.subServiceId.groomingDetails" },
        order: { $first: "$order" },
        applied_promocode: { $first: "$applied_promocode" },
        created_by: { $first: "$created_by" },
        createdAt: { $first: "$createdAt" },
        updatedAt: { $first: "$updatedAt" },
        promocode_discount_amount: { $first: "$promocode_discount_amount" },
        status: { $first: "$status" },
        bookingStatus: { $first: "$bookingStatus" }
      }
    },

    // Add groomer into orderDetails
    {
      $addFields: {
        orderDetails: {
          $mergeObjects: ["$orderDetails", { groomer: "$groomer" }]
        }
      }
    },

    { $sort: { createdAt: -1 } }
  ]);

  res.status(200).json(new ApiResponse(200, orderDetails));
});


export {
  createOrder,
  updateOrder,
  getAllOrder,
  getAllOrderDetails
};