import { AppShell } from "@/components/app-shell";
import { getUserRole, hasPasswordAuth } from "@/lib/auth";

export default async function LoginPage() {
  const role = await getUserRole();
  const passwordAuth = hasPasswordAuth();

  return (
    <AppShell editor={role === "editor"}>
      <section className="panel">
        <h1>Editor sign in</h1>
        {passwordAuth ? (
          <>
            <p>Enter the editor password to enable editing, import, export, and deletion.</p>
            <form action="/api/demo-login" method="post" className="entry-form">
              <label>
                Password
                <input name="password" type="password" autoComplete="current-password" />
              </label>
              <button type="submit">Sign in</button>
            </form>
          </>
        ) : (
          <>
            <p>
              Local demo mode is active. Use the button below to enable editor access in this
              browser.
            </p>
            <form action="/api/demo-login" method="post">
              <button type="submit">Enable demo editor access</button>
            </form>
          </>
        )}
      </section>
    </AppShell>
  );
}
