import Link from "next/link";
import type { ReactNode } from "react";

export function AppShell({
  children,
  editor,
  headerControls
}: {
  children: ReactNode;
  editor: boolean;
  headerControls?: ReactNode;
}) {
  return (
    <div className="page-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          Glossary
        </Link>
        <div className="topbar-controls">
          {headerControls}
          <nav className="topnav">
            {editor ? (
              <>
                <span className="muted">Editor mode</span>
                <form action="/api/logout" method="post">
                  <button type="submit">Sign out</button>
                </form>
              </>
            ) : (
              <Link href="/login">Editor sign in</Link>
            )}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
