// https://docs.mistral.ai/api#operation/createChatCompletion
import { z } from "zod";


import { OPENAI_OUTPUT_MAX } from "../openai/schema";

export const MistralAIV1ChatCompletionsSchema = z.object({
  model: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    })
  ),
  temperature: z.number().optional().default(0.7),
  top_p: z.number().optional().default(1),
  max_tokens: z.coerce
    .number()
    .int()
    .nullish()
    .transform((v) => Math.min(v ?? OPENAI_OUTPUT_MAX, OPENAI_OUTPUT_MAX)),
  stream: z.boolean().optional().default(false),
  safe_prompt: z.boolean().optional().default(false),
  random_seed: z.number().int().optional(),
});
export type MistralAIChatMessage = z.infer<
  typeof MistralAIV1ChatCompletionsSchema
>["messages"][0];
