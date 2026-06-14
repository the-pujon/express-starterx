import { RegistrationService } from "../../../app/modules/Auth/application/services/registration.service";
import { AuthenticationService } from "../../../app/modules/Auth/application/services/authentication.service";
import {
  User,
  UserRole,
  UserStatus,
} from "../../../app/modules/Auth/domain/models/user.model";
import { TokenService } from "../../../app/modules/Auth/application/services/token.service";
import {
  UserAlreadyExistsException,
  InvalidCredentialsException,
} from "../../../app/modules/Auth/domain/exceptions/auth.exceptions";
import { sendEmail } from "../../../app/utils/sendEmail";

jest.mock("../../../app/modules/Auth/application/utils/auth.utils", () => ({
  checkRateLimit: jest.fn().mockResolvedValue(true),
  validatePassword: jest.fn().mockReturnValue(true),
  generateSecureId: jest.fn().mockReturnValue("mockJti"),
  generateVerificationCode: jest.fn().mockReturnValue("123456"),
  hashToken: jest.fn().mockReturnValue("hashedToken"),
  parseExpiryToSeconds: jest.fn().mockReturnValue(3600),
}));

jest.mock("../../../app/utils/sendEmail", () => ({
  sendEmail: jest.fn().mockResolvedValue({ transporter: {}, mailOptions: {} }),
  getEmailTemplate: jest
    .fn()
    .mockReturnValue("<html>Mock Email Template</html>"),
}));

describe("Clean Architecture Auth Services", () => {
  let userRepositoryMock: any;
  let sessionRepositoryMock: any;
  let loginHistoryRepositoryMock: any;
  let tokenServiceMock: any;
  let activityLogRepositoryMock: any;
  let emailHistoryRepositoryMock: any;

  let registrationService: RegistrationService;
  let authenticationService: AuthenticationService;

  const mockUser = User.reconstitute({
    id: "user123",
    name: "Test User",
    username: "testuser",
    email: "test@example.com",
    phone: "1234567890",
    password: "hashedPassword",
    role: UserRole.CUSTOMER,
    status: UserStatus.ACTIVE,
    lastLogin: new Date(),
    isVerified: true,
    provider: "local",
    providerId: null,
    deletedAt: null,
    failedLoginAttempts: 0,
    lastFailedLogin: null,
    accountLocked: false,
    accountLockedUntil: null,
    mfaEnabled: false,
    mfaMethod: null,
    mfaSecret: null,
    lastPasswordChange: new Date(),
    tokenVersion: 0,
  });

  const mockMeta = {
    ip: "127.0.0.1",
    userAgent: "Mozilla/5.0",
  };

  beforeEach(() => {
    userRepositoryMock = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findById: jest.fn(),
      findByProvider: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
    };

    sessionRepositoryMock = {
      save: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      getUserSessions: jest.fn().mockResolvedValue([]),
      saveUserSessions: jest.fn(),
      revokeAllUserSessions: jest.fn(),
    };

    loginHistoryRepositoryMock = {
      create: jest.fn(),
    };

    tokenServiceMock = {
      generateTokenPair: jest.fn().mockResolvedValue({
        accessToken: "mockAccessToken",
        refreshToken: "mockRefreshToken",
        jti: "mockJti",
        expiresAt: new Date(Date.now() + 3600000),
        expiresIn: 3600,
      }),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
    };

    activityLogRepositoryMock = {
      create: jest.fn(),
    };

    emailHistoryRepositoryMock = {
      create: jest.fn(),
      updateStatus: jest.fn(),
    };

    registrationService = new RegistrationService(
      userRepositoryMock,
      emailHistoryRepositoryMock,
    );

    authenticationService = new AuthenticationService(
      userRepositoryMock,
      sessionRepositoryMock,
      loginHistoryRepositoryMock,
      tokenServiceMock,
    );
  });

  describe("RegistrationService.signup", () => {
    it("should throw error if email is already taken", async () => {
      userRepositoryMock.existsByEmail.mockResolvedValue(true);

      await expect(
        registrationService.signup(
          {
            name: "Test User",
            username: "testuser",
            email: "test@example.com",
            phone: "1234567890",
            password: "password123",
          },
          mockMeta,
        ),
      ).rejects.toThrow(UserAlreadyExistsException);
    });

    it("should register new user if data is unique", async () => {
      userRepositoryMock.existsByEmail.mockResolvedValue(false);
      userRepositoryMock.existsByUsername.mockResolvedValue(false);
      userRepositoryMock.save.mockResolvedValue(mockUser);
      emailHistoryRepositoryMock.create = jest
        .fn()
        .mockResolvedValue(undefined);

      const result = await registrationService.signup(
        {
          name: "Test User",
          username: "testuser",
          email: "test@example.com",
          phone: "1234567890",
          password: "password123",
        },
        mockMeta,
      );

      expect(result.user).toBeDefined();
      expect(userRepositoryMock.save).toHaveBeenCalled();
    });
  });

  describe("AuthenticationService.login", () => {
    it("should throw error if user is not found", async () => {
      userRepositoryMock.findByEmail.mockResolvedValue(null);

      await expect(
        authenticationService.login(
          {
            email: "nonexistent@example.com",
            password: "password123",
          },
          mockMeta,
        ),
      ).rejects.toThrow(InvalidCredentialsException);
    });
  });
});
