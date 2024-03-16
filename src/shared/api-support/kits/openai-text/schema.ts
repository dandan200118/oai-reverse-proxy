import { z } from "zod";
import { OpenAIV1ChatCompletionSchema } from "../openai/schema";

export const OpenAIV1TextCompletionSchema = z
  .object({
    model: z
      .string()
      .max(100)
      .regex(
        /^gpt-3.5-turbo-instruct/,
        "Model must start with 'gpt-3.5-turbo-instruct'"
      ),
    prompt: z.string({
      required_error:
        "No `prompt` found. Ensure you've set the correct completion endpoint.",
    }),
    logprobs: z.number().int().nullish().default(null),
    echo: z.boolean().optional().default(false),
    best_of: z.literal(1).optional(),
    stop: z
      .union([z.string().max(500), z.array(z.string().max(500)).max(4)])
      .optional(),
    suffix: z.string().max(1000).optional(),
  })
  .strip()
  .merge(OpenAIV1ChatCompletionSchema.omit({ messages: true, logprobs: true }));
