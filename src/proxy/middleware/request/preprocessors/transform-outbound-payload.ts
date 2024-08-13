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
  const isNativePrompt = req.inboundApi === req.outboundApi;
  const alreadyTransformed = req.retryCount > 0;
  const notTransformable =
    !isTextGenerationRequest(req) && !isImageGenerationRequest(req);

  if (alreadyTransformed || notTransformable) return;

  handleMistralSpecialCase(req);

  // Native prompts are those which were already provided by the client in the
  // target API format. We don't need to transform them.
  if (isNativePrompt) {
    const result = API_REQUEST_VALIDATORS[req.inboundApi].safeParse(req.body);
    if (!result.success) {
      req.log.warn(
        { issues: result.error.issues, body: req.body },
        "Request validation failed"
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
    req.log.info({ transformation }, "Transforming request");
    req.body = await transFn(req);
    return;
  }

  throw new BadRequestError(
    `${transformation} proxying is not supported. Make sure your client is configured to send requests in the correct format and to the correct endpoint.`
  );
};

// handles weird cases that don't fit into our abstractions
function handleMistralSpecialCase(req: Request): void {
  if (req.inboundApi === "mistral-ai") {
    // Mistral is very similar to OpenAI but not identical and many clients
    // don't properly handle the differences. We will try to validate the
    // mistral prompt and try to fix it if it fails. It will be re-validated
    // after this function returns.
    const result = API_REQUEST_VALIDATORS["mistral-ai"].safeParse(req.body);
    if (result.success) {
      // nothing to do
      return;
    }

    const messages = req.body.messages;
    req.body.messages = fixMistralPrompt(messages);
    req.log.info(
      { old: messages.length, new: req.body.messages.length },
      "Applied Mistral prompt fixes"
    );
  }
}
