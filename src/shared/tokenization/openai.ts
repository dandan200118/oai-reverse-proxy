import { GoogleAIChatMessage } from "../api-support";
import { encoder, getTextTokenCount } from "../api-support/kits/openai/tokenizer";

// Tested against:
// https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb

// Model	Resolution	Price
// DALL·E 3	1024×1024	$0.040 / image
// 1024×1792, 1792×1024	$0.080 / image
// DALL·E 3 HD	1024×1024	$0.080 / image
// 1024×1792, 1792×1024	$0.120 / image
// DALL·E 2	1024×1024	$0.020 / image
// 512×512	$0.018 / image
// 256×256	$0.016 / image

export const DALLE_TOKENS_PER_DOLLAR = 100000;

/**
 * OpenAI image generation with DALL-E doesn't use tokens but everything else
 * in the application does. There is a fixed cost for each image generation
 * request depending on the model and selected quality/resolution parameters,
 * which we convert to tokens at a rate of 100000 tokens per dollar.
 */
export function getOpenAIImageCost(params: {
  model: "dall-e-2" | "dall-e-3";
  quality: "standard" | "hd";
  resolution: "512x512" | "256x256" | "1024x1024" | "1024x1792" | "1792x1024";
  n: number | null;
}) {
  const { model, quality, resolution, n } = params;
  const usd = (() => {
    switch (model) {
      case "dall-e-2":
        switch (resolution) {
          case "512x512":
            return 0.018;
          case "256x256":
            return 0.016;
          case "1024x1024":
            return 0.02;
          default:
            throw new Error("Invalid resolution");
        }
      case "dall-e-3":
        switch (resolution) {
          case "1024x1024":
            return quality === "standard" ? 0.04 : 0.08;
          case "1024x1792":
          case "1792x1024":
            return quality === "standard" ? 0.08 : 0.12;
          default:
            throw new Error("Invalid resolution");
        }
      default:
        throw new Error("Invalid image generation model");
    }
  })();

  const tokens = (n ?? 1) * (usd * DALLE_TOKENS_PER_DOLLAR);

  return {
    tokenizer: `openai-image cost`,
    token_count: Math.ceil(tokens),
  };
}

export function estimateGoogleAITokenCount(
  prompt: string | GoogleAIChatMessage[]
) {
  if (typeof prompt === "string") {
    return getTextTokenCount(prompt);
  }

  const tokensPerMessage = 3;

  let numTokens = 0;
  for (const message of prompt) {
    numTokens += tokensPerMessage;
    numTokens += encoder.encode(message.parts[0].text).length;
  }

  numTokens += 3;

  return {
    tokenizer: "tiktoken (google-ai estimate)",
    token_count: numTokens,
  };
}
