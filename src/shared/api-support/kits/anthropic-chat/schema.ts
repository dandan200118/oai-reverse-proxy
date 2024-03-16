import { z } from "zod";
import { config } from "../../../../config";

const CLAUDE_OUTPUT_MAX = config.maxOutputTokensAnthropic;

export const AnthropicV1BaseSchema = z
  .object({
    model: z.string().max(100),
    stop_sequences: z.array(z.string().max(500)).optional(),
    stream: z.boolean().optional().default(false),
    temperature: z.coerce.number().optional().default(1),
    top_k: z.coerce.number().optional(),
    top_p: z.coerce.number().optional(),
    metadata: z.object({ user_id: z.string().optional() }).optional(),
  })
  .strip();
const AnthropicV1MessageMultimodalContentSchema = z.array(
  z.union([
    z.object({ type: z.literal("text"), text: z.string() }),
    z.object({
      type: z.literal("image"),
      source: z.object({
        type: z.literal("base64"),
        media_type: z.string().max(100),
        data: z.string(),
      }),
    }),
  ])
);

// https://docs.anthropic.com/claude/reference/messages_post
export const AnthropicV1MessagesSchema = AnthropicV1BaseSchema.merge(
  z.object({
    messages: z.array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.union([
          z.string(),
          AnthropicV1MessageMultimodalContentSchema,
        ]),
      })
    ),
    max_tokens: z
      .number()
      .int()
      .transform((v) => Math.min(v, CLAUDE_OUTPUT_MAX)),
    system: z.string().optional(),
  })
);
export type AnthropicChatMessage = z.infer<
  typeof AnthropicV1MessagesSchema
>["messages"][0];
