import type { Editor } from "@tiptap/core";
import { generateJSON } from "@tiptap/html";
import type { EditorView } from "@tiptap/pm/view";

const HTML_BLOCK_TAG =
  /<\/?(?:h[1-6]|p|div|blockquote|ul|ol|li|hr|pre|code|em|strong|b|i|a)(?:\s[^>]*)?>/i;

export function looksLikeHtml(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return HTML_BLOCK_TAG.test(trimmed);
}

export function createHtmlPasteHandler(getEditor: () => Editor | undefined) {
  return (_view: EditorView, event: ClipboardEvent): boolean => {
    const editor = getEditor();
    if (!editor) return false;

    const plain = event.clipboardData?.getData("text/plain")?.trim() ?? "";
    if (!looksLikeHtml(plain)) return false;

    try {
      const json = generateJSON(plain, editor.extensionManager.extensions);
      event.preventDefault();
      editor.chain().focus().insertContent(json).run();
      return true;
    } catch {
      return false;
    }
  };
}