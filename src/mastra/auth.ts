import {
  type BetterAuthUser,
  MastraAuthBetterAuth,
} from "@mastra/auth-better-auth";
import { getRequestHeader, type MastraAuthRequest } from "@mastra/core/server";
import type { Auth as BetterAuth } from "better-auth";
import { auth, isValidApiKey, MCP_PATH, sha256 } from "../auth.js";

/**
 * Mastra `server.auth` for the `/api/*` routes: the dashboard's Better Auth
 * session (the cookie the SPA sends, or `Authorization: Bearer <session token>`),
 * or an API key from API_KEYS (`Authorization: Bearer`, `X-API-Key` or
 * `?apiKey=`). The user lands on the request context (`requestContext.get("user")`).
 *
 * MCP_PATH is public here: OAuthProvider (src/index.ts) has already checked the
 * OAuth token before the request reaches Mastra.
 */
export class AppAuthProvider extends MastraAuthBetterAuth {
  constructor() {
    // `auth` is a lazy proxy: this runs at module scope, before secrets can be read.
    super({
      auth: auth as unknown as BetterAuth,
      public: [MCP_PATH],
      signUpEnabled: false,
      // Single owner: every caller (session or API key) shares one memory resource,
      // and a client-supplied resource id can't override it. With more than one
      // real user, map to `(u) => u.user.id` instead.
      mapUserToResourceId: () => "owner",
    });
  }

  // Mastra passes the Authorization header minus any "Bearer " prefix, or `?apiKey=`.
  override async authenticateToken(
    token: string,
    request: MastraAuthRequest,
  ): Promise<BetterAuthUser | null> {
    const key = getRequestHeader(request, "x-api-key") || token;
    if (key && (await isValidApiKey(key))) {
      // Stable id per key without exposing it.
      const hash = Array.from((await sha256(key)).slice(0, 4), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      const id = `api-key:${hash}`;
      const now = new Date();
      return {
        user: { id, name: id, email: "", emailVerified: false, createdAt: now, updatedAt: now },
        session: { id, userId: id, token: "", expiresAt: now, createdAt: now, updatedAt: now },
      };
    }
    return super.authenticateToken(token, request);
  }
}
