import httpStatus from "http-status";
import AppError from "../../../app/errors/AppError";
import { IUser, UserRole } from "../../../app/modules/Auth/auth.interface";
import { User } from "../../../app/modules/Auth/auth.model";
import { AuthServices } from "../../../app/modules/Auth/auth.service";
import { cacheData, deleteCachedData } from "../../../app/utils/redis.utils";
import { getCachedData } from "../../../app/utils/redis.utils";
import { sendEmail } from "../../../app/utils/sendEmail";
import { checkRateLimit, removeTokens, canModifyRole } from "../../../app/modules/Auth/auth.utils";
import jwt, { JwtPayload } from "jsonwebtoken";
import { TokenExpiredError } from "jsonwebtoken";

jest.mock("../../../app/modules/Auth/auth.model");
jest.mock("../../../app/utils/redis.utils");
jest.mock("../../../app/utils/sendEmail", () => {
  return {
    sendEmail: jest.fn().mockResolvedValue(undefined),
    getEmailTemplate: jest.fn().mockReturnValue("Mocked email template"),
  };
});
jest.mock("../../../app/modules/Auth/auth.utils", () => ({
  checkRateLimit: jest.fn(),
  createToken: jest.fn().mockReturnValue("mockToken"),
  removeTokens: jest.fn(),
  validatePassword: jest.fn().mockReturnValue(true),
  canModifyRole: jest.fn().mockReturnValue(true)
}));

