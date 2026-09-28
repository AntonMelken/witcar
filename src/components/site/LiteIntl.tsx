import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import { pickMessages } from "@/i18n/pick";
import { LiteIntlProvider } from "@/i18n/lite";

/** Server wrapper: ships only the given namespaces to the lite client translator. */
export async function LiteIntl({ namespaces, children }: { namespaces: readonly string[]; children: ReactNode }) {
  const messages = await getMessages();
  return <LiteIntlProvider messages={pickMessages(messages, namespaces)}>{children}</LiteIntlProvider>;
}
