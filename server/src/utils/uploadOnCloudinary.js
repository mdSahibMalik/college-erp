import {v2 as cloudinary} from 'cloudinary';
import asyncErrorHandler from "./asyncErrorHandler.js";
import AppError from "./appError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = asyncErrorHandler(async (localFilePath) => {
  try {
    const result = await cloudinary.uploader.upload(localFilePath,{
      resource_type: "auto", // supports PDF, DOCX, image, video, everything
    });
  
   // delete file only if exists
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);

    return result;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);

    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);

    return null;
  }
});