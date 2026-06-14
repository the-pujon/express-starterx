//updated One

import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import config from '../config';
cloudinary.config({
  cloud_name: config.cloudinary_cloud_name,
  api_key: config.cloudinary_api_key,
  api_secret: config.cloudinary_api_secret,
});


const allowedFormats = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'country-images',
    format: async (req: any, file: any) => {
      const ext = path.extname(file.originalname).toLowerCase().slice(1); 
      return allowedFormats.includes(ext) ? ext : 'png';
    },
    public_id: (req: any, file: any) => file.originalname,
  } as Record<string, unknown>,
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const extname = allowedFormats.includes(path.extname(file.originalname).toLowerCase().slice(1));
    const mimetype = allowedFormats.includes(file.mimetype.split('/')[1]);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error(`Error: Only images of type ${allowedFormats.join(', ')} are allowed!`));
  },
});

export { upload };
