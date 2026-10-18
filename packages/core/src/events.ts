import { z } from "zod";

/**
 * Fixed catalog of domain events the system emits on the internal bus.
 * Integrators subscribe to a subset of these through `WebhookSubscription.events`.
 */
export const EVENT_NAMES = [
  "comment.created",
  "comment.updated",
  "comment.deleted",
  "comment.approved",
  "comment.rejected",
  "report.created",
  "report.resolved",
  "user.banned",
  "user.suspended",
  "user.network_blocked",
  "identity.linked",
  "thread.closed",
  "thread.locked",
  "vote.created",
  "reaction.created",
] as const;

export const EventNameSchema = z.enum(EVENT_NAMES);
export type EventName = z.infer<typeof EventNameSchema>;

/** Maps a user moderation verb to its catalog event. */
export const USER_MODERATION_EVENT: Record<"ban" | "suspend", EventName> = {
  ban: "user.banned",
  suspend: "user.suspended",
};

/**
 * Envelope carried on the bus and delivered to webhook subscribers.
 * `data` holds the event-specific payload (see route emit sites).
 */
export const DomainEventSchema = z.object({
  id: z.string().uuid(),
  type: EventNameSchema,
  occurredAt: z.string().datetime(),
  data: z.record(z.unknown()),
});
export type DomainEvent = z.infer<typeof DomainEventSchema>;

export type EventListener = (event: DomainEvent) => void | Promise<void>;

/** In-process pub/sub used by domain services and the webhook dispatcher. */
export interface EventBus {
  emit(type: EventName, data: Record<string, unknown>): void;
  on(listener: EventListener): () => void;
}

/**
 * Outbound webhook configuration. Each subscription receives only the events
 * it names, signed with its own HMAC secret.
 */
export const WebhookSubscriptionSchema = z.object({
  url: z.string().url(),
  secret: z.string().min(1),
  events: z.array(EventNameSchema).min(1),
  active: z.boolean().default(true),
});
export type WebhookSubscription = z.infer<typeof WebhookSubscriptionSchema>;

export const WebhookSubscriptionsSchema = z.array(WebhookSubscriptionSchema);
export type WebhookSubscriptions = z.infer<typeof WebhookSubscriptionsSchema>;
