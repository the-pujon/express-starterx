import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../../utils/catchAsync";
import sendResponse from "../../../../utils/sendResponse";
import { RegistrationService } from "../../application/services/registration.service";
import { AuthenticationService } from "../../application/services/authentication.service";
import { EmailVerificationService } from "../../application/services/email-verification.service";
import { PasswordResetService } from "../../application/services/password-reset.service";
import AppError from "../../../../errors/AppError";

export class AuthController {
  constructor(
    private readonly registrationService: RegistrationService,
    private readonly authenticationService: AuthenticationService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  /**
   * Extract metadata from request
   */
  private extractMeta(req: Request) {
    return {
      ip: req.ip || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
      device:
        (Array.isArray(req.headers["x-device"])
          ? req.headers["x-device"][0]
          : req.headers["x-device"]) ||
        (Array.isArray(req.headers["x-device-id"])
          ? req.headers["x-device-id"][0]
          : req.headers["x-device-id"]) ||
        (Array.isArray(req.headers["sec-ch-ua-platform"])
          ? req.headers["sec-ch-ua-platform"][0]
          : req.headers["sec-ch-ua-platform"]),
    };
  }

  // ==========================================
  // Registration
  // ==========================================

  signup = catchAsync(async (req: Request, res: Response) => {
    const meta = this.extractMeta(req);
    const result = await this.registrationService.signup(req.body, meta);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "User registered successfully. Please verify your email.",
      data: { newUser: result.user },
    });
  });

  // ==========================================
  // Authentication
  // ==========================================

  login = catchAsync(async (req: Request, res: Response) => {
    const meta = this.extractMeta(req);
    const result = await this.authenticationService.login(req.body, meta);

    // Set refresh token in cookie
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Login successful",
      data: result,
    });
  });

  logout = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const refreshToken = req.cookies?.refreshToken;

    if (userId) {
      await this.authenticationService.logout(refreshToken, userId);
    }

    // Clear cookies
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Logged out successfully",
      data: {},
    });
  });

  logoutAll = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;

    if (userId) {
      await this.authenticationService.logoutAllDevices(userId);
    }

    // Clear cookies
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Logged out from all devices successfully",
      data: {},
    });
  });

  // ==========================================
  // Token Refresh
  // ==========================================

  refreshAccessToken = catchAsync(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;
    const meta = this.extractMeta(req);

    const result = await this.authenticationService.refreshToken(
      refreshToken,
      meta,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Access token refreshed successfully",
      data: { accessToken: result.accessToken },
    });
  });

  // ==========================================
  // Email Verification
  // ==========================================

  verifyEmail = catchAsync(async (req: Request, res: Response) => {
    const { token } = req.query;

    await this.emailVerificationService.validateCode(
      token as string,
      "verification",
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Email verified successfully",
      data: {},
    });
  });

  resendVerification = catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body;
    const meta = this.extractMeta(req);

    await this.emailVerificationService.resendCode(email, meta);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Verification email resent successfully",
      data: {},
    });
  });

  // ==========================================
  // Password Reset
  // ==========================================

  initiatePasswordReset = catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body;
    const meta = this.extractMeta(req);

    await this.passwordResetService.forgotPassword(email, meta);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Password reset link sent to your email",
      data: {},
    });
  });

  resetPassword = catchAsync(async (req: Request, res: Response) => {
    const { token, newPassword, email } = req.body;

    await this.passwordResetService.resetPassword(email, token, newPassword);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Password reset successfully",
      data: {},
    });
  });
}
