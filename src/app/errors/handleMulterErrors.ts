import { NextFunction,Request,Response } from "express";
import multer from "multer";
import AppError from "./AppError";

// Error handling middleware for multer
export const handleMulterErrors = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (err instanceof multer.MulterError) {
      // Multer-specific errors
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        // return res.status(400).json({
        //   message: 'You can only upload up to 4 images.',
        // });
        throw new AppError(400,'You can only upload up to 4 images.');
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        // return res.status(400).json({
        //   message: 'File size should not exceed 5MB.',
        // });
        throw new AppError(400,'File size should not exceed 1MB.');

      }
    }
    // Other errors
    next(err);
  };