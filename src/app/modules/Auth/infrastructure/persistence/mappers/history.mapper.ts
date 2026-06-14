import {
  IEmailHistoryRecord,
} from "../../../domain/interfaces/email-history.repository.interface";
import {
  ILoginHistoryRecord,
} from "../../../domain/interfaces/login-history.repository.interface";
import {
  EmailHistoryModel,
  LoginHistoryModel,
} from "../mongoose/history.schema";

// ================================
// Email History — Mapping
// ================================

export function toEmailHistoryDocument(record: IEmailHistoryRecord): any {
  return {
    authId: record.authId,
    emailTo: record.emailTo,
    emailType: record.emailType,
    subject: record.subject,
    messageId: record.messageId,
    emailStatus: record.emailStatus,
    retryCount: record.retryCount || 0,
    ipAddress: record.ipAddress,
    userAgent: record.userAgent,
    errorMessage: record.errorMessage,
    sentAt: record.sentAt || new Date(),
  };
}

// ================================
// Login History — Mapping
// ================================

export function toLoginHistoryDocument(record: ILoginHistoryRecord): any {
  return {
    authId: record.authId,
    ipAddress: record.ipAddress,
    userAgent: record.userAgent,
    deviceId: record.deviceId,
    geoCountry: record.geoCountry,
    geoCity: record.geoCity,
    action: record.action,
    success: record.success,
    failureReason: record.failureReason,
    attemptNumber: record.attemptNumber,
    isSuspicious: record.isSuspicious,
  };
}
