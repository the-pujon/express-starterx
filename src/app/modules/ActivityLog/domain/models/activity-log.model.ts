export enum ActionType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LOGIN = "login",
  LOGOUT = "logout",
}

export enum EventType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LOGIN = "login",
  LOGOUT = "logout",
  PASSWORD_CHANGE = "password_change",
  PROFILE_UPDATE = "profile_update",
}

export interface IFieldChange {
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
}

/**
 * ActivityLog Domain Model
 */
export class ActivityLog {
  constructor(
    public readonly id: string | null,
    public readonly tableName: string,
    public readonly recordId: string,
    public readonly action: ActionType,
    public readonly actionedBy: string | null,
    public readonly ipAddress: string | null,
    public readonly userAgent: string | null,
    public readonly device: string | null,
    public readonly eventType: EventType,
    public readonly details: IFieldChange[],
    public readonly createdAt?: Date,
  ) {}

  static create(data: {
    tableName: string;
    recordId: string;
    action: ActionType;
    actionedBy?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    device?: string | null;
    eventType?: EventType;
    details: IFieldChange[];
  }): ActivityLog {
    return new ActivityLog(
      null,
      data.tableName,
      data.recordId,
      data.action,
      data.actionedBy || null,
      data.ipAddress || null,
      data.userAgent || null,
      data.device || null,
      data.eventType || (data.action as unknown as EventType),
      data.details,
    );
  }
}
