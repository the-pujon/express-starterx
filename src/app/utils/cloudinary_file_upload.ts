
import AppError from "../errors/AppError";
import cloudinary from "./cloudinary";
import fs from "fs";


export const uploadImage = async (
  filePath: string,
  folder: string,
  fileName?: string
) => {
  try {

    console.log(filePath, "filePath")
    console.log(fileName, "fileName")

    const isPdf = fileName?.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      // Upload as image
      return await cloudinary.uploader.upload(filePath, {
        folder,
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      });
    } else {
      // Upload as raw (PDF)
      return await cloudinary.uploader.upload(filePath, {
        folder,
        // resource_type: 'raw',
        use_filename: true,
        unique_filename: false,
        access_mode: 'public',
        // public_id: fileName,
        format: 'pdf',
        // No transformation here
      });
    }
  } catch (error) {
    throw new AppError(500, 'Failed to upload image or PDF to Cloudinary');
  }
};


export const deleteImage = async (cloudinaryId: string) => {
  try {
    await cloudinary.uploader.destroy(cloudinaryId);
  } catch (error) {
    throw new AppError(500, 'Failed to delete image from Cloudinary');
  }
};

export const deleteLocalFile = (filePath: string) => {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    throw new AppError(500, 'Failed to delete local file');
  }
};
