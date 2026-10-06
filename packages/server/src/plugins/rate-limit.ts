import rateLimit from "@fastify/rate-limit";
import { verifyAccessToken } from "@koe/auth";
import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { extractBearerToken } from "../bearer.js";

export interface RateLimitConfig {
  windowMs: number;
  comments: number;
  votes: number;
  reactions: number;
  duplicateCommentWindowMs: number;
}

export interface RateLimitPluginOptions {
  jwtSecret: string;
}

export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_DUPLICATE_COMMENT_WINDOW_MS = 30_000;

export function routeRateLimit(
  max: number,
  windowMs: number
): { config: { rateLimit: { max: number; timeWindow: number } } } {
  return { config: { rateLimit: { max, timeWindow: windowMs } } };
}

export default fp(async function rateLimitPlugin(
  app: FastifyInstance,
  options: RateLimitPluginOptions
) {
  await app.register(rateLimit, {
    global: false,
    keyGenerator: async (request) => {
      const token = extractBearerToken(request);
      if (token) {
        try {
          const payload = await verifyAccessToken(token, {
            secret: options.jwtSecret,
          });
          // Guests are keyed by IP so a caller cannot mint fresh anonymous
          // identities to reset their bucket; authenticated accounts are
          // keyed by their stable User id.
          if (payload.role !== "guest") {
            return `user:${payload.userId}`;
          }
        } catch {
          // Invalid or expired tokens fall back to IP-based keying.
        }
      }
      return `ip:${request.ip}`;
    },
    errorResponseBuilder: (_request, context) => {
      const error = new Error(
        `Rate limit exceeded, retry in ${context.after}`
      ) as Error & { statusCode: number };
      error.name =
        context.statusCode === 403 ? "Forbidden" : "Too Many Requests";
      error.statusCode = context.statusCode;
      return error;
    },
  });
});
