/**
 * ActivityLogEventListener
 *
 * Listens to domain events and logs them to ActivityLog.
 * This bridges the event system to the ActivityLog module.
 */

import { globalEventEmitter, DomainEventType, DomainEvent } from "../events";
import { ActivityLogService } from "../../modules/ActivityLog/application/services/activity-log.service";
import {
  UserLoggedInEventPayload,
  UserRegisteredEventPayload,
  UserLoggedOutEventPayload,
} from "../events/event.types";
import {
  ActionType,
  EventType,
} from "../../modules/ActivityLog/domain/models/activity-log.model";

export class ActivityLogEventListener {
  constructor(private readonly activityLogService: ActivityLogService) {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // Listen for user login events
    globalEventEmitter.on(
      DomainEventType.USER_LOGGED_IN,
      async (event: DomainEvent<UserLoggedInEventPayload>) => {
        const payload = event.payload;
        await this.activityLogService.logActivity({
          tableName: "users",
          recordId: payload.userId,
          action: ActionType.LOGIN,
          eventType: EventType.LOGIN,
          metadata: {
            ip: payload.ip,
            userAgent: payload.userAgent,
            actionedBy: payload.userId,
            device: payload.device,
          },
        });
      },
    );

    // Listen for user logout events
    globalEventEmitter.on(
      DomainEventType.USER_LOGGED_OUT,
      async (event: DomainEvent<UserLoggedOutEventPayload>) => {
        const payload = event.payload;
        await this.activityLogService.logActivity({
          tableName: "users",
          recordId: payload.userId,
          action: ActionType.LOGOUT,
          eventType: EventType.LOGOUT,
          metadata: {
            actionedBy: payload.userId,
          },
        });
      },
    );

    // Listen for user registration events
    globalEventEmitter.on(
      DomainEventType.USER_REGISTERED,
      async (event: DomainEvent<UserRegisteredEventPayload>) => {
        const payload = event.payload;
        await this.activityLogService.logActivity({
          tableName: "users",
          recordId: payload.userId,
          action: ActionType.CREATE,
          eventType: EventType.CREATE,
          metadata: {
            actionedBy: payload.userId,
          },
        });
      },
    );
  }
}
