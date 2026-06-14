import { ActivityLog, ActionType, EventType, IFieldChange } from "../models/activity-log.model";

export interface IActivityLogCreateInput {
  tableName: string;
  recordId: string;
  action: ActionType;
  eventType: EventType;
  actionedBy: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  details: IFieldChange[];
}

/**
 * IActivityLogRepository
 * Port interface for ActivityLog persistence.
 */
export interface IActivityLogRepository {
  create(log: ActivityLog | IActivityLogCreateInput): Promise<void>;
}
