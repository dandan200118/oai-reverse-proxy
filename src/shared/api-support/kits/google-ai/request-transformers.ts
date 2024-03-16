import { APIRequestTransformer, GoogleAIChatMessage } from "../../index";
import { GoogleAIV1GenerateContentSchema } from "./schema";

import { OpenAIV1ChatCompletionSchema } from "../openai/schema";

import { flattenOpenAIMessageContent } from "../openai/stringifier";

export const transformOpenAIToGoogleAI: APIRequestTransformer<
  typeof GoogleAIV1GenerateContentSchema
> = async (req) => {
  const { body } = req;
  const result = OpenAIV1ChatCompletionSchema.safeParse({
    ...body,
    model: "gpt-3.5-turbo",
  });
  if (!result.success) {
    req.log.warn(
      { issues: result.error.issues, body },
      "Invalid OpenAI-to-Google AI request"
    );
    throw result.error;
  }

  const { messages, ...rest } = result.data;
  const foundNames = new Set<string>();
  const contents = messages
    .map((m) => {
      const role = m.role === "assistant" ? "model" : "user";
      // Detects character names so we can set stop sequences for them as Gemini
      // is prone to continuing as the next character.
      // If names are not available, we'll still try to prefix the message
      // with generic names so we can set stops for them but they don't work
      // as well as real names.
      const text = flattenOpenAIMessageContent(m.content);
      const propName = m.name?.trim();
      const textName =
        m.role === "system" ? "" : text.match(/^(.{0,50}?): /)?.[1]?.trim();
      const name =
        propName || textName || (role === "model" ? "Character" : "User");

      foundNames.add(name);

      // Prefixing messages with their character name seems to help avoid
      // Gemini trying to continue as the next character, or at the very least
      // ensures it will hit the stop sequence.  Otherwise it will start a new
      // paragraph and switch perspectives.
      // The response will be very likely to include this prefix so frontends
      // will need to strip it out.
      const textPrefix = textName ? "" : `${name}: `;
      return {
        parts: [{ text: textPrefix + text }],
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      };
    })
    .reduce<GoogleAIChatMessage[]>((acc, msg) => {
      const last = acc[acc.length - 1];
      if (last?.role === msg.role) {
        last.parts[0].text += "\n\n" + msg.parts[0].text;
      } else {
        acc.push(msg);
      }
      return acc;
    }, []);

  let stops = rest.stop
    ? Array.isArray(rest.stop)
      ? rest.stop
      : [rest.stop]
    : [];
  stops.push(...Array.from(foundNames).map((name) => `\n${name}:`));
  stops = [...new Set(stops)].slice(0, 5);

  return {
    model: "gemini-pro",
    stream: rest.stream,
    contents,
    tools: [],
    generationConfig: {
      maxOutputTokens: rest.max_tokens,
      stopSequences: stops,
      topP: rest.top_p,
      topK: 40, // openai schema doesn't have this, google ai defaults to 40
      temperature: rest.temperature,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };
};
