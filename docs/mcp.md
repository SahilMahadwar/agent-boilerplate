# MCP server (ChatGPT, Claude)

This Worker exposes Mastra tools, agents and workflows as a remote
[MCP](https://modelcontextprotocol.io) server, so they can be used from ChatGPT and Claude.

| What               | Where                                                       |
| ------------------ | ----------------------------------------------------------- |
| MCP endpoint       | `https://<your-worker>/api/mcp/weather-mcp/mcp`             |
| What is exposed    | `src/mastra/mcp/weather-mcp-server.ts`                      |
| Login page         | `src/routes/oauth.tsx` (`/authorize`)                       |
| OAuth server setup | `src/index.ts` (`OAuthProvider`)                            |

## How it works

- `MCPServer` (`@mastra/mcp`) is registered in `src/mastra/index.ts` under `mcpServers`, and
  `@mastra/hono` serves it over Streamable HTTP. It speaks the MCP `2026-07-28` revision and falls
  back to a stateless 2025-protocol mode for older clients, both on the same URL.
- The endpoint is protected with OAuth 2.1 by `@cloudflare/workers-oauth-provider`, which serves
  discovery (`/.well-known/oauth-protected-resource/...`, `/.well-known/oauth-authorization-server`),
  dynamic client registration (`/register`), Client ID Metadata Documents, PKCE and `/token`.
  Clients, grants and tokens are stored in the `OAUTH_KV` namespace.
- When ChatGPT or Claude connects, you are sent to `/authorize`, which asks for the owner password
  (`MCP_OWNER_PASSWORD`). Whoever has the password can connect a client.
- Only the MCP endpoint is served under `/api/mcp/*`. Mastra's other MCP routes (`/tools/...`,
  `/sse`, the registry) would bypass OAuth, so they return 404.

## Changing what is exposed

Edit `src/mastra/mcp/weather-mcp-server.ts`.

**Tool**: add it to `tools`. The key becomes the tool name clients see.

```ts
tools: { weatherTool, myNewTool },
```

**Agent**: wrap it with `agentTool()` and add it to `tools`. It is exposed as `ask_<key>`, takes
`{ message }`, and returns the agent's reply.

```ts
tools: { ask_supportAgent: agentTool("supportAgent", supportAgent) },
```

Don't use MCPServer's `agents` option. It builds the tool with a plain JSON Schema, which Mastra
validates with Ajv, and Ajv uses `new Function`, which Workers forbid, so every call fails (see
`src/mastra/mcp/agent-tool.ts`). Give the agent a `description`, because clients use it to decide
when to call the tool.

**Workflow**: add it to `workflows`. It is exposed as `run_<key>`, its `inputSchema` is the tool's
input, and it **must** have a `description` or the server fails at startup.

```ts
workflows: { weatherWorkflow, myWorkflow },
```

**Remove** something by deleting its entry. The underlying tool, agent or workflow keeps working
in the rest of the app; it is just no longer visible to MCP clients.

Notes:

- Claude rejects tool names longer than 64 characters, so keep keys short.
- Every exposed tool can be called by any connected client. Exposing an agent spends your model
  credits (OpenRouter) on every call.
- Write descriptions for the client's model: they decide when it calls your tool.

### Adding a second MCP server

The OAuth provider protects one resource, `MCP_PATH` in `src/index.ts`. The simplest option is to
add more tools to the existing server. If you need a separate server, register it in
`mcpServers`, then switch `OAuthProvider` to the `apiHandlers` map, or to the role-based
`OAuthAuthorizationServer` / `OAuthResourceServer` API, so each server path is protected, and
allow its path in the `/api/mcp/*` guard in `src/index.ts`.

## Setup

### Local

1. Add a password to `.dev.vars`: `MCP_OWNER_PASSWORD=...`
2. `pnpm dev`
3. Test with the MCP Inspector: `npx @modelcontextprotocol/inspector`. Choose "Streamable HTTP" and
   the URL `http://localhost:5173/api/mcp/weather-mcp/mcp`, then go through the OAuth flow.

ChatGPT and Claude connect from their own servers, so they can't reach `localhost`. Deploy first,
or expose your dev server through a tunnel (e.g. `cloudflared tunnel --url http://localhost:5173`).

### Production

1. Create the KV namespace and put its id in `wrangler.jsonc` → `env.production.kv_namespaces`:
   `npx wrangler kv namespace create OAUTH_KV --env production`
2. Set the password: `npx wrangler secret put MCP_OWNER_PASSWORD --env production`
3. `pnpm deploy`

## Connecting clients

Use the endpoint URL `https://<your-worker>/api/mcp/weather-mcp/mcp` in both clients.

### Claude (claude.ai, Desktop, mobile)

1. Settings → Connectors → **Add custom connector**.
2. Enter a name and the endpoint URL. Leave the OAuth client ID and secret empty, because Claude
   registers itself.
3. Click **Connect**, enter the owner password on the page that opens, and click **Allow**.
4. In a chat, enable the connector from the tools menu, then ask e.g. "What's the weather in Paris?"

On Team and Enterprise plans an owner may need to add the connector first.

### ChatGPT

1. Settings → Apps & Connectors → Advanced settings → turn on **Developer mode**. On some accounts
   the toggle is under Security. Developer mode is a beta and needs an eligible plan.
2. Settings → Apps & Connectors → **Create** (or "Add custom connector").
3. Enter a name, the endpoint URL, and authentication **OAuth**. ChatGPT discovers the endpoints and
   registers itself.
4. Enter the owner password on the page that opens, and click **Allow**.
5. In a chat, choose Developer mode / your connector from the tools menu and ask for the weather.

## Rotating access

- **Change the password**: set a new `MCP_OWNER_PASSWORD`. Already-connected clients keep their
  tokens.
- **Disconnect every client**: delete the keys in the `OAUTH_KV` namespace, or create a new
  namespace. Clients then have to go through `/authorize` again.
- Access tokens last 1 hour, and refresh tokens 30 days (the `OAuthProvider` defaults; see
  `accessTokenTTL` and `refreshTokenTTL` in `src/index.ts`).
