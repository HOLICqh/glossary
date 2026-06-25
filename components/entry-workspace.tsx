"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { containsPlaceholderTag, renderViewBodyHtml } from "@/lib/body";
import { formatHeading, normalizeHeadingKey, stripHtmlTags } from "@/lib/heading";
import { normalizeCompactSearchText, normalizeSearchText, tokens } from "@/lib/pinyin";
import type { GlossaryEntry, HeadingOption } from "@/lib/types";
import {
  NativeRichEditor,
  type NativeRichEditorHandle
} from "@/components/native-rich-editor";

export function EntryWorkspace({
  entry,
  canEdit,
  headingOptions,
  initiallyEditing = false,
  backHref = "/"
}: {
  entry: GlossaryEntry;
  canEdit: boolean;
  headingOptions: HeadingOption[];
  initiallyEditing?: boolean;
  backHref?: string;
}) {
  const headingEditorRef = useRef<NativeRichEditorHandle>(null);
  const bodyEditorRef = useRef<NativeRichEditorHandle>(null);
  const saveTimerRef = useRef<number | null>(null);
  const savedHeadingHtmlRef = useRef(formatHeading(entry));
  const savedBodyHtmlRef = useRef(entry.body_rich_text);
  const [isEditing, setIsEditing] = useState(initiallyEditing);
  const [savedHeadingHtml, setSavedHeadingHtml] = useState(savedHeadingHtmlRef.current);
  const [savedBodyHtml, setSavedBodyHtml] = useState(savedBodyHtmlRef.current);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [linkQuery, setLinkQuery] = useState("");
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [availableHeadingOptions, setAvailableHeadingOptions] = useState(headingOptions);

  useEffect(() => {
    setAvailableHeadingOptions(headingOptions);
  }, [headingOptions]);

  const renderedBody = useMemo(() => renderViewBodyHtml(savedBodyHtml), [savedBodyHtml]);
  const linkMatches = useMemo(() => {
    const query = normalizeSearchText(linkQuery);
    const normalizedQueryHeading = normalizeHeadingKey(linkQuery);
    const ranked = availableHeadingOptions
      .filter((option) => option.id !== entry.id)
      .map((option) => ({
        ...option,
        score: scoreHeading(option.heading, query)
      }))
      .filter((option) => option.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 8);

    if (
      linkQuery.trim() &&
      !availableHeadingOptions.some(
        (option) =>
          option.id !== entry.id && normalizeHeadingKey(stripHtmlTags(option.heading)) === normalizedQueryHeading
      )
    ) {
      ranked.push({
        id: `create:${linkQuery}`,
        heading: linkQuery,
        create: true,
        score: -1
      });
    }

    return ranked;
  }, [availableHeadingOptions, entry.id, linkQuery]);

  const persist = useCallback(async () => {
    const headingHtml = headingEditorRef.current?.getHtml() ?? savedHeadingHtmlRef.current;
    const headingText = headingEditorRef.current?.getText() ?? savedHeadingHtmlRef.current;
    const bodyHtml = bodyEditorRef.current?.getHtml() ?? savedBodyHtmlRef.current;

    const response = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: entry.id,
        heading_html: headingHtml,
        heading_text: headingText,
        body_rich_text: bodyHtml
      })
    });

    if (response.status === 409) {
      const payload = (await response.json()) as { error: string };
      setError(payload.error);
      setSaveState("error");
      return false;
    }

    if (!response.ok) {
      setError("Autosave failed.");
      setSaveState("error");
      return false;
    }

    setError("");
    savedHeadingHtmlRef.current = headingHtml;
    savedBodyHtmlRef.current = bodyHtml;
    setSavedHeadingHtml(headingHtml);
    setSavedBodyHtml(bodyHtml);
    setSaveState("saved");
    return true;
  }, [entry.id]);

  const schedulePersist = useCallback(() => {
    if (!isEditing || !canEdit) {
      return;
    }
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    setSaveState("saving");
    saveTimerRef.current = window.setTimeout(() => {
      void persist();
    }, 800);
  }, [canEdit, isEditing, persist]);

  function openLinkPicker() {
    const text = bodyEditorRef.current?.captureSelectionText() ?? "";
    if (!text) {
      return;
    }
    setLinkQuery(text);
    setShowLinkPicker(true);
  }

  async function convertSelectionToPinyin() {
    const headingText = headingEditorRef.current?.captureSelectionText() ?? "";
    if (headingText) {
      const response = await fetch("/api/pinyin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: headingText })
      });
      if (!response.ok) {
        setError("Could not convert selection to pinyin.");
        setSaveState("error");
        return;
      }
      const payload = (await response.json()) as { text: string };
      const replaced = headingEditorRef.current?.replaceSelectionText(payload.text);
      if (replaced) {
        setError("");
        schedulePersist();
      }
      return;
    }

    const bodyText = bodyEditorRef.current?.captureSelectionText() ?? "";
    if (bodyText) {
      const response = await fetch("/api/pinyin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: bodyText })
      });
      if (!response.ok) {
        setError("Could not convert selection to pinyin.");
        setSaveState("error");
        return;
      }
      const payload = (await response.json()) as { text: string };
      const replaced = bodyEditorRef.current?.replaceSelectionText(payload.text);
      if (replaced) {
        setError("");
        schedulePersist();
      }
      return;
    }

    setError("Select Chinese text in the heading or body first.");
    setSaveState("error");
  }

  async function applyLink(target: HeadingOption) {
    let targetId = target.id;

    if (target.create) {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heading_html: target.heading,
          heading_text: target.heading,
          body_rich_text: "<p>#placeholder</p>"
        })
      });

      if (!response.ok) {
        setError("Could not create linked entry.");
        setSaveState("error");
        return;
      }

      const payload = (await response.json()) as { entry: { id: string } };
      targetId = payload.entry.id;
      setAvailableHeadingOptions((current) => [
        ...current,
        {
          id: targetId,
          heading: target.heading
        }
      ]);
    }

    bodyEditorRef.current?.insertLink(`/entries/${targetId}`, targetId);
    setShowLinkPicker(false);
    setLinkQuery("");
    schedulePersist();
  }

  return (
    <article className="panel entry-workspace">
      <div className="workspace-bar">
        <a href={backHref}>Back to results</a>
        <div className="workspace-controls">
          {canEdit ? (
            <div className="mode-toggle" role="group" aria-label="Entry mode">
              <button
                type="button"
                className={!isEditing ? "toggle-button active" : "toggle-button"}
                onClick={async () => {
                  if (isEditing) {
                    await persist();
                    setSavedHeadingHtml(
                      headingEditorRef.current?.getHtml() ?? savedHeadingHtmlRef.current
                    );
                    setSavedBodyHtml(bodyEditorRef.current?.getHtml() ?? savedBodyHtmlRef.current);
                  }
                  setIsEditing(false);
                }}
              >
                View
              </button>
              <button
                type="button"
                className={isEditing ? "toggle-button active" : "toggle-button"}
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            </div>
          ) : null}
          <span className="muted">
            {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : error || ""}
          </span>
        </div>
      </div>

      {isEditing && canEdit ? (
        <>
          <NativeRichEditor
            ref={headingEditorRef}
            className="heading-editor editor-surface"
            initialHtml={savedHeadingHtmlRef.current}
            placeholder="Heading"
            singleLine
            onDirty={schedulePersist}
          />
          <div className="editor-tools">
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                void convertSelectionToPinyin();
              }}
            >
              Pinyin selection
            </button>
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                openLinkPicker();
              }}
            >
              Hotlink selection
            </button>
            <span className="muted">Hashtags remain searchable but disappear in view mode.</span>
          </div>
          <NativeRichEditor
            ref={bodyEditorRef}
            className="body-editor editor-surface"
            initialHtml={savedBodyHtmlRef.current}
            placeholder="Body"
            onDirty={schedulePersist}
          />
          {showLinkPicker ? (
            <div className="link-picker">
              <div className="link-picker-header">
                <strong>Link selection</strong>
                <button type="button" onClick={() => setShowLinkPicker(false)}>
                  Close
                </button>
              </div>
              <ul>
                {linkMatches.map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        void applyLink(option);
                      }}
                    >
                      {option.create
                        ? `Create new "${stripHtmlTags(option.heading)}"`
                        : stripHtmlTags(option.heading)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="entry-footer">
            <button
              type="button"
              className="delete-button"
              aria-label="Delete entry"
              onClick={async () => {
                const confirmed = window.confirm("Delete this entry?");
                if (!confirmed) {
                  return;
                }
                const response = await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
                if (response.ok) {
                  window.location.href = "/";
                } else {
                  setError("Could not delete entry.");
                }
              }}
            >
              🗑
            </button>
          </div>
        </>
      ) : (
        <>
          <h1 dangerouslySetInnerHTML={{ __html: savedHeadingHtml }} />
          <div className="entry-body" dangerouslySetInnerHTML={{ __html: renderedBody }} />
        </>
      )}
    </article>
  );
}

export function scoreHeading(heading: string, query: string): number {
  if (!query) {
    return 0;
  }

  const normalizedHeading = normalizeSearchText(stripHtmlTags(heading));
  const compactHeading = normalizeCompactSearchText(stripHtmlTags(heading));
  const compactQuery = normalizeCompactSearchText(query);

  if (normalizedHeading === query) {
    return 50;
  }
  if (normalizedHeading.startsWith(query)) {
    return 30;
  }
  if (normalizedHeading.includes(query)) {
    return 20;
  }

  if (compactQuery && compactHeading === compactQuery) {
    return 40;
  }
  if (compactQuery && compactHeading.includes(compactQuery)) {
    return 24;
  }

  const queryTokens = tokens(query);
  if (!queryTokens.length) {
    return 0;
  }

  const matchCount = queryTokens.filter((token) => normalizedHeading.includes(token)).length;
  if (!matchCount) {
    return 0;
  }

  const coverageScore = Math.round((matchCount / queryTokens.length) * 18);
  return 6 + matchCount * 4 + coverageScore;
}
