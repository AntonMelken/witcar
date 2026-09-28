import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import { pickMessages } from "@/i18n/pick";

/** Ships only the given message namespaces to the client subtree. */
export async function IntlProvider({ namespaces, children }: { namespaces: readonly string[]; children: ReactNode }) {
  const messages = await getMessages();
  return <NextIntlClientProvider messages={pickMessages(messages, namespaces)}>{children}</NextIntlClientProvider>;
}
