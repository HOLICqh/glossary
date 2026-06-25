import { getUserRole } from "@/lib/auth";
import { getRepository } from "@/lib/repository";
import { normalizeTagValue } from "@/lib/tag-helpers";
import { normalizeEntryBodyTags } from "@/lib/tag-manager";

export async function POST(request: Request) {
  if ((await getUserRole()) !== "editor") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    ids: string[];
    action: "add" | "remove";
    tag: string;
  };

  const ids = Array.from(new Set(body.ids.filter(Boolean)));
  const tag = normalizeTagValue(body.tag);

  if (!ids.length || !tag || !["add", "remove"].includes(body.action)) {
    return Response.json({ ok: false, error: "Invalid tag request." }, { status: 400 });
  }

  const repo = getRepository();
  const entries = await repo.getByIds(ids);
  const updatedCount = await repo.bulkUpdateTags(
    entries.map((entry) => {
      const normalized = normalizeEntryBodyTags(entry.body_rich_text, {
        addTag: body.action === "add" ? tag : undefined,
        removeTag: body.action === "remove" ? tag : undefined
      });

      return {
        id: entry.id,
        body_rich_text: normalized.html,
        tags: normalized.tags,
        updated_by: "editor"
      };
    })
  );

  return Response.json({ ok: true, updatedCount, tag });
}
