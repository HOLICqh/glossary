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
  const isComposingRef = useRef(false);
  const pendingDirtyRef = useRef(false);
  const lastAppliedHtmlRef = useRef("");

  useEffect(() => {
    if (
      editorRef.current &&
      document.activeElement !== editorRef.current &&
      lastAppliedHtmlRef.current !== initialHtml
    ) {
      editorRef.current.innerHTML = initialHtml;
      lastAppliedHtmlRef.current = initialHtml;
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
      spellCheck={false}
      data-placeholder={placeholder ?? ""}
      onInput={() => {
        if (isComposingRef.current) {
          pendingDirtyRef.current = true;
          return;
        }
        onDirty?.();
      }}
      onBlur={() => {
        if (isComposingRef.current) {
          pendingDirtyRef.current = true;
          return;
        }
        onDirty?.();
      }}
      onCompositionStart={() => {
        isComposingRef.current = true;
      }}
      onCompositionEnd={() => {
        isComposingRef.current = false;
        if (pendingDirtyRef.current) {
          pendingDirtyRef.current = false;
          onDirty?.();
        }
      }}
      onKeyDown={(event) => {
        if (singleLine && event.key === "Enter") {
          event.preventDefault();
        }

        if (!event.altKey && (event.metaKey || event.ctrlKey)) {
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
