import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { PetRegistration } from "../../models/pet.model.js";
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
  } from "../../utils/cloudinary.js";



//create pet
const customercreatePet = asyncHandler(async (req, res) => {
    console.log("req.body", req.body);

    try {
        const {
            petName,
            petType,
            breed,
            dob,
            gender,
            weight,
            activity_level,
            day_Habits,
            personality,
            health_issues,
            special_care,
            microchip_number,
            warning,
            dietary_requirements,
            life_usage
        } = req.body;

        const requiredFields = { petName, petType, breed, dob, gender };
        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                return res.status(400).json(new ApiError(400, `Missing required field: ${key}`));
            }
        }

        let petImage = null;
        if (req.files?.image?.[0]) {
            const uploadedImage = await uploadOnCloudinary(req.files.image[0].path);
            if (!uploadedImage?.url) {
                throw new ApiError(400, `Error uploading image for pet ${petName}`);
            }
            petImage = uploadedImage.url;
        }

        let petDocument = null;
        if (req.files?.document?.[0]) {
            const uploadedDoc = await uploadOnCloudinary(req.files.document[0].path);
            if (!uploadedDoc?.url) {
                throw new ApiError(400, `Error uploading document for pet ${petName}`);
            }
            petDocument = uploadedDoc.url;
        }

        const newPet = await PetRegistration.create({
            userId: req.user._id,
            petName,
            image: petImage,
            petType,
            breed,
            dob,
            gender,
            weight,
            activity_level,
            day_Habits,
            personality,
            health_issues,
            special_care,
            document: petDocument,
            microchip_number,
            warning,
            dietary_requirements,
            life_usage,
        });

        return res
            .status(200)
            .json(new ApiResponse(200, newPet, "Pet profile created successfully"));

    } catch (error) {
        console.error("Error creating pet:", error);
        return res.status(500).json(new ApiError(500, error.message, "Internal Server Error"));
    }
});


//updatePet
const customerupdatePet = asyncHandler(async (req, res) => {
  
    try {
      const { petId } = req.params;
  
      const pet = await PetRegistration.findById(petId);
      // console.log("pet info------------------------------------------>",pet);
      
      if (!pet) {
        return res.status(404).json(new ApiError(404, "Pet not found"));
      }
  
      const {
        petName,
        petType,
        breed,
        dob,
        gender,
        weight,
        activity_level,
        day_Habits,
        personality,
        health_issues,
        special_care,
        microchip_number,
        warning,
        dietary_requirements,
        life_usage
      } = req.body;
  
      const requiredFields = {
        petName,
        petType,
        breed,
        gender,
        weight,
        dob,
        activity_level,
        day_Habits
      };
  
      const missingFields = Object.keys(requiredFields).filter(
        (field) => !requiredFields[field] || requiredFields[field] === "undefined"
      );
  
      if (missingFields.length > 0) {
        return res.status(400).json(
          new ApiError(400, `Missing required field: ${missingFields.join(", ")}`)
        );
      }
  
      let petImage = pet.image;
      let petDocument = pet.document;
  
      if (req.files?.image?.[0]?.path) {
        if (pet.image) {
          await deleteFromCloudinary(pet.image);
        }
      
        const uploadedImage = await uploadOnCloudinary(req.files.image[0].path);
        if (!uploadedImage?.url) {
          return res.status(400).json(new ApiError(400, "Error while uploading pet image"));
        }
        petImage = uploadedImage.url;
      }
      
      if (req.files?.document?.[0]?.path) {
        if (pet.document) {
          await deleteFromCloudinary(pet.document);
        }
      
        const uploadedDoc = await uploadOnCloudinary(req.files.document[0].path);
        if (!uploadedDoc?.url) {
          return res.status(400).json(new ApiError(400, "Error while uploading pet document"));
        }
        petDocument = uploadedDoc.url;
      }
  
      const updatedPet = await PetRegistration.findByIdAndUpdate(
        petId,
        {
          petName,
          image: petImage,
          petType,
          breed,
          dob,
          gender,
          weight,
          activity_level,
          day_Habits,
          personality,
          health_issues,
          special_care,
          document: petDocument,
          microchip_number,
          warning,
          dietary_requirements,
          life_usage
        },
        { new: true }
      );
  
      return res.status(200).json(new ApiResponse(200, updatedPet, "Pet updated successfully"));
    } catch (error) {
      console.log("Error------", error);
      return res.status(400).json(new ApiError(400, error, "Error"));
    }
});


//findpetbyID
const customerfindPetById = asyncHandler(async (req, res) => {
    try {
      const { petId } = req.params;
  
      const pet = await PetRegistration.findById(petId);
      if (!pet) {
        return res.status(404).json(new ApiError(404, "Pet not found"));
      }
  
      return res.status(200).json(new ApiResponse(200, pet, "Pet fetched successfully"));
    } catch (error) {
      console.error("Find pet error:", error);
      return res.status(500).json(new ApiError(500, "An unexpected error occurred"));
    }
});


//findallpet
const customerfindAllPets = asyncHandler(async (req, res) => {
  console.log("req.body....", req.body);

  try {
    const { search = "" } = req.query;
    const { filter = {}, sortOrder = -1 } = req.body;
    const userId = req.user?._id;

    const searchCondition = { userId: userId };

    if (search && search !== "undefined") {
     const regex = new RegExp(search, "i");

      searchCondition.$or = [
        { petName: { $regex: regex } },
        { petType: { $regex: regex } },
        { breed: { $regex: regex } }
      ];
    }

    if (filter && typeof filter === "object") {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          searchCondition[key] = value;
        }
      });
    }

    const pets = await PetRegistration.find(searchCondition)
      .sort({ createdAt: sortOrder })
      .populate("petType", "name")
      .populate("breed", "name")
    
    return res
      .status(200)
      .json(new ApiResponse(200, pets, "Pets fetched successfully"));
  } catch (error) {
    console.log("findAllPets Error:", error);
    return res.status(500).json(new ApiError(500, error.message || "Internal Server Error"));
  }
});


//deletepet
const customerdeletePet = asyncHandler(async (req, res) => {
  const { petId } = req.params;

  try {
    const pet = await PetRegistration.findById(petId);
    
    if (!pet) {
      return res.status(404).json(new ApiError(404, "Pet not found"));
    }
  
    if (pet.image) {
      await deleteFromCloudinary(pet.image);
    }
  
    if (pet.document) {
      await deleteFromCloudinary(pet.document);
    }
  
    await PetRegistration.findByIdAndDelete(petId);
  
    return res.status(200).json(new ApiResponse(200, {}, "Pet deleted successfully"));
  } catch (error) {
    console.error("deleting pet error:", error);
    return res.status(500).json(new ApiError(500, "An unexpected error occurred"));
  }
});


export {
    customercreatePet,
    customerupdatePet,
    customerfindPetById,
    customerfindAllPets,
    customerdeletePet
}