import { FastifyInstance, FastifyReply } from "fastify";

import fp from "fastify-plugin";

export default fp(async function problemDetailsPlugin(app: FastifyInstance) {
  // Helper to send RFC 9457 Problem Details
  app.decorate(
    "sendProblem",
    (
      reply: FastifyReply,
      status: number,
      title: string,
      detail?: string,
      instance?: string,
      invalidParams?: unknown
    ) => {
      return reply.status(status).type("application/problem+json").send({
        type: "about:blank",
        title,
        status,
        detail,
        instance,
        ...(invalidParams ? { "invalid-params": invalidParams } : {}),
      });
    }
  );

  // RFC 9457 Problem Details Error Handler
  app.setErrorHandler((error: any, request, reply) => {
    const statusCode = error.statusCode || 500;
    return app.sendProblem(
      reply,
      statusCode,
      error.name || "Internal Server Error",
      error.message,
      request.url
    );
  });
});

declare module "fastify" {
  interface FastifyInstance {
    sendProblem(
      reply: FastifyReply,
      status: number,
      title: string,
      detail?: string,
      instance?: string,
      invalidParams?: unknown
    ): FastifyReply;
  }
}