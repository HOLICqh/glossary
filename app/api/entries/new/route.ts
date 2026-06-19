import { getUserRole } from "@/lib/auth";
import { getRepository } from "@/lib/repository";

export async function POST() {
  if ((await getUserRole()) !== "editor") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
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

  return Response.json({ ok: true, id: entry.id });
}
