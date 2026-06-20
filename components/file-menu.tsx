"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

export function FileMenu({ editor }: { editor: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const params = useSearchParams();
  const [replaceDuplicates, setReplaceDuplicates] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const statusMessage = params.get("import_status") ?? "";

  async function importFile(file: File) {
    setIsImporting(true);
    try {
      const content = await file.text();
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          content,
          replaceDuplicates
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Import failed.");
      }

      const payload = (await response.json()) as {
        acceptedCount: number;
        duplicateCount: number;
        paragraphCount: number;
        importedIds: string[];
      };

      detailsRef.current?.removeAttribute("open");
      const next = new URLSearchParams();
      next.set(
        "import_status",
        `${payload.acceptedCount} out of ${payload.paragraphCount} entries accepted.${payload.duplicateCount ? ` ${payload.duplicateCount} duplicates skipped.` : ""}`
      );
      if (payload.importedIds.length > 0) {
        next.set("imported", payload.importedIds.join(","));
      } else {
        next.set("imported", "none");
      }
      const destination = next.toString() ? `/?${next.toString()}` : "/";
      window.location.assign(destination);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="file-menu-wrap">
      <details ref={detailsRef} className="file-menu">
        <summary aria-label="Import file" title="Import file">⤒</summary>
        <div className="file-menu-panel">
          {editor ? (
            <>
              <button type="button" disabled={isImporting} onClick={() => inputRef.current?.click()}>
                {isImporting ? "Importing..." : "Import file"}
              </button>
              <label className="file-menu-option">
                <input
                  type="checkbox"
                  checked={replaceDuplicates}
                  onChange={(event) => setReplaceDuplicates(event.target.checked)}
                />
                Replace duplicates
              </label>
            </>
          ) : null}
        </div>
      </details>
      <input
        ref={inputRef}
        hidden
        type="file"
        accept=".txt,.rtf"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void importFile(file);
          }
          event.currentTarget.value = "";
        }}
      />
      <div className="file-menu-messages">
        {statusMessage ? <p className="muted file-menu-message">{statusMessage}</p> : null}
      </div>
    </div>
  );
}
