import { User } from "../../models/user.model.js";
import { UserRole } from "../../models/userRole.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../../utils/cloudinary.js";


const createManager = asyncHandler(async (req, res) => {
  console.log("user register Req.body", req.body);
  const {
    email,
    user_role,
    first_name,
    last_name,
    phone_number,
    gender,
    address,
    age,
    country,
    city,
    specialization,
    experience,
    experienceYear,
    password,
  } = req.body;

  const imageLocalPath = req.file?.path;

  const requiredFields = {
    email,
    first_name,
    phone_number,
    password,
    user_role,

  };

  const missingFields = Object.keys(requiredFields).filter(
    (field) => !requiredFields[field] || requiredFields[field] === "undefined"
  );

  if (missingFields.length > 0) {
    return res
      .status(400)
      .json(
        new ApiError(400, `Missing required field: ${missingFields.join(", ")}`)
      );
  }

  const existedUser = await User.findOne({
    $or: [{ email }],
  });

  if (existedUser) {
    return res
      .status(400)
      .json(new ApiError(400, "User with email or phone already exists"));
  }

  const userRole = await UserRole.findOne({ role_id: user_role });

  if (!userRole) {
    return res.status(400).json(new ApiError(400, "User Role Not found"));
  }

    let profile_image = null;
    if (imageLocalPath) {
      const uploadedImage = await uploadOnCloudinary(imageLocalPath);
      if (!uploadedImage?.url) {
        return res.status(400).json(new ApiError(400, "Error while uploading image"));
      }
      profile_image = uploadedImage.url;
    }

  const user = await User.create({
    uid: req.user?.uid || "",
    email,
    user_role: userRole?._id,
    first_name,
    last_name,
    phone_number,
    gender,
    age,
    country,
    profile_image,
    city,
    address,
    specialization,
    experience,
    experienceYear,
    password,
    status: userRole?.name === "manager" ? "Approved" : "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -user_role -otp -otp_time -uid"
  );

  if (!createdUser) {
    return res
      .status(500)
      .json(
        new ApiError(500, "Something went wrong while registering the user")
      );
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "Manager registered Successfully"));
});

const updateManager = asyncHandler(async (req, res) => {

  if (req.params.id == "undefined" || !req.params.id) {
    return res.status(400).json(new ApiError(400, "User ID not provided"));
  }

  if (Object.keys(req.body).length === 0 && !req.file) {
    return res.status(400).json(new ApiError(400, "No data provided to update"));
  }

  const {
    email,
    // user_role,
    first_name,
    last_name,
    phone_number,
    gender,
    address,
    age,
    country,
    city,
    specialization,
    experience,
    experienceYear,
    password,
  } = req.body;

  const imageLocalPath = req.file?.path;
//   console.log("reqFile------------------------------>", req.file);
  
  const existingUser = await User.findById(req.params.id);
  if (!existingUser) {
    return res.status(404).json(new ApiError(404, "User not found"));
  }

  let profile_image = existingUser.profile_image;
  if (imageLocalPath) {
    try {
      const [deleteResult, uploadResult] = await Promise.all([
        existingUser.profile_image ? deleteFromCloudinary(existingUser.profile_image) : Promise.resolve(),
        uploadOnCloudinary(imageLocalPath)
      ]);
      if (!uploadResult?.url) {
        return res.status(400).json(new ApiError(400, "Error while uploading profile image"));
      }
      profile_image = uploadResult.url;
    } catch (error) {
      return res.status(500).json(new ApiError(500, "Image handling failed"));
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    {
      email,
      // user_role,
      first_name,
      last_name,
      phone_number,
      gender,
      address,
      age,
      country,
      city,
      specialization,
      experience,
      experienceYear,
      password,
      profile_image,
      updated_by: req.user?._id,
      updated_at: new Date(),
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "User updated successfully"));
});

const getAllManagers = asyncHandler(async (req, res) => {

  const users = await User.find().populate("user_role country city")
  .select('-otp -otp_time -password -refreshToken') 
  .populate("user_role country city");
  const user = users.filter(user => user.user_role && user.user_role.name === "manager" && user.user_role.role_id === 4);

  res.status(200).json(new ApiResponse(200, user, "customer fetched successfully"));
});

const getManagerById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id)
    return res.status(400).json(new ApiError(400, "User ID is required"));

  const user = await User.findById(id)
    .select('-otp -otp_time -password -refreshToken') 
    .populate("user_role country city phone_number");

  if (!user) return res.status(404).json(new ApiError(404, "Manager not found"));

  if (user.user_role && user.user_role.name !== "manager") {
    return res.status(403).json(new ApiError(403, "User is not a manager"));
  }

  res.status(200).json(new ApiResponse(200, user, "manager fetched successfully"));
})

const deleteManager = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id || id === "undefined") {
    return res.status(400).json(new ApiError(400, "ID not provided"));
  }

  const manager = await User.findById(id);

  if (!manager) {
    return res.status(404).json(new ApiError(404, "Manager not found"));
  }

  if (manager.profile_image) {
    await deleteFromCloudinary(manager.profile_image);
  }

  await User.findByIdAndDelete(id);

  res.status(200).json(new ApiResponse(200, "Manager deleted successfully"));
});
export {
    createManager,
    updateManager,
    getAllManagers,
    getManagerById,
    deleteManager
};
