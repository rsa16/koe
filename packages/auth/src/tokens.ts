import { SignJWT, jwtVerify } from "jose";
import { UserRole, UserRoleSchema } from "@koe/core";

export interface TokenPayload {
  userId: string;
  role: UserRole;
}

export interface SignTokenOptions {
  secret: string;
  expiresIn?: string;
}

export interface VerifyTokenOptions {
  secret: string;
}

function getSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(
  payload: TokenPayload,
  options: SignTokenOptions
): Promise<string> {
  const secretKey = getSecretKey(options.secret);
  const jwt = new SignJWT({
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt();

  if (options.expiresIn) {
    jwt.setExpirationTime(options.expiresIn);
  }

  return await jwt.sign(secretKey);
}

export async function verifyAccessToken(
  token: string,
  options: VerifyTokenOptions
): Promise<TokenPayload> {
  const secretKey = getSecretKey(options.secret);
  const { payload } = await jwtVerify(token, secretKey);

  if (!payload.sub) {
    throw new Error("Invalid token: missing sub claim");
  }

  const role = UserRoleSchema.safeParse(payload.role);
  if (!role.success) {
    throw new Error("Invalid token: invalid role claim");
  }

  return {
    userId: payload.sub,
    role: role.data,
  };
}
