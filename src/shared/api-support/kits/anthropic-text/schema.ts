import { z } from "zod";
import { AnthropicV1BaseSchema } from "../anthropic-chat/schema";
import { config } from "../../../../config";

const CLAUDE_OUTPUT_MAX = config.maxOutputTokensAnthropic;

// https://docs.anthropic.com/claude/reference/complete_post [deprecated]
export const AnthropicV1TextSchema = AnthropicV1BaseSchema.merge(
  z.object({
    prompt: z.string(),
    max_tokens_to_sample: z.coerce
      .number()
      .int()
      .transform((v) => Math.min(v, CLAUDE_OUTPUT_MAX)),
  })
);
