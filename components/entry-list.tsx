"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { FileMenu } from "@/components/file-menu";
import { stripHashtagsFromHtml, stripLinksFromHtml } from "@/lib/body";
import { formatHeading } from "@/lib/heading";
import type { GlossaryEntry } from "@/lib/types";

export function EntryList({
  entries,
  editor,
  backHref
}: {
  entries: GlossaryEntry[];
  editor: boolean;
  backHref: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const allSelected = useMemo(
    () => entries.length > 0 && entries.every((entry) => selectedIds.includes(entry.id)),
    [entries, selectedIds]
  );

  function toggleOne(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : entries.map((entry) => entry.id));
  }

  async function exportSelected(format: "rtf" | "txt") {
    if (!selectedIds.length) {
      return;
    }

    const response = await fetch("/api/export-current-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: selectedIds,
        format
      })
    });

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
        return;
      }
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
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
              aria-label="Alphabetize current selection"
              title="Alphabetize current selection"
              disabled={selectedIds.length === 0}
              onClick={alphabetizeSelected}
            >
              A-Z
            </button>
            <button
              type="button"
              className="list-icon-button"
              aria-label="Export current selection"
              title="Export current selection"
              disabled={selectedIds.length === 0}
              onClick={() => void exportSelected("rtf")}
            >
              ⤓
            </button>
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
      ) : null}

      <div className="entry-preview-list">
        {entries.map((entry) => (
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
            <Link
              href={`/entries/${entry.id}${backHref ? `?back=${encodeURIComponent(backHref)}` : ""}`}
              className="panel entry-preview-card entry-preview-link"
            >
              <h2 dangerouslySetInnerHTML={{ __html: formatHeading(entry) }} />
              <div
                className="entry-preview-body line-clamp-6"
                dangerouslySetInnerHTML={{
                  __html: stripLinksFromHtml(stripHashtagsFromHtml(entry.body_rich_text))
                }}
              />
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
