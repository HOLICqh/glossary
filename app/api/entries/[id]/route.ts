import { getUserRole } from "@/lib/auth";
import { getRepository } from "@/lib/repository";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if ((await getUserRole()) !== "editor") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await getRepository().delete(id);
  return Response.json({ ok: true });
}
