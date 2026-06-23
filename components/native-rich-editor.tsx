"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef
} from "react";

import {
  normalizeInsertedText,
  sanitizePastedHtml,
  sanitizePastedText
} from "@/lib/editor-html";

export type NativeRichEditorHandle = {
  focus: () => void;
  getHtml: () => string;
  getText: () => string;
  captureSelectionText: () => string;
  insertLink: (url: string, entryId: string) => void;
  replaceSelectionText: (replacement: string) => boolean;
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

  useEffect(() => {
    function updateModifierState(active: boolean) {
      if (editorRef.current) {
        editorRef.current.dataset.modifierNav = active ? "true" : "false";
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      updateModifierState(event.metaKey || event.ctrlKey);
    }

    function handleKeyUp(event: KeyboardEvent) {
      updateModifierState(event.metaKey || event.ctrlKey);
    }

    function handleWindowBlur() {
      updateModifierState(false);
    }

    updateModifierState(false);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  function rangeBelongsToEditor(range: Range): boolean {
    const editor = editorRef.current;
    if (!editor) {
      return false;
    }

    const ancestor = range.commonAncestorContainer;
    return editor.contains(ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentNode : ancestor);
  }

  function getEditorSelectionRange(): Range | null {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      return null;
    }

    const range = selection.getRangeAt(0);
    return rangeBelongsToEditor(range) ? range : null;
  }

  function insertHtmlAtSelection(html: string) {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    onDirty?.();
  }

  function insertTextAtSelection(text: string) {
    const selection = window.getSelection();
    const range = getEditorSelectionRange();
    if (!selection || !range) {
      return;
    }

    editorRef.current?.focus();
    selection.removeAllRanges();
    selection.addRange(range);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    onDirty?.();
  }

  function getTextBeforeRange(range: Range): string {
    const editor = editorRef.current;
    if (!editor) {
      return "";
    }

    const prefixRange = range.cloneRange();
    prefixRange.selectNodeContents(editor);
    prefixRange.setEnd(range.startContainer, range.startOffset);
    return prefixRange.toString();
  }

  useImperativeHandle(ref, () => ({
    focus: () => editorRef.current?.focus(),
    getHtml: () => editorRef.current?.innerHTML ?? "",
    getText: () => editorRef.current?.innerText.trim() ?? "",
    captureSelectionText: () => {
      const range = getEditorSelectionRange();
      const selection = window.getSelection();
      if (!range || !selection) {
        return "";
      }

      const text = selection.toString().trim();
      if (text) {
        selectionRangeRef.current = range.cloneRange();
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
    },
    replaceSelectionText: (replacement: string) => {
      const selection = window.getSelection();
      const range = selectionRangeRef.current ?? getEditorSelectionRange();
      if (!selection || !range) {
        return false;
      }

      selection.removeAllRanges();
      selection.addRange(range);
      range.deleteContents();
      const textNode = document.createTextNode(replacement);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      selectionRangeRef.current = null;
      onDirty?.();
      return true;
    }
  }));

  return (
    <div
      ref={editorRef}
      className={className}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      autoCorrect="on"
      data-placeholder={placeholder ?? ""}
      onBeforeInput={(event) => {
        const nativeEvent = event.nativeEvent as InputEvent;
        if (nativeEvent.inputType !== "insertText" || !nativeEvent.data) {
          return;
        }

        if (nativeEvent.data !== "\"" && nativeEvent.data !== "'") {
          return;
        }

        const range = getEditorSelectionRange();
        if (!range) {
          return;
        }

        event.preventDefault();
        const replacement = normalizeInsertedText(nativeEvent.data, getTextBeforeRange(range));
        insertTextAtSelection(replacement);
      }}
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
      onPaste={(event) => {
        event.preventDefault();
        const html = event.clipboardData.getData("text/html");
        const text = event.clipboardData.getData("text/plain");
        const sanitized = html
          ? sanitizePastedHtml(html, singleLine)
          : sanitizePastedText(text, singleLine);
        if (sanitized) {
          insertHtmlAtSelection(sanitized);
        }
      }}
      onClick={(event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        const anchor = target.closest("a[href]");
        if (!(anchor instanceof HTMLAnchorElement)) {
          return;
        }

        if (event.metaKey || event.ctrlKey) {
          event.preventDefault();
          window.location.assign(anchor.href);
          return;
        }

        event.preventDefault();
      }}
      onKeyDown={(event) => {
        if (singleLine && event.key === "Enter") {
          event.preventDefault();
        }

        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
          if (event.key === "\"" || event.key === "'") {
            const range = getEditorSelectionRange();
            if (range) {
              event.preventDefault();
              const replacement = normalizeInsertedText(event.key, getTextBeforeRange(range));
              insertTextAtSelection(replacement);
              return;
            }
          }
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
