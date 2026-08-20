import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EntryPageShell } from "@/components/layout/entry-page-shell";
import { NewPage } from "@/components/page/new-page";
import JsonLd from "@/components/seo/json-ld";
import { env } from "@/lib/env";
import { createWebPageJsonLd } from "@/lib/seo/json-ld";
import { createMetadata } from "@/lib/seo/metadata";
import { getSession } from "@/lib/server/page-queries";

const NEW_PAGE_DESCRIPTION = "Create your page.";

export const metadata: Metadata = createMetadata({
  title: "Create your page",
  description: NEW_PAGE_DESCRIPTION,
  canonicalPath: "/new",
  noIndex: true,
});

const newPageJsonLd = createWebPageJsonLd({
  title: "New page",
  description: NEW_PAGE_DESCRIPTION,
  path: "/new",
});

export default async function NewPageRoute() {
  const session = await getSession();
  if (!session.ok) {
    if (session.response.status === 401) {
      redirect("/log-in?redirect=/new");
    }
    throw new Error(
      `Session request failed with status ${session.response.status}.`,
    );
  }

  if (!session.data) redirect("/log-in?redirect=/new");
  if (session.data.user.primaryPageId) redirect("/");

  return (
    <>
      <JsonLd nodes={[newPageJsonLd]} />
      <EntryPageShell>
        <NewPage appDomain={env.NEXT_PUBLIC_APP_DOMAIN} />
      </EntryPageShell>
    </>
  );
}
