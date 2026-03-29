import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { 
  Bold, Italic, List, ListOrdered, Quote, 
  Heading1, Heading2, Undo, Redo, Eraser
} from 'lucide-react';
import { useEffect } from 'react';
import { useAI } from '../context/AIContext';
import './RichEditor.css';

export default function RichEditor({ content, onChange, placeholder }) {
  const { setSelection } = useAI();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        setSelection('');
      } else {
        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        setSelection(selectedText);
      }
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
  });

  useEffect(() => {
    const handleApply = (e) => {
      if (editor && e.detail) {
        editor.chain().focus().insertContent(e.detail).run();
      }
    };
    window.addEventListener('ai-apply-rewrite', handleApply);
    return () => window.removeEventListener('ai-apply-rewrite', handleApply);
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="rich-editor">
      <div className="rich-editor__toolbar">
        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
            title="Negrita"
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
            title="Cursiva"
          >
            <Italic size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
            title="Título 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
            title="Título 2"
          >
            <Heading2 size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
            title="Lista"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'is-active' : ''}
            title="Lista numerada"
          >
            <ListOrdered size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'is-active' : ''}
            title="Cita"
          >
            <Quote size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Deshacer">
            <Undo size={16} />
          </button>
          <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rehacer">
            <Redo size={16} />
          </button>
          <button onClick={() => editor.chain().focus().unsetAllMarks().run()} title="Limpiar formato">
            <Eraser size={16} />
          </button>
        </div>
      </div>

      <div className="rich-editor__content-wrapper">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
