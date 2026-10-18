import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";

import fp from "fastify-plugin";
import { extractBearerToken } from "../bearer.js";

export interface ServiceTokenPluginOptions {
  /**
   * The single shared secret an external service presents as
   * `Authorization: Bearer $KOE_SERVICE_TOKEN`. When unset, every service route
   * rejects every request.
   */
  serviceToken?: string;
}

/** Constant-time comparison so the credential cannot be probed byte by byte. */
function serviceCredentialsMatch(
  provided: string,
  expected: string
): boolean {
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  if (providedBytes.length !== expectedBytes.length) {
    return false;
  }
  return crypto.timingSafeEqual(providedBytes, expectedBytes);
}

export default fp(async function serviceTokenPlugin(
  app: FastifyInstance,
  options: ServiceTokenPluginOptions
) {
  const expected = options.serviceToken;

  // Authorises exactly the routes that opt in by naming this preHandler. It
  // reads a static bearer secret, not a signed access token, so it can never
  // satisfy `authenticate`, `requireRole` or the admin session guards.
  app.decorate(
    "serviceAuthenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const provided = extractBearerToken(request);

      if (!expected || !provided || !serviceCredentialsMatch(provided, expected)) {
        return app.sendProblem(
          reply,
          401,
          "Unauthorized",
          "Missing or invalid service credential",
          request.url
        );
      }
    }
  );
});

declare module "fastify" {
  interface FastifyInstance {
    serviceAuthenticate(
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void | FastifyReply>;
  }
}
