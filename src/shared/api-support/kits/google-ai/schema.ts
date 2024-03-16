import { z } from "zod";

// https://developers.generativeai.google/api/rest/generativelanguage/models/generateContent
export const GoogleAIV1GenerateContentSchema = z
  .object({
    model: z.string().max(100), //actually specified in path but we need it for the router
    stream: z.boolean().optional().default(false), // also used for router
    contents: z.array(
      z.object({
        parts: z.array(z.object({ text: z.string() })),
        role: z.enum(["user", "model"]),
      })
    ),
    tools: z.array(z.object({})).max(0).optional(),
    safetySettings: z.array(z.object({})).max(0).optional(),
    generationConfig: z.object({
      temperature: z.number().optional(),
      maxOutputTokens: z.coerce
        .number()
        .int()
        .optional()
        .default(16)
        .transform((v) => Math.min(v, 1024)), // TODO: Add config
      candidateCount: z.literal(1).optional(),
      topP: z.number().optional(),
      topK: z.number().optional(),
      stopSequences: z.array(z.string().max(500)).max(5).optional(),
    }),
  })
  .strip();

export type GoogleAIChatMessage = z.infer<
  typeof GoogleAIV1GenerateContentSchema
>["contents"][0];
