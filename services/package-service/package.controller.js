
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import path from "path";
import fs from "fs";
import { Package } from "../../models/package.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../../utils/cloudinary.js";

// Create Package
const createPackage = asyncHandler(async (req, res) => {
  const { name, price, numberOfClasses, duration } = req.body;

  if (!name || !price || !numberOfClasses || !duration) {
    return res.status(400).json(new ApiError(400, "All fields are required"));
  }

  // Upload image to Cloudinary if provided
  let imageUrl = null;
  if (req.file || (req.files && req.files.image && req.files.image[0])) {
    const imagePath = req.file ? req.file.path : req.files.image[0].path;
    const uploadedImage = await uploadOnCloudinary(imagePath);

    if (!uploadedImage?.url) {
      return res.status(400).json(new ApiError(400, "Error uploading image"));
    }

    imageUrl = uploadedImage.url;
  }

  const newPackage = await Package.create({
    name,
    price,
    numberOfClasses,
    duration,
    image: imageUrl,
    created_by: req.user?._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newPackage, "Package created successfully"));
});


// Get All Packages
// Change route method to POST: router.post('/packages', getAllPackages)

const getAllPackages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.body;
  const skip = (page - 1) * limit;

  const [packages, totalCount] = await Promise.all([
    Package.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Package.countDocuments(),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return res.status(200).json(
    new ApiResponse(200, {
      packages,
      page,
      totalPages,
      totalCount,
    }, "Packages fetched with pagination")
  );
});


// Get Package by ID
const getPackageById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const packageData = await Package.findById(id).lean();
  if (!packageData) {
    return res.status(404).json(new ApiError(404, "Package not found"));
  }

  return res.status(200).json(new ApiResponse(200, packageData, "Package fetched successfully"));
});

// Update Package
const updatePackage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, price, numberOfClasses, duration } = req.body;

  const packageData = await Package.findById(id);
  if (!packageData) {
    return res.status(404).json(new ApiError(404, "Package not found"));
  }

  // Handle image update via Cloudinary
  if (req.file || (req.files && req.files.image && req.files.image[0])) {
    // Delete old image from Cloudinary
    if (packageData.image) {
      await deleteFromCloudinary(packageData.image);
    }

    const imagePath = req.file ? req.file.path : req.files.image[0].path;
    const uploadedImage = await uploadOnCloudinary(imagePath);

    if (!uploadedImage?.url) {
      return res.status(400).json(new ApiError(400, "Error uploading image"));
    }

    packageData.image = uploadedImage.url;
  }

  // Update other fields
  packageData.name = name || packageData.name;
  packageData.price = price || packageData.price;
  packageData.numberOfClasses = numberOfClasses || packageData.numberOfClasses;
  packageData.duration = duration || packageData.duration;
  packageData.updated_by = req.user?._id;

  await packageData.save();

  return res
    .status(200)
    .json(new ApiResponse(200, packageData, "Package updated successfully"));
});


// Delete Package
const deletePackage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const packageData = await Package.findById(id);
  if (!packageData) {
    return res.status(404).json(new ApiError(404, "Package not found"));
  }

  if (packageData.image) {
    fs.unlink(packageData.image, (err) => {
      if (err) console.error("Failed to delete image:", err);
    });
  }

  await packageData.deleteOne();

  return res.status(200).json(new ApiResponse(200, {}, "Package deleted successfully"));
});

// Search Packages by Name
const searchPackages = asyncHandler(async (req, res) => {
  const { keyword } = req.query;

  if (!keyword) {
    return res.status(400).json(new ApiError(400, "Search keyword is required"));
  }

  const regex = new RegExp(keyword, "i");

  const packages = await Package.find({ name: { $regex: regex } }).lean();

  if (!packages.length) {
    return res.status(200).json(new ApiResponse(200, [], "No packages found"));
  }

  return res.status(200).json(new ApiResponse(200, packages, "Packages fetched"));
});

export {
  createPackage,
  updatePackage,
  deletePackage,
  getAllPackages,
  getPackageById,
  searchPackages,
};
