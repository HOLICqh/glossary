import type { UserRole } from "@/lib/types";

export function canEdit(role: UserRole): boolean {
  return role === "editor";
}

export function canExport(role: UserRole): boolean {
  return role === "editor";
}
