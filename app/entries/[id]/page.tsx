import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { EntryWorkspace } from "@/components/entry-workspace";
import { getUserRole } from "@/lib/auth";
import { omitEditorialNote } from "@/lib/body";
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
  const headingOptions = await repo.listHeadingOptions();
  if (!entry) {
    notFound();
  }

  const role = await getUserRole();
  return (
    <AppShell editor={role === "editor"}>
      <EntryWorkspace
        entry={role === "editor" ? entry : omitEditorialNote(entry)}
        canEdit={role === "editor"}
        initiallyEditing={role === "editor" ? query.edit !== "0" : false}
        backHref={query.back || "/"}
        headingOptions={headingOptions}
      />
    </AppShell>
  );
}
