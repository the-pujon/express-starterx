import { EmailType, EmailStatus } from "./auth.interface";

export interface IEmailHistoryRecord {
  authId: string;
  emailTo: string;
  emailType: EmailType;
  subject: string;
  messageId: string;
  emailStatus: EmailStatus;
  retryCount?: number;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
  sentAt?: Date;
}

export interface IEmailHistoryRepository {
  create(record: IEmailHistoryRecord): Promise<void>;
  updateStatus(
    authId: string,
    emailType: EmailType,
    status: EmailStatus,
    errorMsg?: string,
  ): Promise<void>;
}
