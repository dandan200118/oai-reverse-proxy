import { logger } from "../../../../../logger";
import { SSEResponseTransformArgs } from "../index";
import { parseEvent, ServerSentEvent } from "../parse-sse";

const log = logger.child({
  module: "sse-transformer",
  transformer: "mistral-ai-to-openai",
});

type MistralAIStreamEvent = {
  choices: {
    index: number;
    message: { role: string; content: string };
    stop_reason: string | null;
  }[];
  "amazon-bedrock-invocationMetrics"?: {
    inputTokenCount: number;
    outputTokenCount: number;
    invocationLatency: number;
    firstByteLatency: number;
  };
};

export const mistralAIToOpenAI = (params: SSEResponseTransformArgs) => {
  const { data } = params;

  const rawEvent = parseEvent(data);
  if (!rawEvent.data || rawEvent.data === "[DONE]") {
    return { position: -1 };
  }

  const completionEvent = asCompletion(rawEvent);
  if (!completionEvent) {
    return { position: -1 };
  }

  const newEvent = {
    id: params.fallbackId,
    object: "chat.completion.chunk" as const,
    created: Date.now(),
    model: params.fallbackModel,
    choices: [
      {
        index: completionEvent.choices[0].index,
        delta: { content: completionEvent.choices[0].message.content },
        finish_reason: completionEvent.choices[0].stop_reason,
      },
    ],
  };

  return { position: -1, event: newEvent };
};

function asCompletion(event: ServerSentEvent): MistralAIStreamEvent | null {
  try {
    const parsed = JSON.parse(event.data);
    if (
      Array.isArray(parsed.choices) &&
      parsed.choices[0].message !== undefined
    ) {
      return parsed;
    } else {
      // noinspection ExceptionCaughtLocallyJS
      throw new Error("Missing required fields");
    }
  } catch (error) {
    log.warn({ error: error.stack, event }, "Received invalid data event");
  }
  return null;
}
