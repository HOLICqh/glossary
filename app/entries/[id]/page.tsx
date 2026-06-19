import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { EntryWorkspace } from "@/components/entry-workspace";
import { getUserRole } from "@/lib/auth";
import { formatHeading } from "@/lib/heading";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function EntryPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; back?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const repo = getRepository();
  const entry = await repo.getById(id);
  const allEntries = await repo.list();
  if (!entry) {
    notFound();
  }

  const role = await getUserRole();
  return (
    <AppShell editor={role === "editor"}>
      <EntryWorkspace
        entry={entry}
        canEdit={role === "editor"}
        initiallyEditing={query.edit === "1" && role === "editor"}
        backHref={query.back || "/"}
        headingOptions={allEntries.map((item) => ({
          id: item.id,
          heading: formatHeading(item)
        }))}
      />
    </AppShell>
  );
}
