import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { getUserRole } from "@/lib/auth";
import { qualityChecks } from "@/lib/qc";
import { getRepository } from "@/lib/repository";

export default async function QualityPage() {
  const role = await getUserRole();
  const entries = await getRepository().list();
  const issues = qualityChecks(entries);

  if (role !== "editor") {
    return (
      <AppShell editor={false}>
        <section className="panel">
          <h1>Editor access required</h1>
          <p>Quality control is restricted to editors.</p>
          <Link href="/login">Go to sign in</Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell editor>
      <section className="panel">
        <h1>Quality control</h1>
        <ul className="preview-list">
          {issues.map((issue, index) => (
            <li key={`${issue.entryId}-${issue.code}-${index}`}>
              <strong>{issue.severity.toUpperCase()}</strong> {issue.message}{" "}
              <Link href={`/entries/${issue.entryId}`}>View entry</Link>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
