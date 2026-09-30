"use client";

import { useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  /** Current HTML value (controlled — wire to react-hook-form / useState). */
  value: string;
  /** Called with the updated HTML whenever the content changes. */
  onChange: (html: string) => void;
  /** Minimum height of the editable area in px (grows with content). */
  minHeight?: number;
}

/** Treats empty-editor HTML variants as "" so value/editor never loop. */
const normalizeHtml = (html?: string | null): string => {
  const v = (html || "").trim();
  if (!v || v === "<p></p>" || v === "<p><br></p>" || v === "<br>") return "";
  return v;
};

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", active && "bg-accent text-accent-foreground")}
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      {children}
    </Button>
  );
}

const Separator = () => <div className="mx-1 h-5 w-px bg-border" />;

export default function RichTextEditor({
  value,
  onChange,
  minHeight = 160,
}: RichTextEditorProps) {
  const editor = useEditor({
    // Next.js SSR: create the editor only after mount (no hydration mismatch).
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: false }),
    ],
    content: value || "",
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class:
          "min-h-[var(--rte-min-h)] px-4 py-3 text-sm leading-relaxed outline-none",
      },
    },
  });

  // Keep the editor in sync when the form value is reset externally
  // (e.g. react-hook-form reset() when the edit page loads the product).
  useEffect(() => {
    if (!editor) return;
    if (normalizeHtml(value) !== normalizeHtml(editor.getHTML())) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  const handleLink = () => {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const previous: string = editor.getAttributes("link").href || "https://";
    const url = window.prompt("Enter URL", previous);
    if (!url || !/^(https?:\/\/|\/|mailto:)/i.test(url)) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div
      className="rounded-md border border-input bg-background"
      style={{ "--rte-min-h": `${minHeight}px` } as React.CSSProperties}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1.5">
        <ToolButton label="Bold" disabled={!editor} active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Italic" disabled={!editor} active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Underline" disabled={!editor} active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolButton>

        <Separator />

        <ToolButton label="Heading 1" disabled={!editor} active={editor?.isActive("heading", { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Heading 2" disabled={!editor} active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Heading 3" disabled={!editor} active={editor?.isActive("heading", { level: 3 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Normal text" disabled={!editor} active={editor?.isActive("paragraph")} onClick={() => editor?.chain().focus().setParagraph().run()}>
          <Pilcrow className="h-4 w-4" />
        </ToolButton>

        <Separator />

        <ToolButton label="Bullet list" disabled={!editor} active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Numbered list" disabled={!editor} active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolButton>

        <Separator />

        <ToolButton label="Align left" disabled={!editor} active={editor?.isActive({ textAlign: "left" })} onClick={() => editor?.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Align center" disabled={!editor} active={editor?.isActive({ textAlign: "center" })} onClick={() => editor?.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Align right" disabled={!editor} active={editor?.isActive({ textAlign: "right" })} onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="h-4 w-4" />
        </ToolButton>

        <Separator />

        <ToolButton label={editor?.isActive("link") ? "Remove link" : "Add link"} disabled={!editor} active={editor?.isActive("link")} onClick={handleLink}>
          {editor?.isActive("link") ? <Unlink className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
        </ToolButton>
      </div>

      {/* Editable area */}
      <div className="overflow-hidden [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_hr]:my-3 [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-1.5 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
