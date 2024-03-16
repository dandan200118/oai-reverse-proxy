import type { Request, Response } from "express";
import { z } from "zod";
import { APIFormat } from "../key-management";
import { AnthropicV1MessagesSchema } from "./kits/anthropic-chat/schema";
import { AnthropicV1TextSchema } from "./kits/anthropic-text/schema";
import { transformOpenAIToAnthropicText } from "./kits/anthropic-text/request-transformers";
import {
  transformAnthropicTextToAnthropicChat,
  transformOpenAIToAnthropicChat,
} from "./kits/anthropic-chat/request-transformers";
import { GoogleAIV1GenerateContentSchema } from "./kits/google-ai/schema";
import { transformOpenAIToGoogleAI } from "./kits/google-ai/request-transformers";
import { MistralAIV1ChatCompletionsSchema } from "./kits/mistral-ai/schema";

import { OpenAIV1ChatCompletionSchema } from "./kits/openai/schema";
import { OpenAIV1ImagesGenerationSchema } from "./kits/openai-image/schema";
import { transformOpenAIToOpenAIImage } from "./kits/openai-image/request-transformers";
import { OpenAIV1TextCompletionSchema } from "./kits/openai-text/schema";
import { transformOpenAIToOpenAIText } from "./kits/openai-text/request-transformers";

export type APIRequestTransformer<Z extends z.ZodType<any, any>> = (
  req: Request
) => Promise<z.infer<Z>>;

export type APIResponseTransformer<Z extends z.ZodType<any, any>> = (
  res: Response
) => Promise<z.infer<Z>>;

/** Represents a transformation from one API format to another. */
type APITransformation = `${APIFormat}->${APIFormat}`;

type APIRequestTransformerMap = {
  [key in APITransformation]?: APIRequestTransformer<any>;
};

type APIResponseTransformerMap = {
  [key in APITransformation]?: APIResponseTransformer<any>;
};

export const API_REQUEST_TRANSFORMERS: APIRequestTransformerMap = {
  "anthropic-text->anthropic-chat": transformAnthropicTextToAnthropicChat,
  "openai->anthropic-chat": transformOpenAIToAnthropicChat,
  "openai->anthropic-text": transformOpenAIToAnthropicText,
  "openai->openai-text": transformOpenAIToOpenAIText,
  "openai->openai-image": transformOpenAIToOpenAIImage,
  "openai->google-ai": transformOpenAIToGoogleAI,
};

export const API_REQUEST_VALIDATORS: Record<APIFormat, z.ZodSchema<any>> = {
  "anthropic-chat": AnthropicV1MessagesSchema,
  "anthropic-text": AnthropicV1TextSchema,
  openai: OpenAIV1ChatCompletionSchema,
  "openai-text": OpenAIV1TextCompletionSchema,
  "openai-image": OpenAIV1ImagesGenerationSchema,
  "google-ai": GoogleAIV1GenerateContentSchema,
  "mistral-ai": MistralAIV1ChatCompletionsSchema,
};
export { AnthropicChatMessage } from "./kits/anthropic-chat/schema";
export { AnthropicV1MessagesSchema } from "./kits/anthropic-chat/schema";
export { AnthropicV1TextSchema } from "./kits/anthropic-text/schema";

export interface APIFormatKit<T extends APIFormat, P> {
  name: T;
  /** Zod schema for validating requests in this format. */
  requestValidator: z.ZodSchema<any>;
  /** Flattens non-sting prompts (such as message arrays) into a single string. */
  promptStringifier: (prompt: P) => string;
  /** Counts the number of tokens in a prompt. */
  promptTokenCounter: (prompt: P, model: string) => Promise<number>;
  /** Counts the number of tokens in a completion. */
  completionTokenCounter: (
    completion: string,
    model: string
  ) => Promise<number>;
  /** Functions which transform requests from other formats into this format. */
  requestTransformers: APIRequestTransformerMap;
  /** Functions which transform responses from this format into other formats. */
  responseTransformers: APIResponseTransformerMap;
}
export { GoogleAIChatMessage } from "./kits/google-ai";
export { MistralAIChatMessage } from "./kits/mistral-ai";

export { OpenAIChatMessage } from "./kits/openai/schema";
export { flattenAnthropicMessages } from "./kits/anthropic-chat/stringifier";
