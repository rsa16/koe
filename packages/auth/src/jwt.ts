import { SignJWT, jwtVerify } from "jose";

export async function signJwt(
  data: Record<string, unknown>,
  secret: string,
  maxAgeSeconds: number
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT(data)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeSeconds)
    .sign(key);
}

export async function verifyJwt(
  value: string,
  secret: string
): Promise<Record<string, unknown> | null> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(value, key, {
      algorithms: ["HS256"],
      requiredClaims: ["exp"],
    });
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}
