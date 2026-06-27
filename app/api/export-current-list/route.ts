import { getUserRole } from "@/lib/auth";
import { exportEntriesToCurrentListRtf, exportEntriesToCurrentListText } from "@/lib/export";
import { getRepository } from "@/lib/repository";

export async function POST(request: Request) {
  if ((await getUserRole()) !== "editor") {
    return new Response("Forbidden", { status: 403 });
  }

  const body = (await request.json()) as {
    ids?: string[];
    format?: "rtf" | "txt";
    stripTags?: boolean;
  };
  const format = body.format ?? "rtf";

  const repo = getRepository();
  const allEntries = await repo.list();
  const entries = body.ids?.length ? allEntries.filter((entry) => body.ids?.includes(entry.id)) : allEntries;

  if (format === "txt") {
    return new Response(exportEntriesToCurrentListText(entries, { stripTags: body.stripTags }), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="glossary-current-list.txt"'
      }
    });
  }

  return new Response(exportEntriesToCurrentListRtf(entries, { stripTags: body.stripTags }), {
    headers: {
      "Content-Type": "application/rtf; charset=utf-8",
      "Content-Disposition": 'attachment; filename="glossary-current-list.rtf"'
    }
  });
}
