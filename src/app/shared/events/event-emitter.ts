/**
 * Domain Event Emitter
 *
 * Simple event emitter for domain events.
 * This decouples modules by allowing them to emit events without knowing
 * who listens to them.
 */

import { DomainEvent, DomainEventType } from "./event.types";

type EventHandler<T = unknown> = (
  event: DomainEvent<T>,
) => void | Promise<void>;

export class DomainEventEmitter {
  private handlers: Map<DomainEventType, EventHandler[]> = new Map();

  /**
   * Subscribe to a specific event type
   */
  on<T = unknown>(eventType: DomainEventType, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler as EventHandler);
    this.handlers.set(eventType, handlers);
  }

  /**
   * Unsubscribe from a specific event type
   */
  off<T = unknown>(eventType: DomainEventType, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(eventType) || [];
    const index = handlers.indexOf(handler as EventHandler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
    this.handlers.set(eventType, handlers);
  }

  /**
   * Emit an event - all handlers will be called
   */
  async emit<T = unknown>(event: DomainEvent<T>): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];

    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          // Log error but don't break the chain
          console.error(`Error handling event ${event.type}:`, error);
        }
      }),
    );
  }

  /**
   * Emit an event by type and payload
   */
  async emitType<T = unknown>(
    type: DomainEventType,
    payload: T,
    correlationId?: string,
  ): Promise<void> {
    const event: DomainEvent<T> = {
      type,
      payload,
      timestamp: new Date(),
      correlationId,
    };

    await this.emit(event);
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clear(): void {
    this.handlers.clear();
  }
}

// Singleton instance for global use
export const globalEventEmitter = new DomainEventEmitter();
