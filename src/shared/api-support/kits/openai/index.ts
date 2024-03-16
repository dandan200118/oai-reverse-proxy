import { APIFormatKit } from "../../index";
import { OpenAIChatMessage, OpenAIV1ChatCompletionSchema } from "./schema";
import { flattenOpenAIChatMessages } from "./stringifier";
import { getOpenAITokenCount } from "./tokenizer";

const kit: APIFormatKit<"openai", OpenAIChatMessage[]> = {
  name: "openai",
  requestValidator: OpenAIV1ChatCompletionSchema,
  // We never transform from other formats into OpenAI format.
  requestTransformers: {},
  promptStringifier: flattenOpenAIChatMessages,
  promptTokenCounter: getOpenAITokenCount,
};
