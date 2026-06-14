import { Schema, model } from "mongoose";
import {
  EmailType,
  EmailStatus,
  LoginAction,
} from "../../../domain/interfaces/auth.interface";

// ================================
// Email History — Schema & Model
// ================================

const emailHistorySchema = new Schema(
  {
    authId: { type: String, required: true, index: true },
    emailTo: { type: String, required: true, index: true },
    emailType: { type: String, enum: Object.values(EmailType), required: true },
    subject: { type: String, required: true },
    emailProvider: { type: String },
    messageId: { type: String, required: true, index: true },
    emailStatus: {
      type: String,
      enum: Object.values(EmailStatus),
      required: true,
    },
    retryCount: { type: Number, default: 0 },
    ipAddress: { type: String },
    userAgent: { type: String },
    sentAt: { type: Date, default: Date.now, index: true },
    errorMessage: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
emailHistorySchema.index({ authId: 1, createdAt: -1 });
export const EmailHistoryModel = model("EmailHistory", emailHistorySchema);

// ================================
// Login History — Schema & Model
// ================================

const loginHistorySchema = new Schema(
  {
    authId: { type: String, required: true, index: true },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
    deviceId: { type: String },
    geoCountry: { type: String },
    geoCity: { type: String },
    action: { type: String, enum: Object.values(LoginAction), required: true },
    success: { type: Boolean, required: true },
    failureReason: { type: String },
    attemptNumber: { type: Number, default: 1 },
    isSuspicious: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
loginHistorySchema.index({ authId: 1, createdAt: -1 });
loginHistorySchema.index({ ipAddress: 1, createdAt: -1 });
export const LoginHistoryModel = model("LoginHistory", loginHistorySchema);
