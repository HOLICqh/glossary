"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { FileMenu } from "@/components/file-menu";
import { containsPlaceholderTag, renderViewBodyHtml } from "@/lib/body";
import { formatHeading } from "@/lib/heading";
import { normalizeTagValue, summarizeTags } from "@/lib/tag-helpers";
import type { GlossaryEntry } from "@/lib/types";

export function EntryList({
  entries,
  editor,
  backHref,
  importStatus = ""
}: {
  entries: GlossaryEntry[];
  editor: boolean;
  backHref: string;
  importStatus?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const exportMenuRef = useRef<HTMLDetailsElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showTagManager, setShowTagManager] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tagActionMessage, setTagActionMessage] = useState("");
  const [tagActionPending, setTagActionPending] = useState<"add" | "remove" | "">("");
  const [stripTagsOnExport, setStripTagsOnExport] = useState(true);
  const allSelected = useMemo(
    () => entries.length > 0 && entries.every((entry) => selectedIds.includes(entry.id)),
    [entries, selectedIds]
  );
  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedIds.includes(entry.id)),
    [entries, selectedIds]
  );
  const selectedTagCounts = useMemo(() => {
    return summarizeTags(selectedEntries.map((entry) => entry.body_rich_text));
  }, [selectedEntries]);
  const normalizedTagInput = normalizeTagValue(tagInput);

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const key = `glossary-scroll:${window.location.pathname}${window.location.search}`;
    const saved = window.sessionStorage.getItem(key);
    if (!saved) {
      return;
    }

    const scrollY = Number(saved);
    window.sessionStorage.removeItem(key);
    if (!Number.isFinite(scrollY)) {
      return;
    }

    window.scrollTo({ top: scrollY, behavior: "auto" });
  }, [entries.length]);

  useEffect(() => {
    const visibleIds = new Set(entries.map((entry) => entry.id));
    setSelectedIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [entries]);

  function rememberScrollPosition() {
    if (typeof window === "undefined") {
      return;
    }

    const key = `glossary-scroll:${window.location.pathname}${window.location.search}`;
    window.sessionStorage.setItem(key, String(window.scrollY));
  }

  function toggleOne(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : entries.map((entry) => entry.id));
  }

  async function applyTagAction(action: "add" | "remove") {
    if (!selectedIds.length || !normalizedTagInput) {
      return;
    }

    setTagActionPending(action);
    setTagActionMessage("");
    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedIds,
          action,
          tag: normalizedTagInput
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Tag update failed.");
      }

      setTagActionMessage(
        action === "add"
          ? `${normalizedTagInput} added to ${selectedIds.length} entr${selectedIds.length === 1 ? "y" : "ies"}.`
          : `${normalizedTagInput} removed from ${selectedIds.length} entr${selectedIds.length === 1 ? "y" : "ies"}.`
      );
      router.refresh();
    } catch (error) {
      setTagActionMessage(error instanceof Error ? error.message : "Tag update failed.");
    } finally {
      setTagActionPending("");
    }
  }

  async function exportSelected(format: "rtf" | "txt") {
    if (!selectedIds.length) {
      return;
    }

    try {
      const response = await fetch("/api/export-current-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedIds,
          format,
          stripTags: stripTagsOnExport
        })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Export failed.");
      }

      const blob = await response.blob();
      const fileName = format === "rtf" ? "glossary-current-selection.rtf" : "glossary-current-selection.txt";

      if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
        const picker = await (window as Window & {
          showSaveFilePicker?: (options: {
            suggestedName: string;
            types: Array<{ description: string; accept: Record<string, string[]> }>;
          }) => Promise<{
            createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
          }>;
        }).showSaveFilePicker?.({
          suggestedName: fileName,
          types: [
            {
              description: format === "rtf" ? "Rich Text Format" : "Plain Text",
              accept: {
                [format === "rtf" ? "application/rtf" : "text/plain"]: [`.${format}`]
              }
            }
          ]
        });

        if (picker) {
          const writable = await picker.createWritable();
          await writable.write(blob);
          await writable.close();
          exportMenuRef.current?.removeAttribute("open");
          return;
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      exportMenuRef.current?.removeAttribute("open");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Export failed.");
    }
  }

  async function deleteSelected() {
    if (!selectedIds.length) {
      return;
    }
    const confirmed = window.confirm(`Delete ${selectedIds.length} selected entr${selectedIds.length === 1 ? "y" : "ies"}?`);
    if (!confirmed) {
      return;
    }

    await Promise.all(
      selectedIds.map((id) =>
        fetch(`/api/entries/${id}`, {
          method: "DELETE"
        })
      )
    );

    window.location.reload();
  }

  function alphabetizeSelected() {
    if (!selectedIds.length) {
      return;
    }

    const next = new URLSearchParams(searchParams.toString());
    next.delete("imported");
    next.delete("import_status");
    next.set("selected", selectedIds.join(","));
    next.set("sort", "alpha");
    router.push(`/?${next.toString()}`);
  }

  return (
    <>
      {editor ? (
        <>
          <div className="list-toolbar">
            <label className="list-select-option">
              <input
                aria-label="Select all search results"
                title="Select all search results"
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
              />
              {selectedIds.length > 0 ? (
                <span className="selection-count">
                  {selectedIds.length} item{selectedIds.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </label>
            <div className="list-actions">
              <Link className="list-icon-link" href="/entries/new" aria-label="Add entry" title="Add entry">
                +
              </Link>
              <FileMenu editor={editor} />
              <button
                type="button"
                className="list-icon-button"
                aria-label="Manage tags"
                title="Manage tags"
                disabled={selectedIds.length === 0}
                onClick={() => setShowTagManager((current) => !current)}
              >
                #
              </button>
              <button
                type="button"
                className="list-icon-button"
                aria-label="Alphabetize current selection"
                title="Alphabetize current selection"
                disabled={selectedIds.length === 0}
                onClick={alphabetizeSelected}
              >
                A-Z
              </button>
              <details className="file-menu" ref={exportMenuRef}>
                <summary
                  aria-label="Export current selection"
                  title="Export current selection"
                  className={selectedIds.length === 0 ? "list-icon-button list-icon-button-disabled" : undefined}
                  onClick={(event) => {
                    if (selectedIds.length === 0) {
                      event.preventDefault();
                    }
                  }}
                >
                  ⤓
                </summary>
                <div className="file-menu-panel export-menu-panel">
                  <div className="file-menu-header">
                    <span>Export</span>
                    <button
                      type="button"
                      className="file-menu-close"
                      aria-label="Close export dialog"
                      title="Close"
                      onClick={() => exportMenuRef.current?.removeAttribute("open")}
                    >
                      ×
                    </button>
                  </div>
                  <button type="button" disabled={selectedIds.length === 0} onClick={() => void exportSelected("rtf")}>
                    Export RTF
                  </button>
                  <label className="file-menu-option">
                    <input
                      type="checkbox"
                      checked={stripTagsOnExport}
                      onChange={(event) => setStripTagsOnExport(event.target.checked)}
                    />
                    Remove tags
                  </label>
                </div>
              </details>
              <button
                type="button"
                className="list-icon-button"
                aria-label="Delete selected entries"
                title="Delete selected entries"
                disabled={selectedIds.length === 0}
                onClick={() => void deleteSelected()}
              >
                🗑
              </button>
            </div>
          </div>
          {importStatus ? <p className="list-status muted">{importStatus}</p> : null}
          {showTagManager ? (
            <div className="tag-manager panel">
              <div className="tag-manager-header">
                <strong>Manage tags</strong>
                <span className="muted">
                  {selectedIds.length} selected entr{selectedIds.length === 1 ? "y" : "ies"}
                </span>
              </div>
              <div className="tag-manager-tags">
                {selectedTagCounts.length ? (
                  selectedTagCounts.map(({ tag, count }) => (
                    <button
                      key={tag}
                      type="button"
                      className="tag-chip"
                      onClick={() => setTagInput(tag)}
                    >
                      {tag} ({count})
                    </button>
                  ))
                ) : (
                  <span className="muted">No tags in current selection.</span>
                )}
              </div>
              <div className="tag-manager-controls">
                <input
                  type="text"
                  value={tagInput}
                  placeholder="Add or remove tag"
                  onChange={(event) => setTagInput(event.target.value)}
                />
                <button
                  type="button"
                  disabled={!normalizedTagInput || tagActionPending !== ""}
                  onClick={() => void applyTagAction("add")}
                >
                  {tagActionPending === "add" ? "Adding..." : "Add to selected"}
                </button>
                <button
                  type="button"
                  disabled={!normalizedTagInput || tagActionPending !== ""}
                  onClick={() => void applyTagAction("remove")}
                >
                  {tagActionPending === "remove" ? "Removing..." : "Remove from selected"}
                </button>
              </div>
              {tagActionMessage ? <p className="muted tag-manager-message">{tagActionMessage}</p> : null}
            </div>
          ) : null}
        </>
      ) : null}

      <div className="entry-preview-list">
        {entries.map((entry) => (
          (() => {
            const placeholderEntry = containsPlaceholderTag(entry.body_rich_text);
            const previewClassName =
              editor && placeholderEntry
                ? "panel entry-preview-card placeholder-entry"
                : "panel entry-preview-card";
            return (
          <div
            key={entry.id}
            className={editor ? "entry-preview-row" : "entry-preview-row entry-preview-row-public"}
          >
            {editor ? (
              <label className="entry-select">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(entry.id)}
                  onChange={() => toggleOne(entry.id)}
                />
              </label>
            ) : null}
            {editor ? (
              <div className={previewClassName}>
                <h2>
                  <Link
                    href={`/entries/${entry.id}${backHref ? `?back=${encodeURIComponent(backHref)}` : ""}`}
                    scroll={false}
                    className="entry-preview-heading-link"
                    onClick={rememberScrollPosition}
                    dangerouslySetInnerHTML={{ __html: formatHeading(entry) }}
                  />
                </h2>
                <div
                  className="entry-preview-body"
                  dangerouslySetInnerHTML={{
                    __html: renderViewBodyHtml(entry.body_rich_text)
                  }}
                />
              </div>
            ) : (
              <div className="panel entry-preview-card entry-preview-card-public">
                <h2 dangerouslySetInnerHTML={{ __html: formatHeading(entry) }} />
                <div
                  className="entry-preview-body"
                  dangerouslySetInnerHTML={{
                    __html: renderViewBodyHtml(entry.body_rich_text)
                  }}
                />
              </div>
            )}
          </div>
            );
          })()
        ))}
      </div>
    </>
  );
}