const mockUserData: Partial<IUser> = {
  name: "Test User",
  email: "test@example.com",
  password: "Test@123456",
  phone: "1234567890",
  role: UserRole.CUSTOMER,
  accountLocked: false,
  failedLoginAttempts: 0,
  incrementFailedLoginAttempts: jest.fn(),
  resetFailedLoginAttempts: jest.fn(),
  isAccountLocked: jest.fn()
};
//block of code for testing the auth service
describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset checkRateLimit to default success behavior
    (checkRateLimit as jest.Mock).mockResolvedValue(undefined);
  });

  describe("Signup User", () => {
    it("should throw error if user already exists", async () => {
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(mockUserData); // when the user is already exists then the mock data will be returned

      await expect(
        AuthServices.signupUser(mockUserData as IUser)
      ).rejects.toThrow(
        new AppError(httpStatus.BAD_REQUEST, "User already exists")
      );
    });

    it("should create a new user successfully", async () => {
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue(mockUserData);
      (cacheData as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthServices.signupUser(mockUserData as IUser);

      expect(User.isUserExistsByEmail).toHaveBeenCalledWith(mockUserData.email);
      expect(User.create).toHaveBeenCalledWith(mockUserData);
      expect(cacheData).toHaveBeenCalled();
      expect(result).toEqual({ newUser: mockUserData });
    });

    describe("Rate Limiting", () => {
      it("should allow signup within rate limit", async () => {
        (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(null);
        (User.create as jest.Mock).mockResolvedValue(mockUserData);
        (cacheData as jest.Mock).mockResolvedValue(undefined);
        (checkRateLimit as jest.Mock).mockResolvedValue(undefined);

        await AuthServices.signupUser(mockUserData as IUser);
        expect(checkRateLimit).toHaveBeenCalled();
      });

      it("should throw error after exceeding rate limit of 3 attempts", async () => {
        (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(null);
        (User.create as jest.Mock).mockResolvedValue(mockUserData);
        (checkRateLimit as jest.Mock)
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new AppError(httpStatus.TOO_MANY_REQUESTS, "Too many attempts. Please try again later."));

        // First three attempts should succeed
        await AuthServices.signupUser(mockUserData as IUser);
        await AuthServices.signupUser(mockUserData as IUser);
        await AuthServices.signupUser(mockUserData as IUser);

        // Fourth attempt should fail
        await expect(
          AuthServices.signupUser(mockUserData as IUser)
        ).rejects.toThrow(new AppError(httpStatus.TOO_MANY_REQUESTS, "Too many attempts. Please try again later."));
      });
    });
  });

  describe("Verify Email", () => {
    it("should throw error if verification code is not found", async () => {
      (getCachedData as jest.Mock).mockResolvedValue(null);

      await expect(
        AuthServices.verifyEmail("test@example.com", "123456")
      ).rejects.toThrow(
        new AppError(
          httpStatus.BAD_REQUEST,
          "Verification code expired or not found"
        )
      );
    });

    it("should throw error if verification code is invalid", async () => {
      (getCachedData as jest.Mock).mockResolvedValue({
        code: "1234569",
        expiresAt: Date.now() + 1000 * 60 * 10, // 10 minutes from now
        attempts: 0,
      });

      await expect(
        AuthServices.verifyEmail("test@example.com", "123456")
      ).rejects.toThrow(
        new AppError(httpStatus.BAD_REQUEST, "Invalid verification code")
      );
    });

    it("should throw error if verification code is expired", async () => {
      (getCachedData as jest.Mock).mockResolvedValue({
        code: "123456",
        expiresAt: Date.now() - 1000 * 60 * 10, // 10 minutes from now
        attempts: 0,
      });

      await expect(
        AuthServices.verifyEmail("test@example.com", "123456")
      ).rejects.toThrow(
        new AppError(httpStatus.BAD_REQUEST, "Verification code expired")
      );
    });

    it("should throw error if too many verification attempts", async () => {
      (getCachedData as jest.Mock).mockResolvedValue({
        code: "123456",
        expiresAt: Date.now() + 1000 * 60 * 10, // 10 minutes from now
        attempts: 3,
      });

      await expect(
        AuthServices.verifyEmail("test@example.com", "123456")
      ).rejects.toThrow(
        new AppError(
          httpStatus.TOO_MANY_REQUESTS,
          "Too many verification attempts"
        )
      );
    });

    it("should verify email successfully", async () => {
      (getCachedData as jest.Mock).mockResolvedValue({
        code: "123456",
        expiresAt: Date.now() + 1000 * 60 * 10, // 10 minutes from now
        attempts: 0,
      });

      (User.findOneAndUpdate as jest.Mock).mockResolvedValue({
        ...mockUserData,
        isVerified: true,
      });

      const result = await AuthServices.verifyEmail(
        "test@example.com",
        "123456"
      );

      expect(getCachedData).toHaveBeenCalled();
      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        { email: "test@example.com" },
        { isVerified: true },
        { new: true }
      );

      expect(result.user.isVerified).toBe(true);
      expect(deleteCachedData).toHaveBeenCalled();
    });
  });

  describe("Resend Verify Email Code", () => {
    it("should throw error if user is not found", async () => {
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(null);

      await expect(
        AuthServices.resendVerifyEmailCode("test@example.com")
      ).rejects.toThrow(new AppError(httpStatus.NOT_FOUND, "User not found"));
    });

    it("should throw error if user is already verified", async () => {
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue({
        ...mockUserData,
        isVerified: true,
      });

      await expect(
        AuthServices.resendVerifyEmailCode("test@example.com")
      ).rejects.toThrow(
        new AppError(httpStatus.BAD_REQUEST, "User is already verified")
      );
    });

    it("should throw error if rate limit is exceeded", async () => {
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(mockUserData);
      (checkRateLimit as jest.Mock).mockRejectedValue(
        new AppError(httpStatus.TOO_MANY_REQUESTS, "Too many attempts. Please try again later.")
      );

      await expect(
        AuthServices.resendVerifyEmailCode("test@example.com")
      ).rejects.toThrow(new AppError(httpStatus.TOO_MANY_REQUESTS, "Too many attempts. Please try again later."));
    });

    it("should generate and send new verification code", async () => {
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(mockUserData);
      (checkRateLimit as jest.Mock).mockResolvedValue(undefined);
      (cacheData as jest.Mock).mockResolvedValue(undefined);

      await AuthServices.resendVerifyEmailCode("test@example.com");

      expect(cacheData).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalledWith(
        {
          html: "Mocked email template",
          subject: "New Email Verification Code",
          to: "test@example.com",
        }
      );
    });
  });

  describe("Login User", () => {
    it("should throw error if user is not found", async () => {
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(null);
      (checkRateLimit as jest.Mock).mockResolvedValue(undefined);

      await expect(
        AuthServices.loginUser({ email: "test@example.com", password: "Test@123456" })
      ).rejects.toThrow(new AppError(httpStatus.NOT_FOUND, "Email not found!"));
    });

    it("should throw error if account is locked", async () => {
      const lockedUser = {
        ...mockUserData,
        accountLocked: true,
        isAccountLocked: jest.fn().mockReturnValue(true)
      };
      
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(lockedUser);
      (checkRateLimit as jest.Mock).mockResolvedValue(undefined);
      
      await expect(
        AuthServices.loginUser({ email: "test@example.com", password: "Test@123456" })
      ).rejects.toThrow(new AppError(httpStatus.FORBIDDEN, "Account is locked. Please try again later."));
    });

    it("should throw error if password is incorrect", async () => {
      const userWithMethods = {
        ...mockUserData,
        incrementFailedLoginAttempts: jest.fn()
      };
      
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(userWithMethods);
      (User.isPasswordMatched as jest.Mock).mockResolvedValue(false);
      (checkRateLimit as jest.Mock).mockResolvedValue(undefined);

      await expect(
        AuthServices.loginUser({ email: "test@example.com", password: "Test@123456" })
      ).rejects.toThrow(new AppError(httpStatus.FORBIDDEN, "Wrong Password"));
      
      expect(userWithMethods.incrementFailedLoginAttempts).toHaveBeenCalled();
    });

    it("should throw error if rate limit is exceeded", async () => {
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(mockUserData);
      (checkRateLimit as jest.Mock).mockRejectedValue(
        new AppError(httpStatus.TOO_MANY_REQUESTS, "Too many attempts. Please try again later.")
      );

      await expect(
        AuthServices.loginUser({ email: "test@example.com", password: "Test@123456" })
      ).rejects.toThrow(new AppError(httpStatus.TOO_MANY_REQUESTS, "Too many attempts. Please try again later."));
    });

    it("should login user successfully", async () => {
      const userWithMethods = {
        ...mockUserData,
        resetFailedLoginAttempts: jest.fn()
      };
      
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(userWithMethods);
      (User.isPasswordMatched as jest.Mock).mockResolvedValue(true);
      (cacheData as jest.Mock).mockResolvedValue(undefined);
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(userWithMethods);
      (checkRateLimit as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthServices.loginUser({ email: "test@example.com", password: "Test@123456" });

      expect(userWithMethods.resetFailedLoginAttempts).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe("Forgot Password", ()=>{
    it("should throw error if user is not found", async ()=>{
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(null);
      (checkRateLimit as jest.Mock).mockResolvedValue(undefined);

      await expect(AuthServices.forgotPassword("test@example.com")).rejects.toThrow(new AppError(httpStatus.NOT_FOUND, "User not found!"));
    })  

    it("should throw error if rate limit is exceeded", async ()=>{
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(mockUserData);
      (checkRateLimit as jest.Mock).mockRejectedValue(
        new AppError(httpStatus.TOO_MANY_REQUESTS, "Too many attempts. Please try again later.")
      );

      await expect(AuthServices.forgotPassword("test@example.com")).rejects.toThrow(new AppError(httpStatus.TOO_MANY_REQUESTS, "Too many attempts. Please try again later."));
    })

    it("should generate and send reset password email", async ()=>{
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(mockUserData);
      (checkRateLimit as jest.Mock).mockResolvedValue(undefined);
      (cacheData as jest.Mock).mockResolvedValue(undefined);

      await AuthServices.forgotPassword("test@example.com");

      expect(cacheData).toHaveBeenCalled();

    })
  })

  describe("Reset Password", ()=>{
    it("should throw error if user is not found", async ()=>{
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(null);
      // (checkRateLimit as jest.Mock).mockResolvedValue(undefined);
      (getCachedData as jest.Mock).mockResolvedValue({
        token: "123456",
        expiresAt: Date.now() + 1000 * 60 * 10, // 10 minutes from now
        attempts: 0,
      });

      await expect(AuthServices.resetPassword("test@example.com", "123456", "Test@123456")).rejects.toThrow(new AppError(httpStatus.BAD_REQUEST, "User not found"));
    })

    it("should throw error if reset token is expired", async ()=>{
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(mockUserData);
      // (checkRateLimit as jest.Mock).mockResolvedValue(undefined);
      (getCachedData as jest.Mock).mockResolvedValue(null);

      await expect(AuthServices.resetPassword("test@example.com", "123456", "Test@123456")).rejects.toThrow(new AppError(httpStatus.BAD_REQUEST, "Reset token expired or not found"));
    })

    it("should throw error if too many reset attempts", async ()=>{
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(mockUserData);
      (getCachedData as jest.Mock).mockResolvedValue({
        token: "123456",
        expiresAt: Date.now() + 1000 * 60 * 10, // 10 minutes from now
        attempts: 3,
      });

      await expect(AuthServices.resetPassword("test@example.com", "123456", "Test@123456")).rejects.toThrow(new AppError(httpStatus.TOO_MANY_REQUESTS, "Too many reset attempts"));
    })

    it("should reset password successfully", async ()=>{
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(mockUserData);
      (getCachedData as jest.Mock).mockResolvedValue({
        token: "123456",
        expiresAt: Date.now() + 1000 * 60 * 10, // 10 minutes from now
        attempts: 0,
      });

      await AuthServices.resetPassword("test@example.com", "123456", "Test@123456");

      expect(deleteCachedData).toHaveBeenCalled();
    })
  })

  // describe("Get Users", () => {
  //   // it("should throw error if no users are found", async ()=>{
  //   //   (User.find as jest.Mock).mockResolvedValue([]);

  //   //   await expect(AuthServices.getUsers({})).rejects.toThrow(new AppError(httpStatus.NOT_FOUND, "Users not found"));
  //   // })

  //   it("should get users successfully", async ()=>{
  //     (User.find as jest.Mock).mockResolvedValue([mockUserData]);

  //     const result = await AuthServices.getUsers({});

  //     expect(result).toEqual([mockUserData]);
  //   })
  // })

  describe("Refresh Token", () => {
    it("should throw error if refresh token is not found", async () => {
      
      await expect(AuthServices.refreshTokenService("test@example.com",null)).rejects.toThrow(new AppError(httpStatus.UNAUTHORIZED, "You are not authorized. Login first"));

    })

    it("should throw error if refresh token is invalid", async () => {
      const mockRes = {
        clearCookie: jest.fn()
      };
      
      // Mock a valid JWT token that can be decoded
      const mockToken = "valid.jwt.token";
      const mockEmail = "test@example.com";
      
      // Mock jwt.verify to return a decoded token
      jest.spyOn(jwt, 'verify').mockImplementation(() => ({ email: mockEmail } as JwtPayload));
      
      // Mock getCachedData to return a different token
      (getCachedData as jest.Mock).mockResolvedValue("different.cached.token");

      await expect(AuthServices.refreshTokenService(mockRes, mockToken))
        .rejects.toThrow(new AppError(httpStatus.UNAUTHORIZED, "Token is not valid"));
    })


    it("should throw error if user is not found", async () => {
      const mockRes = {
        clearCookie: jest.fn()
      };
      
      // Mock a valid JWT token that can be decoded
      const mockToken = "valid.jwt.token";
      const mockEmail = "test@example.com";
      
      // Mock jwt.verify to return a decoded token
      jest.spyOn(jwt, 'verify').mockImplementation(() => ({ email: mockEmail } as JwtPayload));
      
      // Mock getCachedData to return the same token
      (getCachedData as jest.Mock).mockResolvedValue("valid.jwt.token");

      // Mock User.isUserExistsByEmail to return null (user not found)
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(null);

      await expect(AuthServices.refreshTokenService(mockRes, mockToken))
        .rejects.toThrow(new AppError(httpStatus.NOT_FOUND, "This user is not found!"));
    })

    it("should throw error if token is expired", async ()=>{
      const mockRes = {
        clearCookie: jest.fn()
      };
      
      const mockToken = "valid.jwt.token";
      const mockEmail = "test@example.com";
      
      // Mock jwt.verify to throw TokenExpiredError
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new TokenExpiredError('jwt expired', new Date());
      });
      
      await expect(AuthServices.refreshTokenService(mockRes, mockToken))
        .rejects.toThrow(new AppError(httpStatus.UNAUTHORIZED, "Your session has expired. Please login again."));
    })

    it("should set new access token", async ()=>{
      const mockRes = {
        clearCookie: jest.fn()
      };

      const mockToken = "valid.jwt.token";
      const mockEmail = "test@example.com";

      // Mock jwt.verify to return a decoded token
      jest.spyOn(jwt, 'verify').mockImplementation(() => ({ email: mockEmail } as JwtPayload));

      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(mockUserData);

      (getCachedData as jest.Mock).mockResolvedValue("valid.jwt.token");

      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(mockUserData);

      (cacheData as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthServices.refreshTokenService(mockRes, mockToken);

      expect(result).toHaveProperty('accessToken');
      expect(cacheData).toHaveBeenCalled();
    })
    
    
    
  })

  describe("Change Role", ()=>{
    it("should throw error if user is not found", async ()=>{
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(null);

      await expect(AuthServices.changeRole("test@example.com", UserRole.ADMIN, {email: "test@example.com", role: UserRole.CUSTOMER})).rejects.toThrow(new AppError(httpStatus.NOT_FOUND, "User not found!"));
    })

    it("should throw error if user is not authorized to change role", async ()=>{
      const mockUser = {
        ...mockUserData,
        role: UserRole.CUSTOMER
      };
      
      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(mockUser);
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(mockUser);
      (canModifyRole as jest.Mock).mockReturnValue(false);

      await expect(AuthServices.changeRole("test@example.com", UserRole.ADMIN, {email: "test@example.com", role: UserRole.CUSTOMER})).rejects.toThrow(new AppError(httpStatus.FORBIDDEN, "You don't have permission to perform this action"));
    })

    it("should change role successfully", async ()=>{
      const mockUser = {
        ...mockUserData,
        role: UserRole.CUSTOMER
      };

      (User.isUserExistsByEmail as jest.Mock).mockResolvedValue(mockUser);
      (User.findOneAndUpdate as jest.Mock).mockResolvedValue(mockUser);
      (canModifyRole as jest.Mock).mockReturnValue(true);

      const result = await AuthServices.changeRole("test@example.com", UserRole.ADMIN, {email: "test@example.com", role: UserRole.CUSTOMER});
      
    })
    
  })

  describe("Delete User", ()=>{
    it("should throw error if user is not found", async ()=>{
      (User.findById as jest.Mock).mockResolvedValue(null);

      await expect(AuthServices.deleteUser("test@example.com", {email: "test@example.com", role: UserRole.CUSTOMER})).rejects.toThrow(new AppError(httpStatus.NOT_FOUND, "User not found!"));
    })

    it("should throw error if user is not authorized to delete user", async ()=>{
      (User.findById as jest.Mock).mockResolvedValue(mockUserData);

      await expect(AuthServices.deleteUser("test@example.com", {email: "test@example.com", role: UserRole.CUSTOMER})).rejects.toThrow(new AppError(httpStatus.FORBIDDEN, "Only super admin can delete users"));
    })

     it("should throw error if user is trying to delete their own account", async ()=>{
      (User.findById as jest.Mock).mockResolvedValue(mockUserData);
      (User.findByIdAndDelete as jest.Mock).mockResolvedValue(mockUserData);


      await expect(AuthServices.deleteUser("test@example.com", {email: "test@example.com", role: UserRole.SUPER_ADMIN})).rejects.toThrow(new AppError(httpStatus.FORBIDDEN, "Cannot delete your own account"));
      
    })

    it("should delete user successfully", async ()=>{
      (User.findById as jest.Mock).mockResolvedValue(mockUserData);
      (User.findByIdAndDelete as jest.Mock).mockResolvedValue(mockUserData);


      await AuthServices.deleteUser("test@example.com", {email: "test@example1.com", role: UserRole.SUPER_ADMIN});
    })
  })

});
