"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useEffect } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
}

function ToolBtn({
  active, title, onClick, children,
}: {
  active?: boolean; title: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded transition-colors ${
        active ? "bg-[#CDA78F] text-white" : "text-[#8E7A6B] hover:bg-[#EDE2D8]"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  value, onChange, placeholder = "Escribe aquí…", minHeight = 100,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    editorProps: {
      attributes: {
        style: `min-height:${minHeight}px; padding:8px 12px; font-size:12px; color:#5C4A3E; line-height:1.6;`,
      },
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed || editor.isFocused) return;
    const currentHtml = editor.getHTML();
    const targetHtml = value || "<p></p>";
    if (currentHtml !== targetHtml) {
      editor.commands.setContent(targetHtml);
    }
  }, [value, editor]);

  if (!mounted) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full bg-white border border-[#D8BFAE] px-3 py-2 text-xs text-[#5C4A3E] outline-none focus:border-[#CDA78F] resize-none"
      />
    );
  }

  return (
    <div className="tiptap-editor border border-[#D8BFAE] focus-within:border-[#CDA78F] bg-white transition-colors">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-[#EDE2D8] bg-[#FAFAFA]">
        <ToolBtn title="Negrita" active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold size={11} strokeWidth={2.5} />
        </ToolBtn>
        <ToolBtn title="Cursiva" active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic size={11} strokeWidth={2} />
        </ToolBtn>
        <ToolBtn title="Subrayado" active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={11} strokeWidth={2} />
        </ToolBtn>
        <div className="w-px bg-[#EDE2D8] mx-0.5 self-stretch" />
        <ToolBtn title="Lista" active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List size={11} strokeWidth={2} />
        </ToolBtn>
        <ToolBtn title="Lista numerada" active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={11} strokeWidth={2} />
        </ToolBtn>
        <div className="w-px bg-[#EDE2D8] mx-0.5 self-stretch" />
        <ToolBtn title="Izquierda" active={editor?.isActive({ textAlign: "left" })} onClick={() => editor?.chain().focus().setTextAlign("left").run()}>
          <AlignLeft size={11} strokeWidth={2} />
        </ToolBtn>
        <ToolBtn title="Centrar" active={editor?.isActive({ textAlign: "center" })} onClick={() => editor?.chain().focus().setTextAlign("center").run()}>
          <AlignCenter size={11} strokeWidth={2} />
        </ToolBtn>
        <ToolBtn title="Derecha" active={editor?.isActive({ textAlign: "right" })} onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
          <AlignRight size={11} strokeWidth={2} />
        </ToolBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
