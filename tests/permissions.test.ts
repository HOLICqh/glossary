import { canEdit, canExport } from "@/lib/permissions";

describe("permissions", () => {
  it("allows editors to edit and export", () => {
    expect(canEdit("editor")).toBe(true);
    expect(canExport("editor")).toBe(true);
  });

  it("prevents public users from editing and exporting", () => {
    expect(canEdit("public")).toBe(false);
    expect(canExport("public")).toBe(false);
  });
});
