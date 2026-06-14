import { Schema, model, Model } from "mongoose";
import bcrypt from "bcrypt";
import {
  User,
  UserRole,
  UserStatus,
  MfaMethod,
} from "../../../domain/models/user.model";
import { AUTH_CONFIG } from "../../../domain/config/auth.config";
import config from "../../../../../config";

// ================================
// Mongoose Document Interface
// ================================

export interface IUserDocument {
  _id?: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  status: string;
  lastLogin: Date;
  isVerified: boolean;
  provider: string;
  providerId?: string;
  deletedAt?: Date;
  tokenVersion: number;
  // Security fields
  failedLoginAttempts?: number;
  lastFailedLogin?: Date;
  accountLocked?: boolean;
  accountLockedUntil?: Date;
  // MFA fields
  mfaEnabled?: boolean;
  mfaMethod?: string;
  mfaSecret?: string;
  lastPasswordChange?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IUserModel extends Model<IUserDocument> {}

// ================================
// Mongoose Schema
// ================================

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters long"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      ],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
      index: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      match: [/^\+?[\d\s-]{10,}$/, "Please enter a valid phone number"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
      minlength: [
        AUTH_CONFIG.PASSWORD_MIN_LENGTH,
        `Password must be at least ${AUTH_CONFIG.PASSWORD_MIN_LENGTH} characters long`,
      ],
    },
    role: {
      type: String,
      enum: {
        values: Object.values(UserRole),
        message: "{VALUE} is not a valid role",
      },
      default: UserRole.CUSTOMER,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(UserStatus),
        message: "{VALUE} is not a valid status",
      },
      default: UserStatus.ACTIVE,
    },
    lastLogin: { type: Date, default: Date.now },
    isVerified: { type: Boolean, default: false },
    provider: { type: String, default: "local" },
    providerId: { type: String, select: false },
    deletedAt: { type: Date, select: false },
    tokenVersion: { type: Number, default: 0 },
    // Security fields
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lastFailedLogin: { type: Date, select: false },
    accountLocked: { type: Boolean, default: false, select: false },
    accountLockedUntil: { type: Date, select: false },
    // MFA fields
    mfaEnabled: { type: Boolean, default: false, select: false },
    mfaMethod: {
      type: String,
      enum: {
        values: Object.values(MfaMethod),
        message: "{VALUE} is not a valid MFA method",
      },
      select: false,
    },
    mfaSecret: { type: String, select: false },
    lastPasswordChange: { type: Date, default: Date.now, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const obj = ret as Record<string, unknown>;
        delete obj.password;
        delete obj.failedLoginAttempts;
        delete obj.lastFailedLogin;
        delete obj.accountLocked;
        delete obj.accountLockedUntil;
        delete obj.mfaSecret;
        delete obj.providerId;
        delete obj.deletedAt;
        return obj;
      },
    },
  },
);

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ email: 1, username: 1 });
userSchema.index(
  { provider: 1, providerId: 1 },
  { unique: true, sparse: true },
);

// Middleware: hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(Number(config.bcrypt_salt_rounds));
  (this as any).password = await bcrypt.hash((this as any).password, salt);
  (this as any).lastPasswordChange = new Date();
});

export const UserMongooseModel = model<IUserDocument, IUserModel>(
  "User",
  userSchema,
);
