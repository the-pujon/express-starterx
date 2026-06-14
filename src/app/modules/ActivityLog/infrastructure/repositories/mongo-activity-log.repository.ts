import { Schema, model, Document } from "mongoose";
import {
  ActivityLog,
  ActionType,
  EventType,
  IFieldChange,
} from "../../domain/models/activity-log.model";
import {
  IActivityLogRepository,
  IActivityLogCreateInput,
} from "../../domain/interfaces/activity-log.repository.interface";

// ================================
// Mongoose Schema & Model
// ================================

interface IActivityLogDocument extends Document {
  tableName: string;
  recordId: string;
  action: ActionType;
  actionedBy?: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  eventType?: EventType;
  details: IFieldChange[];
  createdAt: Date;
}

const fieldChangeSchema = new Schema<IFieldChange>(
  {
    fieldName: { type: String, required: true },
    oldValue: { type: String, default: null },
    newValue: { type: String, default: null },
  },
  { _id: false },
);

const activityLogSchema = new Schema<IActivityLogDocument>(
  {
    tableName: { type: String, required: true },
    recordId: { type: String, required: true },
    action: { type: String, enum: Object.values(ActionType), required: true },
    actionedBy: { type: String, index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    device: { type: String },
    eventType: { type: String, enum: Object.values(EventType) },
    details: [fieldChangeSchema],
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

activityLogSchema.index({ tableName: 1, recordId: 1, createdAt: -1 });
activityLogSchema.index({ actionedBy: 1, createdAt: -1 });

export const ActivityLogModel = model<IActivityLogDocument>(
  "ActivityLogEvent",
  activityLogSchema,
);

// ================================
// Repository Implementation
// ================================

/**
 * MongoActivityLogRepository
 * Concrete implementation of IActivityLogRepository using Mongoose.
 */
export class MongoActivityLogRepository implements IActivityLogRepository {
  async create(log: ActivityLog | IActivityLogCreateInput): Promise<void> {
    try {
      if (log instanceof ActivityLog) {
        await ActivityLogModel.create({
          tableName: log.tableName,
          recordId: log.recordId,
          action: log.action,
          actionedBy: log.actionedBy || undefined,
          ipAddress: log.ipAddress || undefined,
          userAgent: log.userAgent || undefined,
          device: log.device || undefined,
          eventType: log.eventType,
          details: log.details,
        });
      } else {
        await ActivityLogModel.create({
          tableName: log.tableName,
          recordId: log.recordId,
          action: log.action,
          actionedBy: log.actionedBy,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          device: log.device,
          eventType: log.eventType,
          details: log.details,
        });
      }
    } catch (error) {
      console.error("Failed to persist activity log:", error);
    }
  }
}
