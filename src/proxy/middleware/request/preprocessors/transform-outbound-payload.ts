import { Request } from "express";
import {
  API_REQUEST_VALIDATORS,
  API_REQUEST_TRANSFORMERS,
} from "../../../../shared/api-schemas";
import { BadRequestError } from "../../../../shared/errors";
import { fixMistralPrompt } from "../../../../shared/api-schemas/mistral-ai";
import {
  isImageGenerationRequest,
  isTextGenerationRequest,
} from "../../common";
import { RequestPreprocessor } from "../index";

/** Transforms an incoming request body to one that matches the target API. */
export const transformOutboundPayload: RequestPreprocessor = async (req) => {
  const alreadyTransformed = req.retryCount > 0;
  const notTransformable =
    !isTextGenerationRequest(req) && !isImageGenerationRequest(req);

  if (alreadyTransformed || notTransformable) return;

  applyMistralPromptFixes(req);

  // Native prompts are those which were already provided by the client in the
  // target API format. We don't need to transform them.
  const isNativePrompt = req.inboundApi === req.outboundApi;
  if (isNativePrompt) {
    const result = API_REQUEST_VALIDATORS[req.inboundApi].safeParse(req.body);
    if (!result.success) {
      req.log.warn(
        { issues: result.error.issues, body: req.body },
        "Native prompt request validation failed."
      );
      throw result.error;
    }
    req.body = result.data;
    return;
  }

  // Prompt requires translation from one API format to another.
  const transformation = `${req.inboundApi}->${req.outboundApi}` as const;
  const transFn = API_REQUEST_TRANSFORMERS[transformation];

  if (transFn) {
    req.log.info({ transformation }, "Transforming request...");
    req.body = await transFn(req);
    return;
  }

  throw new BadRequestError(
    `${transformation} proxying is not supported. Make sure your client is configured to send requests in the correct format and to the correct endpoint.`
  );
};

// handles weird cases that don't fit into our abstractions
function applyMistralPromptFixes(req: Request): void {
  if (req.inboundApi === "mistral-ai") {
    // Mistral Chat is very similar to OpenAI but not identical and many clients
    // don't properly handle the differences. We will try to validate the
    // mistral prompt and try to fix it if it fails. It will be re-validated
    // after this function returns.
    const result = API_REQUEST_VALIDATORS["mistral-ai"].safeParse(req.body);
    if (!result.success) {
      const messages = req.body.messages;
      req.body.messages = fixMistralPrompt(messages);
      req.log.info(
        { old: messages.length, new: req.body.messages.length },
        "Applied Mistral chat prompt fixes."
      );
    }

    // If the prompt relies on `prefix: true` for the last message, we need to
    // convert it to a text completions request because Mistral support for
    // this feature is limited (and completely broken on AWS Mistral).
    const { messages } = req.body;
    const lastMessage = messages && messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "assistant") {
      // enable prefix if client forgot, otherwise the template will insert an
      // eos token which is very unlikely to be what the client wants.
      lastMessage.prefix = true;
      req.outboundApi = "mistral-text";
      req.log.info(
        "Native Mistral chat prompt relies on assistant message prefix. Converting to text completions request."
      );
    }
  }
}
