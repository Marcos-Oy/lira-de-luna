"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Bold, Italic, UnderlineIcon, Strikethrough, Code, Code2,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Minus,
  Link2, Link2Off, Image as ImageIcon,
  Heading1, Heading2, Heading3,
  Undo2, Redo2, FileCode,
} from "lucide-react";
import { uploadCampaignImage } from "@/app/actions/admin/campaigns";

// ── Toolbar button ─────────────────────────────────────────────

function Btn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-[#CDA78F] text-white"
          : "text-[#5C4A3E] hover:bg-[#D8BFAE]/50 disabled:opacity-30 disabled:cursor-not-allowed"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-[#D8BFAE] mx-0.5 self-center" />;
}

// ── Link modal ────────────────────────────────────────────────

function LinkModal({ current, onConfirm, onClose }: {
  current: string;
  onConfirm: (url: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(current);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white border border-[#D8BFAE] p-5 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-[10px] tracking-[0.15em] uppercase text-[#8E7A6B] mb-3">Insertar enlace</p>
        <input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="w-full bg-[#EDE2D8] border border-[#D8BFAE] text-[#5C4A3E] text-xs px-3 py-2.5 outline-none focus:border-[#CDA78F] mb-3"
          onKeyDown={(e) => { if (e.key === "Enter") onConfirm(url); if (e.key === "Escape") onClose(); }}
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border border-[#D8BFAE] text-[10px] tracking-[0.12em] uppercase text-[#8E7A6B] py-2 hover:border-[#CDA78F] transition-colors">
            Cancelar
          </button>
          <button onClick={() => onConfirm(url)} className="flex-1 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.12em] uppercase py-2 transition-colors">
            Insertar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Color picker ──────────────────────────────────────────────

const COLORS = [
  "#5C4A3E", "#8E7A6B", "#CDA78F", "#000000", "#ffffff",
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6",
];

function ColorPicker({ current, onSelect }: { current: string; onSelect: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        title="Color de texto"
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded hover:bg-[#D8BFAE]/50 transition-colors flex items-center gap-1"
      >
        <span className="text-xs font-bold text-[#5C4A3E]" style={{ textDecoration: `underline 2px solid ${current}` }}>A</span>
        <span className="text-[8px] text-[#8E7A6B]">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-[#D8BFAE] shadow-lg z-20 grid grid-cols-6 gap-1 w-32">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => { onSelect(c); setOpen(false); }}
              className="w-4 h-4 border border-[#D8BFAE] hover:scale-110 transition-transform"
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            className="w-4 h-4 cursor-pointer border-0 p-0"
            title="Color personalizado"
            onChange={(e) => { onSelect(e.target.value); setOpen(false); }}
          />
        </div>
      )}
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (html: string) => void;
  onImageUpload?: (fd: FormData) => Promise<{ success?: boolean; imageUrl?: string; error?: string }>;
  placeholder?: string;
}

export default function RichEditor({ value, onChange, onImageUpload, placeholder = "Escribe el contenido de tu campaña…" }: Props) {
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml,  setSourceHtml]  = useState("");
  const [linkModal,   setLinkModal]   = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { style: "color:#CDA78F;text-decoration:underline" } }),
      Image.configure({ inline: false, allowBase64: true, HTMLAttributes: { style: "max-width:100%;height:auto;display:block;margin:8px 0;" } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[220px] px-5 py-4 text-sm text-[#5C4A3E] leading-relaxed focus:outline-none",
      },
    },
    immediatelyRender: false,
  });

  // Sync external value only on mount
  useEffect(() => {
    if (editor && !editor.isFocused && value && editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Source toggle ────────────────────────────────────────────

  function enterSource() {
    setSourceHtml(editor?.getHTML() ?? "");
    setSourceMode(true);
  }

  function exitSource() {
    if (editor) {
      editor.commands.setContent(sourceHtml);
      onChange(sourceHtml);
    }
    setSourceMode(false);
  }

  // ── Image ────────────────────────────────────────────────────

  async function handleImageFile(file: File) {
    if (!editor) return;
    if (file.size > 5 * 1024 * 1024) { alert("Máximo 5 MB"); return; }

    // Optimistic: insert base64 preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      editor.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);

    // Upload to server
    setUploading(true);
    const fd = new FormData();
    fd.append("image", file);
    try {
      const fn = onImageUpload ?? uploadCampaignImage;
      const res = await fn(fd);
      if (res.imageUrl) {
        // Replace base64 with real URL
        const html = editor.getHTML().replace(/src="data:[^"]*"/, `src="${res.imageUrl}"`);
        editor.commands.setContent(html);
        onChange(editor.getHTML());
      }
    } finally {
      setUploading(false);
    }
  }

  const handleImageInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleImageFile(file);
    if (imgRef.current) imgRef.current.value = "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Drag-and-drop image into editor
  function handleDrop(e: React.DragEvent) {
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) {
      e.preventDefault();
      void handleImageFile(file);
    }
  }

  // ── Link ─────────────────────────────────────────────────────

  function handleLinkConfirm(url: string) {
    setLinkModal(false);
    if (!editor) return;
    if (!url) { editor.chain().focus().unsetLink().run(); return; }
    const href = url.startsWith("http") ? url : `https://${url}`;
    editor.chain().focus().setLink({ href }).run();
  }

  if (!editor) return null;

  const currentColor = (editor.getAttributes("textStyle").color as string) ?? "#5C4A3E";
  const currentLink  = editor.getAttributes("link").href as string ?? "";

  return (
    <div className="border border-[#D8BFAE] bg-white overflow-hidden">

      {/* Toolbar */}
      {!sourceMode && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-[#F7F4F1] border-b border-[#D8BFAE]">

          {/* Headings */}
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Título 1">
            <Heading1 size={14} strokeWidth={1.5} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Título 2">
            <Heading2 size={14} strokeWidth={1.5} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Título 3">
            <Heading3 size={14} strokeWidth={1.5} />
          </Btn>

          <Divider />

          {/* Inline */}
          <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrita">
            <Bold size={13} strokeWidth={2} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Cursiva">
            <Italic size={13} strokeWidth={1.5} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Subrayado">
            <UnderlineIcon size={13} strokeWidth={1.5} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Tachado">
            <Strikethrough size={13} strokeWidth={1.5} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Código inline">
            <Code size={13} strokeWidth={1.5} />
          </Btn>

          <Divider />

          {/* Color */}
          <ColorPicker current={currentColor} onSelect={(c) => editor.chain().focus().setColor(c).run()} />

          <Divider />

          {/* Alignment */}
          <Btn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Alinear izquierda">
            <AlignLeft size={13} strokeWidth={1.5} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centrar">
            <AlignCenter size={13} strokeWidth={1.5} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Alinear derecha">
            <AlignRight size={13} strokeWidth={1.5} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Justificar">
            <AlignJustify size={13} strokeWidth={1.5} />
          </Btn>

          <Divider />

          {/* Lists */}
          <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista con viñetas">
            <List size={13} strokeWidth={1.5} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista numerada">
            <ListOrdered size={13} strokeWidth={1.5} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Cita">
            <Quote size={13} strokeWidth={1.5} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Línea horizontal">
            <Minus size={13} strokeWidth={1.5} />
          </Btn>

          <Divider />

          {/* Link */}
          <Btn onClick={() => setLinkModal(true)} active={editor.isActive("link")} title="Insertar enlace">
            <Link2 size={13} strokeWidth={1.5} />
          </Btn>
          {editor.isActive("link") && (
            <Btn onClick={() => editor.chain().focus().unsetLink().run()} title="Quitar enlace">
              <Link2Off size={13} strokeWidth={1.5} />
            </Btn>
          )}

          {/* Image */}
          <Btn onClick={() => imgRef.current?.click()} disabled={uploading} title={uploading ? "Subiendo imagen…" : "Insertar imagen"}>
            <ImageIcon size={13} strokeWidth={1.5} />
          </Btn>

          <Divider />

          {/* Undo/Redo */}
          <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Deshacer">
            <Undo2 size={13} strokeWidth={1.5} />
          </Btn>
          <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rehacer">
            <Redo2 size={13} strokeWidth={1.5} />
          </Btn>

          <Divider />

          {/* Source */}
          <Btn onClick={enterSource} title="Editar código HTML">
            <FileCode size={13} strokeWidth={1.5} />
          </Btn>
        </div>
      )}

      {/* Source mode */}
      {sourceMode && (
        <div>
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#3D2E28] border-b border-[#D8BFAE]">
            <div className="flex items-center gap-1.5 text-[10px] text-white/60">
              <Code2 size={12} strokeWidth={1.5} />
              Código HTML
            </div>
            <button
              type="button"
              onClick={exitSource}
              className="text-[10px] tracking-[0.12em] uppercase bg-[#CDA78F] hover:bg-[#8E7A6B] text-white px-3 py-1 transition-colors"
            >
              Volver al editor
            </button>
          </div>
          <textarea
            value={sourceHtml}
            onChange={(e) => setSourceHtml(e.target.value)}
            spellCheck={false}
            className="w-full min-h-[280px] px-4 py-3 text-xs font-mono text-emerald-400 bg-[#1a1a2e] outline-none resize-y leading-relaxed"
          />
        </div>
      )}

      {/* Editor content */}
      {!sourceMode && (
        <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
          <EditorContent editor={editor} />
          {uploading && (
            <p className="text-[10px] text-[#8E7A6B] px-5 pb-2 flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 border border-[#CDA78F] border-t-transparent rounded-full animate-spin" />
              Subiendo imagen…
            </p>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input ref={imgRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleImageInput} />

      {/* Link modal */}
      {linkModal && (
        <LinkModal current={currentLink} onConfirm={handleLinkConfirm} onClose={() => setLinkModal(false)} />
      )}

      {/* TipTap styles */}
      <style>{`
        .ProseMirror { outline: none; }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #D8BFAE;
          pointer-events: none;
          position: absolute;
        }
        .ProseMirror blockquote {
          border-left: 3px solid #CDA78F;
          padding-left: 12px;
          color: #8E7A6B;
          font-style: italic;
        }
        .ProseMirror code {
          background: #EDE2D8;
          padding: 1px 5px;
          border-radius: 3px;
          font-size: 0.85em;
          font-family: monospace;
        }
        .ProseMirror hr {
          border: none;
          border-top: 1px solid #D8BFAE;
          margin: 16px 0;
        }
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 20px;
        }
        .ProseMirror ul { list-style-type: disc; }
        .ProseMirror ol { list-style-type: decimal; }
        .ProseMirror h1 { font-size: 1.5em; font-weight: bold; margin: 12px 0 6px; }
        .ProseMirror h2 { font-size: 1.25em; font-weight: bold; margin: 10px 0 5px; }
        .ProseMirror h3 { font-size: 1.1em; font-weight: bold; margin: 8px 0 4px; }
        .ProseMirror a { color: #CDA78F; text-decoration: underline; }
        .ProseMirror img { max-width: 100%; height: auto; cursor: pointer; }
        .ProseMirror img.ProseMirror-selectednode { outline: 2px solid #CDA78F; }
      `}</style>
    </div>
  );
}
