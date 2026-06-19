import { getUserRole } from "@/lib/auth";
import { exportEntriesToDocx, exportEntriesToRtf } from "@/lib/export";
import { canExport } from "@/lib/permissions";
import { getRepository } from "@/lib/repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ format: string }> }
) {
  const { format } = await params;
  const role = await getUserRole();
  if (!canExport(role)) {
    return new Response("Forbidden", { status: 403 });
  }
  const entries = await getRepository().list();

  if (format === "docx") {
    const buffer = await exportEntriesToDocx(entries);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="glossary-export.docx"'
      }
    });
  }

  if (format === "rtf") {
    const body = exportEntriesToRtf(entries);
    return new Response(body, {
      headers: {
        "Content-Type": "application/rtf; charset=utf-8",
        "Content-Disposition": 'attachment; filename="glossary-export.rtf"'
      }
    });
  }

  return new Response("Unsupported format", { status: 400 });
}
