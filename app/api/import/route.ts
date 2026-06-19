import { getUserRole } from "@/lib/auth";
import { parseHtmlImport, parseImportFile, parsePlainTextImport } from "@/lib/importer";
import { getRepository } from "@/lib/repository";
import { convertRtfToHtml } from "@/lib/textutil";

export async function POST(request: Request) {
  if ((await getUserRole()) !== "editor") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    fileName: string;
    content: string;
    replaceDuplicates?: boolean;
  };

  const result = body.fileName.toLowerCase().endsWith(".rtf")
    ? parseHtmlImport(await convertRtfToHtml(body.content), "editor")
    : parseImportFile(body.content, body.fileName, "editor");
  const repo = getRepository();
  let duplicateCount = 0;
  let acceptedCount = 0;

  const importedIds: string[] = [];
  for (const entry of result.accepted) {
    const duplicate = await repo.findByHeading(entry.heading_rich_text);
    if (duplicate) {
      if (body.replaceDuplicates) {
        const replaced = await repo.upsert({
          ...entry,
          id: duplicate.id,
          created_by: duplicate.created_by,
          updated_by: "editor"
        });
        importedIds.push(replaced.id);
        acceptedCount += 1;
        continue;
      }
      duplicateCount += 1;
      continue;
    }
    const created = await repo.upsert({
      ...entry,
      id: undefined,
      created_by: "editor",
      updated_by: "editor"
    });
    importedIds.push(created.id);
    acceptedCount += 1;
  }

  return Response.json({
    ok: true,
    acceptedCount,
    duplicateCount,
    paragraphCount: result.paragraphCount,
    importedIds
  });
}
