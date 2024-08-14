import express from "express";
import { APIFormat } from "../../../../shared/key-management";
import { assertNever } from "../../../../shared/utils";
import {
  anthropicV2ToOpenAI,
  mergeEventsForAnthropicChat,
  mergeEventsForAnthropicText,
  mergeEventsForOpenAIChat,
  mergeEventsForOpenAIText,
  mergeEventsForMistralChat,
  mergeEventsForMistralText,
  AnthropicV2StreamEvent,
  OpenAIChatCompletionStreamEvent,
  mistralAIToOpenAI,
  MistralAIStreamEvent,
  MistralChatCompletionEvent,
} from "./index";

/**
 * Collects SSE events containing incremental chat completion responses and
 * compiles them into a single finalized response for downstream middleware.
 */
export class EventAggregator {
  private readonly model: string;
  private readonly requestFormat: APIFormat;
  private readonly responseFormat: APIFormat;
  private readonly events: OpenAIChatCompletionStreamEvent[];

  constructor({ body, inboundApi, outboundApi }: express.Request) {
    this.events = [];
    this.requestFormat = inboundApi;
    this.responseFormat = outboundApi;
    this.model = body.model;
  }

  addEvent(
    event:
      | OpenAIChatCompletionStreamEvent
      | AnthropicV2StreamEvent
      | MistralAIStreamEvent
  ) {
    if (eventIsOpenAIEvent(event)) {
      this.events.push(event);
    } else {
      // horrible special case. previously all transformers' target format was
      // openai, so the event aggregator could conveniently assume all incoming
      // events were in openai format.
      // now we have added some transformers that convert between non-openai
      // formats, so aggregator needs to know how to collapse for more than
      // just openai.
      // because writing aggregation logic for every possible output format is
      // annoying, we will just transform any non-openai output events to openai
      // format (even if the client did not request openai at all) so that we
      // still only need to write aggregators for openai SSEs.
      let openAIEvent: OpenAIChatCompletionStreamEvent | undefined;
      switch (this.requestFormat) {
        case "anthropic-text":
          if (!eventIsAnthropicV2Event(event)) {
            throw new Error(`Bad event for Anthropic V2 SSE aggregation`);
          }
          openAIEvent = anthropicV2ToOpenAI({
            data: `event: completion\ndata: ${JSON.stringify(event)}\n\n`,
            lastPosition: -1,
            index: 0,
            fallbackId: event.log_id || "fallback-" + Date.now(),
            fallbackModel: event.model || this.model || "fallback-claude-3",
          })?.event;
          break;
        case "mistral-ai":
          if (!eventIsMistralChatEvent(event)) {
            throw new Error(`Bad event for Mistral SSE aggregation`);
          }
          openAIEvent = mistralAIToOpenAI({
            data: `data: ${JSON.stringify(event)}\n\n`,
            lastPosition: -1,
            index: 0,
            fallbackId: "fallback-" + Date.now(),
            fallbackModel: this.model || "fallback-mistral",
          })?.event;
          break;
      }
      if (openAIEvent) {
        this.events.push(openAIEvent);
      }
    }
  }

  getFinalResponse() {
    switch (this.responseFormat) {
      case "openai":
      case "google-ai": // TODO: this is probably wrong now that we support native Google Makersuite prompts
        return mergeEventsForOpenAIChat(this.events);
      case "openai-text":
        return mergeEventsForOpenAIText(this.events);
      case "anthropic-text":
        return mergeEventsForAnthropicText(this.events);
      case "anthropic-chat":
        return mergeEventsForAnthropicChat(this.events);
      case "mistral-ai":
        return mergeEventsForMistralChat(this.events);
      case "mistral-text":
        return mergeEventsForMistralText(this.events);
      case "openai-image":
        throw new Error(
          `SSE aggregation not supported for ${this.responseFormat}`
        );
      default:
        assertNever(this.responseFormat);
    }
  }

  hasEvents() {
    return this.events.length > 0;
  }
}

function eventIsOpenAIEvent(
  event: any
): event is OpenAIChatCompletionStreamEvent {
  return event?.object === "chat.completion.chunk";
}

function eventIsAnthropicV2Event(event: any): event is AnthropicV2StreamEvent {
  return event?.completion;
}

function eventIsMistralChatEvent(
  event: any
): event is MistralChatCompletionEvent {
  return event?.choices;
}
