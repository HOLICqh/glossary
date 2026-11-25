import { afterEach, expect, it, vi } from "vitest";

import { POST as createEntry } from "@/app/api/entries/new/route";
import { POST as editEntry } from "@/app/api/entries/route";
import { DELETE as deleteEntry } from "@/app/api/entries/[id]/route";
import { POST as importEntries } from "@/app/api/import/route";
import { POST as exportSelection } from "@/app/api/export-current-list/route";
import { GET as exportGlossary } from "@/app/api/export/[format]/route";
import { POST as signIn } from "@/app/api/demo-login/route";
import { getUserRole } from "@/lib/auth";

const cookieStore = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));
vi.mock("@/lib/env", () => ({
  env: { demoMode: true, editorPassword: "" },
  hasSupabaseConfig: () => false
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it("rejects demo sign-in and demo sessions on production editor routes", async () => {
  vi.stubEnv("NODE_ENV", "production");
  cookieStore.get.mockImplementation((name: string) =>
    name === "demo-editor" ? { value: "true" } : undefined
  );
  const request = new Request("https://glossary.example/api");
  const responses = await Promise.all([
    signIn(request),
    createEntry(),
    editEntry(request),
    deleteEntry(request, { params: Promise.resolve({ id: "example" }) }),
    importEntries(request),
    exportSelection(request),
    exportGlossary(request, { params: Promise.resolve({ format: "rtf" }) })
  ]);
  expect(responses.map(({ status }) => status)).toEqual(Array(7).fill(403));
  expect(cookieStore.set).not.toHaveBeenCalled();
});

it("retains demo editor access in local development", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("VERCEL", undefined);
  cookieStore.get.mockImplementation((name: string) =>
    name === "demo-editor" ? { value: "true" } : undefined
  );
  expect(await getUserRole()).toBe("editor");
});
