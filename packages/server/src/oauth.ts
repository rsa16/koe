import { Google, decodeIdToken, generateCodeVerifier, generateState } from "arctic";

export interface GoogleUserInfo {
  sub: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

export interface GoogleOAuthProvider {
  createAuthorizationURL(state: string, codeVerifier: string, scopes: string[]): URL;
  validateAuthorizationCode(code: string, codeVerifier: string): Promise<GoogleUserInfo>;
}

export const GOOGLE_OAUTH_SCOPES = ["openid", "profile", "email"];

export function createGoogleOAuthProvider(
  clientId: string,
  clientSecret: string,
  redirectURI: string
): GoogleOAuthProvider {
  const google = new Google(clientId, clientSecret, redirectURI);

  return {
    createAuthorizationURL(state: string, codeVerifier: string, scopes: string[]): URL {
      return google.createAuthorizationURL(state, codeVerifier, scopes);
    },
    async validateAuthorizationCode(
      code: string,
      codeVerifier: string
    ): Promise<GoogleUserInfo> {
      const tokens = await google.validateAuthorizationCode(code, codeVerifier);
      const payload = decodeIdToken(tokens.idToken()) as Partial<GoogleUserInfo>;
      return {
        sub: String(payload.sub ?? ""),
        email: payload.email ?? null,
        name: payload.name ?? null,
        picture: payload.picture ?? null,
      };
    },
  };
}

export { generateCodeVerifier, generateState };
