import { redirect } from "next/navigation";

import { getUserRole } from "@/lib/auth";
import { getRepository } from "@/lib/repository";

export default async function NewEntryPage() {
  const role = await getUserRole();
  if (role !== "editor") {
    redirect("/login");
  }

  const repo = getRepository();
  const entry = await repo.upsert({
    headword_pinyin: "New entry",
    headword_characters: "",
    heading_rich_text: "New entry",
    sort_key: "",
    english_gloss_or_translation: "",
    entry_type: "text",
    body_rich_text: "<p></p>",
    status: "draft",
    tags: [],
    related_entries: [],
    created_by: "editor",
    updated_by: "editor"
  });

  redirect(`/entries/${entry.id}?edit=1`);
}
