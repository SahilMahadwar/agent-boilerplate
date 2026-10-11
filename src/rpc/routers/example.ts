import { z } from "zod";
import { mastra } from "../../mastra/index.js";
import { publicProcedure } from "../orpc.js";

export const exampleRouter = {
  weather: publicProcedure
    .input(z.object({ city: z.string().min(1) }))
    .handler(async ({ input }) => {
      const agent = mastra.getAgent("weatherAgent");
      const result = await agent.generate(`What's the weather in ${input.city}?`);
      return { city: input.city, answer: result.text };
    }),
};
