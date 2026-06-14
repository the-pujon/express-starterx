import request from "supertest";
import mongoose from "mongoose";
import app from "../../app";
import { UserMongooseModel as User } from "../../app/modules/Auth/infrastructure/persistence/mongoose/user.schema";
import dotenv from "dotenv";
import path from "path";

// Ensure env variables are loaded
dotenv.config({ path: path.join(__dirname, "../../../.env.test") });

// Set global timeout for all tests in this suite — must be at module level
jest.setTimeout(30000);

describe("Auth E2E", () => {
  let accessToken: string;
  let refreshToken: string;
  let dbAvailable = false;

  beforeAll(async () => {
    try {
      // Connect to Test Database
      const dbUri =
        process.env.MONGODB_URI || "mongodb://localhost:27017/express_test_db";
      await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 5000 });
      dbAvailable = true;
    } catch {
      console.warn("⚠️  MongoDB not available — skipping E2E tests");
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      try {
        await User.deleteMany({}); // Clean up users
        await mongoose.connection.close();
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe("POST /api/v1/auth/signup", () => {
    it("should register a new user", async () => {
      if (!dbAvailable) return;
      const res = await request(app).post("/api/v1/auth/signup").send({
        name: "Test User",
        username: "testuser123",
        email: "testauth@example.com",
        password: "Password@123",
        phone: "1234567890",
        role: "customer",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.newUser).toHaveProperty(
        "email",
        "testauth@example.com",
      );
      expect(res.body.data.newUser).toHaveProperty("username", "testuser123");

      // Debug: Log the created user's password hash
      const user = await User.findOne({ email: "testauth@example.com" }).select(
        "+password",
      );
      if (user) console.log("User password:", user.password); // Debug log
    });

    it("should not allow duplicate email", async () => {
      if (!dbAvailable) return;
      const res = await request(app).post("/api/v1/auth/signup").send({
        name: "Test User 2",
        username: "testuser456",
        email: "testauth@example.com", // Duplicate
        password: "Password@123",
        phone: "0987654321",
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should prevent login before verification", async () => {
      if (!dbAvailable) return;
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "testauth@example.com",
        password: "Password@123",
      });

      expect(res.status).toBe(401);
      // Security: actual message is "Invalid email or password" to prevent user enumeration
      expect(res.body.message).toContain("Invalid email or password");
    });

    it("should login successfully after manual verification", async () => {
      if (!dbAvailable) return;
      // Manually verify user in DB
      const user = await User.findOne({ email: "testauth@example.com" });
      console.log("User before verification:", user); // Debug log

      await User.updateOne(
        { email: "testauth@example.com" },
        { isVerified: true },
      );

      const updatedUser = await User.findOne({ email: "testauth@example.com" });
      console.log("User after verification:", updatedUser); // Debug log

      const res = await request(app).post("/api/v1/auth/login").send({
        email: "testauth@example.com",
        password: "Password@123",
      });

      console.log("Login response:", res.body); // Debug log

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("accessToken");
      expect(res.body.data).toHaveProperty("refreshToken");

      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });
  });

  describe("GET /api/v1/user/me", () => {
    it("should return user profile with valid token", async () => {
      if (!dbAvailable) return;
      const res = await request(app)
        .get("/api/v1/user/me")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user).toHaveProperty(
        "email",
        "testauth@example.com",
      );
    });

    it("should reject without token", async () => {
      if (!dbAvailable) return;
      const res = await request(app).get("/api/v1/user/me");

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/v1/auth/refresh-token", () => {
    it("should refresh access token", async () => {
      if (!dbAvailable) return;
      const res = await request(app)
        .post("/api/v1/auth/refresh-token")
        .set("Cookie", [`refreshToken=${refreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("accessToken");

      // Update access token
      accessToken = res.body.data.accessToken;
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("should logout and clear cookies", async () => {
      if (!dbAvailable) return;
      const res = await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Cookie", [`refreshToken=${refreshToken}`])
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("Logged out");
    });
  });
});
