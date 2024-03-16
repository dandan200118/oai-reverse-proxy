import { AnthropicChatMessage } from "./schema";

export function flattenAnthropicMessages(
  messages: AnthropicChatMessage[]
): string {
  return messages
    .map((msg) => {
      const name = msg.role === "user" ? "\n\nHuman: " : "\n\nAssistant: ";
      const parts = Array.isArray(msg.content)
        ? msg.content
        : [{ type: "text", text: msg.content }];
      return `${name}: ${parts
        .map((part) =>
          part.type === "text"
            ? part.text
            : `[Omitted multimodal content of type ${part.type}]`
        )
        .join("\n")}`;
    })
    .join("\n\n");
}
