import { getUserRole } from "@/lib/auth";
import { parseHeadingInput, stripHtmlTags } from "@/lib/heading";
import { getRepository } from "@/lib/repository";

export async function POST(request: Request) {
  if ((await getUserRole()) !== "editor") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    id?: string;
    heading_html: string;
    heading_text: string;
    body_rich_text: string;
  };

  const repo = getRepository();
  const duplicate = await repo.findByHeading(body.heading_text, body.id);
  if (duplicate) {
    return Response.json(
      {
        ok: false,
        error: "Another entry already uses that heading.",
        duplicateId: duplicate.id
      },
      { status: 409 }
    );
  }

  const headingParts = parseHeadingInput(body.heading_text || stripHtmlTags(body.heading_html));
  const existing = body.id ? await repo.getById(body.id) : null;
  const saved = await repo.upsert({
    id: body.id,
    ...headingParts,
    heading_rich_text: body.heading_html,
    sort_key: "",
    english_gloss_or_translation: existing?.english_gloss_or_translation ?? "",
    entry_type: existing?.entry_type ?? "text",
    body_rich_text: body.body_rich_text,
    status: existing?.status ?? "draft",
    tags: existing?.tags ?? [],
    related_entries: existing?.related_entries ?? [],
    created_by: existing?.created_by ?? "editor",
    updated_by: "editor"
  });

  return Response.json({ ok: true, entry: saved });
}
