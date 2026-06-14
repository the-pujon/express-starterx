import { IActivityLogRepository } from "../../domain/interfaces/activity-log.repository.interface";
import { ActionType, EventType, IFieldChange, ActivityLog } from "../../domain/models/activity-log.model";

export interface ActivityLogMetadata {
  ip?: string;
  userAgent?: string;
  actionedBy?: string | null;
  device?: string;
}

/**
 * ActivityLogService
 * Application service for orchestrating ActivityLog use cases.
 */
export class ActivityLogService {
  constructor(private readonly activityLogRepository: IActivityLogRepository) {}

  async logActivity(params: {
    tableName: string;
    recordId: string;
    action: ActionType;
    eventType?: EventType;
    changes?: IFieldChange[];
    metadata: ActivityLogMetadata;
  }): Promise<void> {
    const { tableName, recordId, action, eventType, changes = [], metadata } = params;

    const log = ActivityLog.create({
      tableName,
      recordId,
      action,
      eventType: eventType || (action as unknown as EventType),
      actionedBy: metadata.actionedBy || undefined,
      ipAddress: metadata.ip,
      userAgent: metadata.userAgent,
      device: metadata.device,
      details: changes,
    });

    await this.activityLogRepository.create(log);
  }

  async logCreate(
    tableName: string,
    recordId: string,
    fields: Record<string, unknown>,
    metadata: ActivityLogMetadata,
  ): Promise<void> {
    const changes: IFieldChange[] = Object.entries(fields).map(([key, value]) => ({
      fieldName: key,
      oldValue: null,
      newValue: value != null ? String(value) : null,
    }));

    return this.logActivity({
      tableName,
      recordId,
      action: ActionType.CREATE,
      eventType: EventType.CREATE,
      changes,
      metadata,
    });
  }

  async logUpdate(
    tableName: string,
    recordId: string,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    metadata: ActivityLogMetadata,
  ): Promise<void> {
    const changes: IFieldChange[] = [];

    for (const [key, newValue] of Object.entries(newData)) {
      const oldValue = oldData[key];
      if (oldValue !== newValue) {
        changes.push({
          fieldName: key,
          oldValue: oldValue != null ? String(oldValue) : null,
          newValue: newValue != null ? String(newValue) : null,
        });
      }
    }

    if (changes.length === 0) {
      return; // No changes to log
    }

    return this.logActivity({
      tableName,
      recordId,
      action: ActionType.UPDATE,
      eventType: EventType.UPDATE,
      changes,
      metadata,
    });
  }

  async logDelete(
    tableName: string,
    recordId: string,
    deletedData: Record<string, unknown>,
    metadata: ActivityLogMetadata,
  ): Promise<void> {
    const changes: IFieldChange[] = Object.entries(deletedData).map(([key, value]) => ({
      fieldName: key,
      oldValue: value != null ? String(value) : null,
      newValue: null,
    }));

    return this.logActivity({
      tableName,
      recordId,
      action: ActionType.DELETE,
      eventType: EventType.DELETE,
      changes,
      metadata,
    });
  }

  async logCustomEvent(
    tableName: string,
    recordId: string,
    eventType: EventType,
    metadata: ActivityLogMetadata,
    changes?: IFieldChange[],
  ): Promise<void> {
    return this.logActivity({
      tableName,
      recordId,
      action: ActionType.UPDATE,
      eventType,
      changes,
      metadata,
    });
  }
}
