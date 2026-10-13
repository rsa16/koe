export { createEventBus, type EventBusOptions } from "./bus.js";
export {
  createWebhookDispatcher,
  signPayload,
  DEFAULT_WEBHOOK_TIMEOUT_MS,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_EVENT_HEADER,
  WEBHOOK_DELIVERY_HEADER,
  type FetchLike,
  type WebhookDispatcher,
  type WebhookDispatcherOptions,
} from "./webhooks.js";

import type { EventBus } from "@koe/core";
import type { WebhookDispatcher } from "./webhooks.js";

declare module "fastify" {
  interface FastifyInstance {
    events: EventBus;
    webhooks: WebhookDispatcher;
  }
}
