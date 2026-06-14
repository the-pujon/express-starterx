// import multer, { StorageEngine, FileFilterCallback } from 'multer';
// import path from 'path';
// import { Request } from 'express';

// // Allowed file types
// const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG','.pdf','.PDF', 'webp', 'svg','gif'];

// // Multer storage configuration
// const storage: StorageEngine = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/');
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//     const ext = path.extname(file.originalname).toLowerCase();
//     cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
//   },
// });

// // File filter to validate image types
// const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
//   const ext = path.extname(file.originalname).toLowerCase();
//   if (!ALLOWED_EXTENSIONS.includes(ext)) {
//     return cb(new Error(`Unsupported file type: ${ext}. Allowed types are: ${ALLOWED_EXTENSIONS.join(', ')}`));
//   }
//   cb(null, true);
// };

// const upload = multer({
//   storage,
//   fileFilter,
//   limits: {
//     fileSize: 2 * 1024 * 1024, // 2MB limit
//   },
// }) 

// export default upload;







// Old File

import multer from "multer";
import path from "path";
// Multer config
const upload = multer({
  storage: multer.diskStorage({}),
  fileFilter: (req: any, file: any, cb: any) => {
    let ext = path.extname(file.originalname);
    if (
      ext !== ".jpg" &&
      ext !== ".jpeg" &&
      ext !== ".png" &&
      ext !== ".JPG" &&
      ext !== ".JPEG" &&
      ext !== ".PNG" &&
      ext !== ".pdf" &&
      ext !== ".PDF" &&
      ext !== ".webp" &&
      ext !== ".svg" &&
      ext !== ".avif" 
    ) {
      cb(new Error("File type is not supported"), false);
      return;
    }
    cb(null, true);
  },
});

export default upload;


