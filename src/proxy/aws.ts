/* Shared code between AWS Claude and AWS Mistral endpoints. */

import { Request, Response, Router } from "express";
import { config } from "../config";
import { addV1 } from "./add-v1";
import { awsClaude } from "./aws-claude";
import { awsMistral } from "./aws-mistral";
import { AwsBedrockKey, keyPool } from "../shared/key-management";

const awsRouter = Router();
awsRouter.use("/claude", addV1, awsClaude);
awsRouter.use("/mistral", addV1, awsMistral);
awsRouter.get("/:vendor?/models", handleModelsRequest);

const MODELS_CACHE_TTL = 10000;
let modelsCache: any = null;
let modelsCacheTime = 0;
function handleModelsRequest(req: Request, res: Response) {
  if (!config.awsCredentials) return { object: "list", data: [] };
  if (new Date().getTime() - modelsCacheTime < MODELS_CACHE_TTL) {
    return res.json(modelsCache);
  }

  const availableModelIds = new Set<string>();
  for (const key of keyPool.list()) {
    if (key.isDisabled || key.service !== "aws") continue;
    (key as AwsBedrockKey).modelIds.forEach((id) => availableModelIds.add(id));
  }

  // https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html
  const models = [
    "anthropic.claude-v2",
    "anthropic.claude-v2:1",
    "anthropic.claude-3-haiku-20240307-v1:0",
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "anthropic.claude-3-5-sonnet-20240620-v1:0",
    "anthropic.claude-3-opus-20240229-v1:0",
    "mistral.mistral-7b-instruct-v0:2",
    "mistral.mixtral-8x7b-instruct-v0:1",
    "mistral.mistral-large-2402-v1:0",
    "mistral.mistral-large-2407-v1:0",
    "mistral.mistral-small-2402-v1:0",
  ]
    .filter((id) => availableModelIds.has(id))
    .map((id) => {
    const vendor = id.match(/^(.*)\./)?.[1];
    return {
      id,
      object: "model",
      created: new Date().getTime(),
      owned_by: vendor,
      permission: [],
      root: vendor,
      parent: null,
    };
  });

  const requestedVendor = req.params.vendor;
  const vendor = requestedVendor === "claude" ? "anthropic" : requestedVendor;
  modelsCache = {
    object: "list",
    data: models.filter((m) => m.root === vendor),
  };
  modelsCacheTime = new Date().getTime();

  return res.json(modelsCache);
}

export const aws = awsRouter;
