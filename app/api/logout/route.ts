import { cookies } from "next/headers";

import { getEditorCookieName } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete({ name: "demo-editor", path: "/" });
  cookieStore.delete({ name: getEditorCookieName(), path: "/" });

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/"
    }
  });
}
