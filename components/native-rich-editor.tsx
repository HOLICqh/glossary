"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef
} from "react";

export type NativeRichEditorHandle = {
  focus: () => void;
  getHtml: () => string;
  getText: () => string;
  captureSelectionText: () => string;
  insertLink: (url: string, entryId: string) => void;
};

export const NativeRichEditor = forwardRef<
  NativeRichEditorHandle,
  {
    className: string;
    initialHtml: string;
    placeholder?: string;
    singleLine?: boolean;
    onDirty?: () => void;
  }
>(function NativeRichEditor(
  { className, initialHtml, placeholder, singleLine = false, onDirty },
  ref
) {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== initialHtml) {
      editorRef.current.innerHTML = initialHtml;
    }
  }, [initialHtml]);

  useImperativeHandle(ref, () => ({
    focus: () => editorRef.current?.focus(),
    getHtml: () => editorRef.current?.innerHTML ?? "",
    getText: () => editorRef.current?.innerText.trim() ?? "",
    captureSelectionText: () => {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) {
        return "";
      }
      const text = selection.toString().trim();
      if (text) {
        selectionRangeRef.current = selection.getRangeAt(0).cloneRange();
      }
      return text;
    },
    insertLink: (url: string, entryId: string) => {
      const selection = window.getSelection();
      if (!selectionRangeRef.current || !selection) {
        return;
      }

      selection.removeAllRanges();
      selection.addRange(selectionRangeRef.current);

      const range = selection.getRangeAt(0);
      const selectedText = selection.toString();
      const fragment = range.extractContents();
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.setAttribute("data-entry-id", entryId);
      anchor.className = "glossary-link";
      if (fragment.childNodes.length > 0) {
        anchor.appendChild(fragment);
      } else {
        anchor.textContent = selectedText;
      }

      range.insertNode(anchor);
      range.setStartAfter(anchor);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      onDirty?.();
    }
  }));

  return (
    <div
      ref={editorRef}
      className={className}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder ?? ""}
      onInput={onDirty}
      onBlur={onDirty}
      onKeyDown={(event) => {
        if (singleLine && event.key === "Enter") {
          event.preventDefault();
        }

        if (event.metaKey || event.ctrlKey) {
          const key = event.key.toLowerCase();
          if (key === "i") {
            event.preventDefault();
            document.execCommand("italic");
            onDirty?.();
          }
          if (key === "b") {
            event.preventDefault();
            document.execCommand("bold");
            onDirty?.();
          }
          if (key === "u") {
            event.preventDefault();
            document.execCommand("underline");
            onDirty?.();
          }
        }
      }}
    />
  );
});
