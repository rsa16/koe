import { Database } from "@koe/db";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { isAddressBlocked } from "../network-blocks.js";

export interface NetworkBlocksOptions {
  db: Database;
}

export default fp(async function networkBlocksPlugin(
  app: FastifyInstance,
  options: NetworkBlocksOptions
) {
  const { db } = options;

  app.decorate(
    "requireNetworkNotBlocked",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Admins bypass so an admin who shares an address with an abuser cannot
      // lock themselves out of their own instance.
      if (request.user?.role === "admin") {
        return;
      }
      if (await isAddressBlocked(db, request.ip)) {
        return app.sendProblem(
          reply,
          403,
          "Forbidden",
          "This network address is blocked from interacting",
          request.url
        );
      }
    }
  );
});

declare module "fastify" {
  interface FastifyInstance {
    requireNetworkNotBlocked(
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void | FastifyReply>;
  }
}
