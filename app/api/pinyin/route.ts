import { getUserRole } from "@/lib/auth";
import { convertChineseSelectionToPinyin } from "@/lib/pinyin-convert";

export async function POST(request: Request) {
  if ((await getUserRole()) !== "editor") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { text?: string };
  const text = body.text?.trim() ?? "";

  if (!text) {
    return Response.json({ ok: false, error: "No text provided." }, { status: 400 });
  }

  return Response.json({
    ok: true,
    text: convertChineseSelectionToPinyin(text)
  });
}
