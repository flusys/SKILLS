import { OnDomainEvent } from "@flusys/nestjs-shared/decorators";
import { DomainEvent } from "@flusys/nestjs-shared/interfaces";
import { Injectable, Logger } from "@nestjs/common";

/**
 * Application side consumer for the events every feature package publishes.
 *
 * `*` matches one segment, `**` matches the rest:
 *   @OnDomainEvent('storage.file_manager.uploaded')
 *   @OnDomainEvent('auth.*.deleted', 'iam.*.deleted')
 *   @OnDomainEvent('**')
 *
 * Handlers run on a singleton provider registered in AppModule. Keep them
 * idempotent and non-throwing: the same event can arrive twice after a broker
 * reconnect, and a handler that throws only logs.
 */
@Injectable()
export class DomainEventConsumer {
  private readonly logger = new Logger(DomainEventConsumer.name);

  @OnDomainEvent("**")
  handleAny(event: DomainEvent): void {
    this.logger.debug(
      `${event.name} [${event.payload.ids.join(", ")}] by ${event.actor.userId ?? "system"}`,
    );
  }

  @OnDomainEvent("auth.session.logged-in", "auth.session.logged-out")
  handleSession(event: DomainEvent): void {
    this.logger.log(`${event.actor.userId} ${event.action}`);
  }
}
