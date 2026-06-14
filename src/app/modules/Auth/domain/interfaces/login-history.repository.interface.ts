import { LoginAction } from "./auth.interface";

export interface ILoginHistoryRecord {
  authId: string;
  ipAddress: string;
  userAgent: string;
  deviceId?: string;
  geoCountry?: string;
  geoCity?: string;
  action: LoginAction;
  success: boolean;
  failureReason?: string;
  attemptNumber: number;
  isSuspicious: boolean;
}

export interface ILoginHistoryRepository {
  create(record: ILoginHistoryRecord): Promise<void>;
}
