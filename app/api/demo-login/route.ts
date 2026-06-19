import { cookies } from "next/headers";

import {
  getEditorCookieName,
  getExpectedEditorSession,
  hasPasswordAuth,
  isValidEditorPassword
} from "@/lib/auth";

export async function POST(request: Request) {
  const cookieStore = await cookies();

  if (hasPasswordAuth()) {
    const formData = await request.formData();
    const password = String(formData.get("password") || "");

    if (!isValidEditorPassword(password)) {
      return new Response("Invalid password", { status: 401 });
    }

    cookieStore.set(getEditorCookieName(), getExpectedEditorSession(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/"
    });
    cookieStore.delete({ name: "demo-editor", path: "/" });
  } else {
    cookieStore.set("demo-editor", "true", { httpOnly: true, sameSite: "lax", path: "/" });
    cookieStore.delete({ name: getEditorCookieName(), path: "/" });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/"
    }
  });
}
