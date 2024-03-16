import { MistralAIChatMessage } from "./schema";

export function fixMistralPrompt(
  messages: MistralAIChatMessage[]
): MistralAIChatMessage[] {
  // Mistral uses OpenAI format but has some additional requirements:
  // - Only one system message per request, and it must be the first message if
  //   present.
  // - Final message must be a user message.
  // - Cannot have multiple messages from the same role in a row.
  // While frontends should be able to handle this, we can fix it here in the
  // meantime.

  return messages.reduce<MistralAIChatMessage[]>((acc, msg) => {
    if (acc.length === 0) {
      acc.push(msg);
      return acc;
    }

    const copy = { ...msg };
    // Reattribute subsequent system messages to the user
    if (msg.role === "system") {
      copy.role = "user";
    }

    // Consolidate multiple messages from the same role
    const last = acc[acc.length - 1];
    if (last.role === copy.role) {
      last.content += "\n\n" + copy.content;
    } else {
      acc.push(copy);
    }
    return acc;
  }, []);
}
