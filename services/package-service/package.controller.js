
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import path from "path";
import fs from "fs";
import { Package } from "../../models/package.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

// Create Package
const createPackage = asyncHandler(async (req, res) => {
  const { name, price, numberOfClasses, duration } = req.body;

  if (!name || !price || !numberOfClasses || !duration) {
    return res.status(400).json(new ApiError(400, "All fields are required"));
  }

  const image = req.file?.path || "";

  const newPackage = await Package.create({
    name,
    price,
    numberOfClasses,
    duration,
    image,
  });

  return res.status(201).json(new ApiResponse(201, newPackage, "Package created successfully"));
});

// Get All Packages
const getAllPackages = asyncHandler(async (req, res) => {
  const packages = await Package.find().sort({ createdAt: -1 }).lean();
  return res.status(200).json(new ApiResponse(200, packages, "All packages fetched"));
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

  if (req.file?.path) {
    // Optionally delete old image
    if (packageData.image) {
      fs.unlink(packageData.image, (err) => {
        if (err) console.error("Failed to delete old image:", err);
      });
    }
    packageData.image = req.file.path;
  }

  packageData.name = name || packageData.name;
  packageData.price = price || packageData.price;
  packageData.numberOfClasses = numberOfClasses || packageData.numberOfClasses;
  packageData.duration = duration || packageData.duration;

  await packageData.save();

  return res.status(200).json(new ApiResponse(200, packageData, "Package updated successfully"));
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
