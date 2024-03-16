import { APIRequestTransformer } from "../../index";
import { OpenAIV1TextCompletionSchema } from "./schema";
import { OpenAIV1ChatCompletionSchema } from "../openai/schema";

import { flattenOpenAIChatMessages } from "../openai/stringifier";

export const transformOpenAIToOpenAIText: APIRequestTransformer<
  typeof OpenAIV1TextCompletionSchema
> = async (req) => {
  const { body } = req;
  const result = OpenAIV1ChatCompletionSchema.safeParse(body);
  if (!result.success) {
    req.log.warn(
      { issues: result.error.issues, body },
      "Invalid OpenAI-to-OpenAI-text request"
    );
    throw result.error;
  }

  const { messages, ...rest } = result.data;
  const prompt = flattenOpenAIChatMessages(messages);

  let stops = rest.stop
    ? Array.isArray(rest.stop)
      ? rest.stop
      : [rest.stop]
    : [];
  stops.push("\n\nUser:");
  stops = [...new Set(stops)];

  const transformed = { ...rest, prompt: prompt, stop: stops };
  return OpenAIV1TextCompletionSchema.parse(transformed);
};
