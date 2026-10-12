import {
  Discord,
  Google,
  decodeIdToken,
  generateCodeVerifier,
  generateState,
} from "arctic";

/** Normalized profile shape shared by every OAuth provider. */
export interface OAuthProfile {
  sub: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

export type GoogleUserInfo = OAuthProfile;
export type DiscordUserInfo = OAuthProfile;

/**
 * The slice of a provider (arctic-backed or fake) the OAuth routes depend on.
 * `sub` is the provider's stable user identifier.
 */
export interface OAuthProvider {
  createAuthorizationURL(state: string, codeVerifier: string, scopes: string[]): URL;
  validateAuthorizationCode(code: string, codeVerifier: string): Promise<OAuthProfile>;
}

export type GoogleOAuthProvider = OAuthProvider;
export type DiscordOAuthProvider = OAuthProvider;

export const GOOGLE_OAUTH_SCOPES = ["openid", "profile", "email"];
export const DISCORD_OAUTH_SCOPES = ["identify", "email"];

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

const DISCORD_USER_ENDPOINT = "https://discord.com/api/users/@me";

/**
 * Discord returns a bearer token (no OIDC id token), so the profile is fetched
 * from the `/users/@me` endpoint after the code exchange.
 */
export function createDiscordOAuthProvider(
  clientId: string,
  clientSecret: string,
  redirectURI: string
): DiscordOAuthProvider {
  const discord = new Discord(clientId, clientSecret, redirectURI);

  async function fetchDiscordProfile(accessToken: string): Promise<DiscordUserInfo> {
    const response = await fetch(DISCORD_USER_ENDPOINT, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`Discord user request failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      id?: unknown;
      username?: unknown;
      global_name?: unknown;
      email?: unknown;
      avatar?: unknown;
    };

    if (typeof data.id !== "string" || data.id.length === 0) {
      throw new Error("Discord user response is missing an id");
    }

    return {
      sub: data.id,
      email: typeof data.email === "string" ? data.email : null,
      name: buildName(data.global_name, data.username),
      picture: discordAvatarUrl(data.id, data.avatar),
    };
  }

  return {
    createAuthorizationURL(state: string, codeVerifier: string, scopes: string[]): URL {
      return discord.createAuthorizationURL(state, codeVerifier, scopes);
    },
    async validateAuthorizationCode(
      code: string,
      codeVerifier: string
    ): Promise<DiscordUserInfo> {
      const tokens = await discord.validateAuthorizationCode(code, codeVerifier);
      return fetchDiscordProfile(tokens.accessToken());
    },
  };
}

function buildName(globalName: unknown, username: unknown): string | null {
  if (typeof globalName === "string" && globalName.length > 0) return globalName;
  if (typeof username === "string" && username.length > 0) return username;
  return null;
}

function discordAvatarUrl(userId: string, avatar: unknown): string | null {
  if (typeof avatar !== "string" || avatar.length === 0) return null;
  // Animated avatars are stored with an `a_` hash prefix and served as GIFs.
  const extension = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${extension}`;
}

export { generateCodeVerifier, generateState };
