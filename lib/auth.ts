import { createHash, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { env, hasSupabaseConfig } from "@/lib/env";
import type { UserRole } from "@/lib/types";

const EDITOR_COOKIE = "editor-session";

function hashEditorPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function hasPasswordAuth(): boolean {
  return Boolean(env.editorPassword);
}

export function getExpectedEditorSession(): string {
  return hashEditorPassword(env.editorPassword);
}

export function isValidEditorPassword(password: string): boolean {
  if (!env.editorPassword) {
    return false;
  }

  const expected = Buffer.from(env.editorPassword);
  const supplied = Buffer.from(password);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export async function getUserRole(): Promise<UserRole> {
  const cookieStore = await cookies();
  const editorSession = cookieStore.get(EDITOR_COOKIE)?.value;
  const demoEditor = cookieStore.get("demo-editor")?.value === "true";

  if (env.editorPassword && editorSession === getExpectedEditorSession()) {
    return "editor";
  }

  if (demoEditor) {
    return "editor";
  }

  if (hasSupabaseConfig()) {
    return "public";
  }

  return "public";
}

export async function requireEditor(): Promise<void> {
  const role = await getUserRole();
  if (role !== "editor") {
    throw new Error("Editor privileges are required.");
  }
}

export function getEditorCookieName(): string {
  return EDITOR_COOKIE;
}
