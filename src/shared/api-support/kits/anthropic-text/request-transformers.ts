import {
  AnthropicV1TextSchema,
  APIRequestTransformer,
  OpenAIChatMessage,
} from "../../index";

import { OpenAIV1ChatCompletionSchema } from "../openai/schema";

import { flattenOpenAIMessageContent } from "../openai/stringifier";

export const transformOpenAIToAnthropicText: APIRequestTransformer<
  typeof AnthropicV1TextSchema
> = async (req) => {
  const { body } = req;
  const result = OpenAIV1ChatCompletionSchema.safeParse(body);
  if (!result.success) {
    req.log.warn(
      { issues: result.error.issues, body },
      "Invalid OpenAI-to-Anthropic Text request"
    );
    throw result.error;
  }

  req.headers["anthropic-version"] = "2023-06-01";

  const { messages, ...rest } = result.data;
  const prompt = openAIMessagesToClaudeTextPrompt(messages);

  let stops = rest.stop
    ? Array.isArray(rest.stop)
      ? rest.stop
      : [rest.stop]
    : [];
  // Recommended by Anthropic
  stops.push("\n\nHuman:");
  // Helps with jailbreak prompts that send fake system messages and multi-bot
  // chats that prefix bot messages with "System: Respond as <bot name>".
  stops.push("\n\nSystem:");
  // Remove duplicates
  stops = [...new Set(stops)];

  return {
    model: rest.model,
    prompt: prompt,
    max_tokens_to_sample: rest.max_tokens,
    stop_sequences: stops,
    stream: rest.stream,
    temperature: rest.temperature,
    top_p: rest.top_p,
  };
};

function openAIMessagesToClaudeTextPrompt(messages: OpenAIChatMessage[]) {
  return (
    messages
      .map((m) => {
        let role: string = m.role;
        if (role === "assistant") {
          role = "Assistant";
        } else if (role === "system") {
          role = "System";
        } else if (role === "user") {
          role = "Human";
        }
        const name = m.name?.trim();
        const content = flattenOpenAIMessageContent(m.content);
        // https://console.anthropic.com/docs/prompt-design
        // `name` isn't supported by Anthropic but we can still try to use it.
        return `\n\n${role}: ${name ? `(as ${name}) ` : ""}${content}`;
      })
      .join("") + "\n\nAssistant:"
  );
}
