import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AuthServices } from "./auth.service";
import config from "../../config";
import AppError from "../../errors/AppError";
import { AUTH_CONFIG } from "./auth.config";
import { CookieOptions } from "express";
import { deleteCachedData } from "../../utils/redis.utils";

/**
 * Handles user signup with proper validation and error handling
 */
const signupUser = catchAsync(async (req, res) => {
  const { ...userData } = req.body;
  const { newUser } = await AuthServices.signupUser(userData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User registered successfully. Please check your email for verification code.",
    data: {
      user: {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified,
      },
    },
  });
});

/**
 * Verifies user email using the provided verification code
 */
const verifyEmail = catchAsync(async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email and verification code are required");
  }

  const { user } = await AuthServices.verifyEmail(email, code);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Email verified successfully!",
    data: {
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    },
  });
});

/**
 * Resends verification code with rate limiting
 */
const resendVerifyEmailCode = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email is required");
  }

  await AuthServices.resendVerifyEmailCode(email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Verification code sent successfully. Please check your email.",
    data: null,
  });
});

/**
 * Handles user login with proper token management
 */
const loginUser = catchAsync(async (req, res) => {
  const { user, accessToken, refreshToken } = await AuthServices.loginUser(req.body);

  // Set secure cookie options
  const cookieOptions: CookieOptions = {
    secure: config.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: config.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  };

  // Set access token cookie
  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: parseInt(config.redis_ttl_access_token as string) * 1000 || 3600000, // 1 hour
  });

  // Set refresh token cookie
  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: parseInt(config.redis_ttl_refresh_token as string) * 1000 || 604800000, // 7 days
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User logged in successfully!",
    data: {
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
      accessToken,
    },
  });
});

/**
 * Handles refresh token requests
 */
const refreshTokenController = catchAsync(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Refresh token is required');
  }

  const { accessToken } = await AuthServices.refreshTokenService(res, refreshToken);

  // Set secure cookie options
  const cookieOptions: CookieOptions = {
    secure: config.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: config.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
    maxAge: parseInt(config.redis_ttl_access_token as string) * 1000 || 3600000, // 1 hour
  };

  // Update access token cookie
  res.cookie("accessToken", accessToken, cookieOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Access token refreshed successfully',
    data: { accessToken },
  });
});

/**
 * Handles password reset requests
 */
const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email is required");
  }

  await AuthServices.forgotPassword(email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password reset instructions sent to your email",
    data: null,
  });
});

/**
 * Handles password reset with token validation
 */
const resetPassword = catchAsync(async (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email, token, and new password are required");
  }

  await AuthServices.resetPassword(email, token, newPassword);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password reset successful. Please login with your new password.",
    data: null,
  });
});

/**
 * Handles user logout
 */
const logout = catchAsync(async (req, res) => {
  const { email } = req.user;

  // Clear cookies
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  };

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  // Clear tokens from Redis
  const prefix = config.redis_cache_key_prefix || 'auth';
  await Promise.all([
    deleteCachedData(`${prefix}:user:${email}:accessToken`),
    deleteCachedData(`${prefix}:user:${email}:refreshToken`),
  ]);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged out successfully",
    data: null,
  });
});

/**
 * Gets paginated list of users with proper authorization
 */
const getUsers = catchAsync(async (req, res) => {
  const filters = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    searchTerm: req.query.searchTerm as string || "",
  };

  const result = await AuthServices.getUsers(filters);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieved successfully",
    data: result,
  });
});

/**
 * Changes user role with proper authorization checks
 */
const changeRole = catchAsync(async (req, res) => {
  const { email, newRole } = req.body;
  const currentUser = req.user;

  if (!email || !newRole) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email and new role are required");
  }

  const updatedUser = await AuthServices.changeRole(email, newRole, currentUser);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User role updated successfully",
    data: {
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
      },
    },
  });
});

/**
 * Deletes user with proper authorization checks
 */
const deleteUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const currentUser = req.user;

  if (!id) {
    throw new AppError(httpStatus.BAD_REQUEST, "User ID is required");
  }

  const deletedUser = await AuthServices.deleteUser(id, currentUser);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User deleted successfully",
    data: {
      user: {
        name: deletedUser.name,
        email: deletedUser.email,
        role: deletedUser.role,
      },
    },
  });
});

export const AuthControllers = {
  signupUser,
  verifyEmail,
  resendVerifyEmailCode,
  loginUser,
  forgotPassword,
  resetPassword,
  logout,
  getUsers,
  refreshTokenController,
  changeRole,
  deleteUser,
};
