import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../../utils/catchAsync";
import sendResponse from "../../../../utils/sendResponse";
import { UserProfileService } from "../../application/services/user-profile.service";
import { UserManagementService } from "../../application/services/user-management.service";
import AppError from "../../../../errors/AppError";

export class UserController {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly userManagementService: UserManagementService,
  ) {}

  getMe = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || (req as any).user?._id;

    if (!userId) {
      throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
    }

    const user = await this.userManagementService.getUserById(userId);
    const profile = await this.userProfileService.getUserProfile(userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User profile retrieved successfully",
      data: { user, profile },
    });
  });

  updateMyProfile = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || (req as any).user?._id;
    const { firstName, lastName, bio, avatarUrl } = req.body;

    if (!userId) {
      throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
    }

    const profile = await this.userProfileService.updateProfile(userId, {
      firstName,
      lastName,
      bio,
      avatarUrl,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Profile updated successfully",
      data: { profile },
    });
  });

  updateMe = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId || (req as any).user?._id;
    const { name, phone } = req.body;

    if (!userId) {
      throw new AppError(httpStatus.UNAUTHORIZED, "User not authenticated");
    }

    const user = await this.userManagementService.updateUser(userId, {
      name,
      phone,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User updated successfully",
      data: { user },
    });
  });

  getUserById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };

    const user = await this.userManagementService.getUserById(id);
    const profile = await this.userProfileService.getUserProfile(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User retrieved successfully",
      data: { user, profile },
    });
  });

  getAllUsers = catchAsync(async (req: Request, res: Response) => {
    const filters = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
      searchTerm: req.query.searchTerm as string,
      role: req.query.role as string,
      status: req.query.status as string,
      isVerified:
        req.query.isVerified === "true"
          ? true
          : req.query.isVerified === "false"
            ? false
            : undefined,
    };

    const result = await this.userManagementService.getAllUsers(filters);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Users retrieved successfully",
      data: result,
    });
  });

  changeRole = catchAsync(async (req: Request, res: Response) => {
    const { email, newRole } = req.body;
    const currentUser = (req as any).user;

    if (!email || !newRole) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Email and new role are required",
      );
    }

    const updatedUser = await this.userManagementService.changeRole(
      email,
      newRole,
      currentUser,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User role updated successfully",
      data: {
        user: {
          name: updatedUser.name,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          isVerified: updatedUser.isVerified,
        },
      },
    });
  });

  deleteUser = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const currentUser = (req as any).user;

    if (!id) {
      throw new AppError(httpStatus.BAD_REQUEST, "User ID is required");
    }

    const deletedUser = await this.userManagementService.deleteUser(
      id,
      currentUser,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User deleted successfully",
      data: {
        user: {
          name: deletedUser.name,
          username: deletedUser.username,
          email: deletedUser.email,
          role: deletedUser.role,
        },
      },
    });
  });
}
export const UserControllerInstance = (
  userProfileService: UserProfileService,
  userManagementService: UserManagementService,
) => new UserController(userProfileService, userManagementService);
