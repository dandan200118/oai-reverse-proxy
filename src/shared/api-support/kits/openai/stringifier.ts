import { OpenAIChatMessage } from "./schema";

export function flattenOpenAIChatMessages(messages: OpenAIChatMessage[]) {
  return (
    messages
      .map((m) => {
        // Claude-style human/assistant turns
        let role: string = m.role;
        if (role === "assistant") {
          role = "Assistant";
        } else if (role === "system") {
          role = "System";
        } else if (role === "user") {
          role = "User";
        }
        return `\n\n${role}: ${flattenOpenAIMessageContent(m.content)}`;
      })
      .join("") + "\n\nAssistant:"
  );
}

export function flattenOpenAIMessageContent(
  content: OpenAIChatMessage["content"],
): string {
  return Array.isArray(content)
    ? content
      .map((contentItem) => {
        if ("text" in contentItem) return contentItem.text;
        if ("image_url" in contentItem) return "[ Uploaded Image Omitted ]";
      })
      .join("\n")
    : content;
}
