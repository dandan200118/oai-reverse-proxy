// https://platform.openai.com/docs/api-reference/images/create
import { z } from "zod";

export const OpenAIV1ImagesGenerationSchema = z
  .object({
    prompt: z.string().max(4000),
    model: z.string().max(100).optional(),
    quality: z.enum(["standard", "hd"]).optional().default("standard"),
    n: z.number().int().min(1).max(4).optional().default(1),
    response_format: z.enum(["url", "b64_json"]).optional(),
    size: z
      .enum(["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"])
      .optional()
      .default("1024x1024"),
    style: z.enum(["vivid", "natural"]).optional().default("vivid"),
    user: z.string().max(500).optional(),
  })
  .strip();
