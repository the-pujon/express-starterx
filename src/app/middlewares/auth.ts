import { NextFunction, Request, Response } from "express";
import AppError from "../errors/AppError";
import httpStatus from "http-status";
import jwt, {
  JsonWebTokenError,
  JwtPayload,
  TokenExpiredError,
} from "jsonwebtoken";
import config from "../config";
import { MongoUserRepository } from "../modules/Auth/infrastructure/persistence/repositories/mongo-user.repository";
import { UserStatus } from "../modules/Auth/domain/models/user.model";
import catchAsync from "../utils/catchAsync";

const userRepository = new MongoUserRepository();

export const auth = (
  ...requiredRoles: (
    | "admin"
    | "moderator"
    | "superAdmin"
    | "customer"
    | "seller"
  )[]
) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // Check both cookie and Authorization header for token
    let token = req.cookies.accessToken;

    // Also support Bearer token from Authorization header
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "You are not authorized. Login first",
      );
    }

    if (!config.jwt_access_secret) {
      console.error("❌ JWT_ACCESS_SECRET is missing in config.ts or .env");
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Server error: JWT secret is not configured",
      );
    }

    try {
      const decoded = jwt.verify(token, config.jwt_access_secret) as JwtPayload;
      const { userId, email, role, tokenVersion } = decoded;

      // Find user in DB to check tokenVersion and status
      // We can find by userId or email. Since userId is in the new JWT payload:
      const user = userId
        ? await userRepository.findById(userId)
        : await userRepository.findByEmail(email);

      if (!user) {
        throw new AppError(httpStatus.NOT_FOUND, "This user is not found!");
      }

      // Check account status
      if (
        user.status === UserStatus.BLOCKED ||
        user.status === UserStatus.SUSPENDED ||
        user.status === UserStatus.DELETED
      ) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          `Your account is ${user.status}`,
        );
      }

      // Hybrid JWT validation: check token version to allow instant revocation
      if (
        typeof tokenVersion === "number" &&
        user.tokenVersion !== tokenVersion
      ) {
        throw new AppError(httpStatus.UNAUTHORIZED, "Token has been revoked");
      }

      // Role check
      if (requiredRoles.length && !requiredRoles.includes(role)) {
        throw new AppError(httpStatus.UNAUTHORIZED, "You have no access");
      }

      req.user = decoded;
      next();
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          "Your session has expired. Please login again.",
        );
      } else if (error instanceof JsonWebTokenError) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          "Invalid token. Please login again.",
        );
      }
      throw error;
    }
  });
};
