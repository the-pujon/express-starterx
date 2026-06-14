import {
  EmailHistoryModel,
  LoginHistoryModel,
} from "../mongoose/history.schema";
import {
  toEmailHistoryDocument,
  toLoginHistoryDocument,
} from "../mappers/history.mapper";
import {
  IEmailHistoryRepository,
  IEmailHistoryRecord,
} from "../../../domain/interfaces/email-history.repository.interface";
import {
  ILoginHistoryRepository,
  ILoginHistoryRecord,
} from "../../../domain/interfaces/login-history.repository.interface";
import { EmailStatus } from "../../../domain/interfaces/auth.interface";

/**
 * MongoEmailHistoryRepository
 * Concrete implementation of IEmailHistoryRepository using Mongoose.
 */
export class MongoEmailHistoryRepository implements IEmailHistoryRepository {
  async create(record: IEmailHistoryRecord): Promise<void> {
    try {
      await EmailHistoryModel.create(toEmailHistoryDocument(record));
    } catch (error) {
      console.error("Failed to log email history:", error);
    }
  }

  async updateStatus(
    authId: string,
    emailType: any,
    status: EmailStatus,
    errorMsg?: string,
  ): Promise<void> {
    try {
      await EmailHistoryModel.updateMany(
        { authId, emailType, emailStatus: EmailStatus.PENDING },
        {
          emailStatus: status,
          ...(errorMsg ? { errorMessage: errorMsg } : {}),
        },
      );
    } catch (error) {
      console.error("Failed to update email history status:", error);
    }
  }
}

/**
 * MongoLoginHistoryRepository
 * Concrete implementation of ILoginHistoryRepository using Mongoose.
 */
export class MongoLoginHistoryRepository implements ILoginHistoryRepository {
  async create(record: ILoginHistoryRecord): Promise<void> {
    try {
      await LoginHistoryModel.create(toLoginHistoryDocument(record));
    } catch (error) {
      console.error("Failed to log login history:", error);
    }
  }
}
