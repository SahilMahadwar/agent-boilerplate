import { Hono } from "hono";
import { z } from "zod";
import { mastra } from "../mastra/index.js";

export const example = new Hono<{ Bindings: Env }>();

example.get("/example", (c) =>
  c.json({ ok: true, time: new Date().toISOString() }),
);

const askSchema = z.object({ city: z.string().min(1) });

example.post("/weather", async (c) => {
  const parsed = askSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: z.treeifyError(parsed.error) }, 400);
  }

  const agent = mastra.getAgent("weatherAgent");
  const result = await agent.generate(
    `What's the weather in ${parsed.data.city}?`,
  );
  return c.json({ city: parsed.data.city, answer: result.text });
});
