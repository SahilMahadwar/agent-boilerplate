import {
  AuthorizationError,
  CimdFetchError,
  type ConsentDescription,
} from "@cloudflare/workers-oauth-provider";
import { type Context, Hono } from "hono";
import type { Child } from "hono/jsx";

// The `/authorize` page of the OAuth flow that MCP clients (ChatGPT, Claude)
// run before calling `/api/mcp/*`. `OAuthProvider` in `src/index.ts` handles
// registration, tokens and discovery; this page only decides whether to grant
// access, by asking for the owner password (`MCP_OWNER_PASSWORD`).
export const oauth = new Hono<{ Bindings: Env }>();

const OWNER = "owner";

function Page({ title, children }: { title: string; children: Child }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <style>{`
          :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
          body { max-width: 26rem; margin: 4rem auto; padding: 0 1rem; line-height: 1.5; }
          input, button { font: inherit; padding: .5rem .75rem; }
          input[type=password] { width: 100%; box-sizing: border-box; margin: .25rem 0 1rem; }
          .error { color: #c62828; }
          .warn { padding: .5rem .75rem; border: 1px solid currentColor; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}

function ConsentPage({
  details,
  handle,
  error,
}: {
  details: ConsentDescription;
  handle: string;
  error?: string;
}) {
  return (
    <Page title={`Authorize ${details.clientName}`}>
      <h1>Allow {details.clientName} to use this MCP server?</h1>
      <p>
        {details.clientDomain ? (
          <>
            Published by <strong>{details.clientDomain}</strong>.
          </>
        ) : (
          "This app registered itself; its name is not verified."
        )}{" "}
        Access will be sent to <strong>{details.redirectHost}</strong>.
      </p>
      {details.redirectIsLoopback && (
        <p class="warn">
          This sends access to an app on your computer. Continue only if you
          just started connecting from it.
        </p>
      )}
      {error && <p class="error">{error}</p>}
      <form method="post">
        <input type="hidden" name="handle" value={handle} />
        <label>
          Owner password
          <input
            type="password"
            name="password"
            autocomplete="current-password"
            autofocus
          />
        </label>
        <button name="decision" value="approve">
          Allow
        </button>{" "}
        <button name="decision" value="deny">
          Deny
        </button>
      </form>
    </Page>
  );
}

// Compares SHA-256 digests so the comparison takes the same time whatever the input.
async function passwordMatches(input: string, expected: string) {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(input)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}

async function showConsent(
  c: Context<{ Bindings: Env }>,
  request: Request,
  error?: string,
) {
  const api = c.env.OAUTH_PROVIDER;
  const authRequest = await api.parseAuthRequest(request);
  const details = await api.describeConsent(authRequest);
  const consent = await api.beginConsent(authRequest);
  return c.html(
    <ConsentPage details={details} handle={consent.handle} error={error} />,
    error ? 401 : 200,
    Object.fromEntries(consent.headers),
  );
}

oauth.onError((error, c) => {
  if (error instanceof AuthorizationError && error.redirectTo) {
    return c.redirect(error.redirectTo, 302);
  }
  if (error instanceof AuthorizationError || error instanceof CimdFetchError) {
    const message =
      error instanceof AuthorizationError
        ? error.description
        : "This app could not be verified.";
    return c.html(
      <Page title="Authorization failed">
        <h1>Authorization failed</h1>
        <p>{message}</p>
        <p>Start connecting again from the app.</p>
      </Page>,
      400,
    );
  }
  throw error;
});

oauth.get("/authorize", (c) => showConsent(c, c.req.raw));

oauth.post("/authorize", async (c) => {
  const api = c.env.OAUTH_PROVIDER;
  const form = await c.req.formData();
  const handle = String(form.get("handle") ?? "");

  if (form.get("decision") !== "approve") {
    const denied = await api.denyConsent(c.req.raw, handle);
    return new Response(null, { status: 302, headers: denied.headers });
  }

  const expected = c.env.MCP_OWNER_PASSWORD;
  if (
    !expected ||
    !(await passwordMatches(String(form.get("password") ?? ""), expected))
  ) {
    // The handle is still unused, so the request can be shown again with a fresh one.
    return showConsent(
      c,
      c.req.raw,
      expected ? "Wrong password." : "MCP_OWNER_PASSWORD is not set.",
    );
  }

  const approved = await api.approveConsent(c.req.raw, handle);
  const { redirectTo } = await api.completeAuthorization({
    request: approved.request,
    userId: OWNER,
    metadata: {},
    scope: approved.request.scope,
    props: { userId: OWNER },
  });
  approved.headers.set("Location", redirectTo);
  return new Response(null, { status: 302, headers: approved.headers });
});
