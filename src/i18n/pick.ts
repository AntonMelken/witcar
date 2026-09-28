import type { AbstractIntlMessages } from "next-intl";

/** Pass only the namespaces a client subtree needs (keeps client JS small). */
export function pickMessages(messages: AbstractIntlMessages, namespaces: readonly string[]): AbstractIntlMessages {
  const out: AbstractIntlMessages = {};
  for (const ns of namespaces) if (messages[ns] !== undefined) out[ns] = messages[ns];
  return out;
}
