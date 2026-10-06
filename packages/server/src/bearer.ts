import { FastifyRequest } from "fastify";

export function extractBearerToken(
  request: FastifyRequest
): string | undefined {
  const authHeader = request.headers.authorization;
  return authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : undefined;
}
