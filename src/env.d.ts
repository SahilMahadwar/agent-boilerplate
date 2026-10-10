import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";

// `OAuthProvider` (src/index.ts) injects its helpers into `env` at runtime;
// `wrangler types` cannot see that, so it is declared here.
declare global {
  interface Env {
    OAUTH_PROVIDER: OAuthHelpers;
  }
  namespace Cloudflare {
    interface Env {
      OAUTH_PROVIDER: OAuthHelpers;
    }
  }
}
