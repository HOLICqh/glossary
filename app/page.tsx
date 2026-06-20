import { AppShell } from "@/components/app-shell";
import { EntryList } from "@/components/entry-list";
import { SearchBar } from "@/components/search-bar";
import { getUserRole } from "@/lib/auth";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; imported?: string; import_status?: string; selected?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const role = await getUserRole();
  const repo = getRepository();
  const importedParam = params.imported;
  const importedIds = importedParam?.split(",").filter(Boolean) ?? [];
  const selectedIds = params.selected?.split(",").filter(Boolean) ?? [];
  const baseEntries = params.q ? await repo.search(params.q, 20) : await repo.list();
  const filteredEntries =
    importedParam === "none"
      ? []
      : importedIds.length
        ? baseEntries.filter((entry) => importedIds.includes(entry.id))
        : selectedIds.length
          ? baseEntries.filter((entry) => selectedIds.includes(entry.id))
          : baseEntries;
  const entries =
    params.sort === "alpha"
      ? filteredEntries.slice().sort((left, right) => left.sort_key.localeCompare(right.sort_key))
      : filteredEntries;
  const visibleEntries = role === "editor" ? entries : entries.slice(0, 20);
  const currentParams = new URLSearchParams();
  if (params.q) {
    currentParams.set("q", params.q);
  }
  if (params.imported) {
    currentParams.set("imported", params.imported);
  }
  if (params.import_status) {
    currentParams.set("import_status", params.import_status);
  }
  if (params.selected) {
    currentParams.set("selected", params.selected);
  }
  if (params.sort) {
    currentParams.set("sort", params.sort);
  }
  const backHref = currentParams.toString() ? `/?${currentParams.toString()}` : "/";

  return (
    <AppShell editor={role === "editor"} headerControls={<SearchBar />}>
      <EntryList
        entries={visibleEntries}
        editor={role === "editor"}
        backHref={backHref}
        importStatus={params.import_status ?? ""}
      />
    </AppShell>
  );
}
