import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { 
  Bold, Italic, List, ListOrdered, Quote, 
  Heading1, Heading2, Undo, Redo, Eraser, Minus, Plus
} from 'lucide-react';
import { useEffect, useRef, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAI } from '../context/AIContext';
import { Tooltip } from './Tooltip';
import { db } from '../db/database';
import './RichEditor.css';

function createDebouncedOracleScan(callback, delay = 3000) {
  let timeoutId = null;
  return {
    schedule: (getParagraph) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const text = getParagraph();
        callback(text);
      }, delay);
    },
    cancel: () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = null;
    },
  };
}

export default function RichEditor({ content, onChange, placeholder }) {
  const { t } = useTranslation('common')
  const { setSelection, setOracleText } = useAI();
  const editorRef = useRef(null);
  const oracleScanRef = useRef(null);
  const lastSelectionRef = useRef('');
  const [editorError, setEditorError] = useState(null);
  const [fontSize, setFontSize] = useState(15);

  // Load font size from Dexie on mount
  useEffect(() => {
    const loadFontSize = async () => {
      try {
        const pref = await db.editorPrefs.get('fontSize');
        if (pref && pref.value) {
          setFontSize(pref.value);
        }
      } catch (err) {
        console.error('[RichEditor] Error loading fontSize:', err);
      }
    };
    loadFontSize();
  }, []);

  // Save font size to Dexie when it changes
  const handleFontSizeChange = async (delta) => {
    const newSize = Math.max(12, Math.min(28, fontSize + delta));
    setFontSize(newSize);
    try {
      await db.editorPrefs.put({ key: 'fontSize', value: newSize });
    } catch (err) {
      console.error('[RichEditor] Error saving fontSize:', err);
    }
  };

  if (!oracleScanRef.current) {
    oracleScanRef.current = createDebouncedOracleScan((text) => {
      setOracleText(text);
    }, 3000);
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
      }),
      TextStyle,
    ],
    content: content,
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
    onError: (error) => {
      console.error('[RichEditor] Error:', error);
      setEditorError(error.message);
    },
    onUpdate: ({ editor }) => {
      editorRef.current = editor;
      onChange(editor.getHTML());
      oracleScanRef.current.schedule(() => {
        const ed = editorRef.current;
        if (!ed) return '';
        const { $from } = ed.state.selection;
        return ed.state.doc.textBetween($from.start(), $from.end(), ' ').trim();
      });
    },
    onSelectionUpdate: ({ editor }) => {
      editorRef.current = editor;
      const { from, to } = editor.state.selection;
      if (from === to) {
        setSelection('');
        lastSelectionRef.current = '';
        const $from = editor.state.selection.$from;
        oracleScanRef.current.schedule(() => {
          const ed = editorRef.current;
          if (!ed) return '';
          return ed.state.doc.textBetween($from.start(), $from.end(), ' ').trim();
        });
      } else {
        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        setSelection(selectedText);
        lastSelectionRef.current = selectedText;
        oracleScanRef.current.schedule(() => {
          const ed = editorRef.current;
          if (!ed) return '';
          const { selection } = ed.state;
          if (selection.from !== selection.to) {
            return ed.state.doc.textBetween(selection.from, selection.to, ' ').trim();
          }
          const { $from } = selection;
          return ed.state.doc.textBetween($from.start(), $from.end(), ' ').trim();
        });
      }
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
  });

  useEffect(() => {
    return () => {
      oracleScanRef.current?.cancel();
    };
  }, []);

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

  if (editorError) {
    return (
      <div className="rich-editor" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Error cargando el editor: {editorError}</p>
        <button 
          className="btn btn-primary" 
          onClick={() => window.location.reload()}
          style={{ marginTop: '16px' }}
        >
          Recargar página
        </button>
      </div>
    );
  }

  return (
    <div className="rich-editor">
      <div className="rich-editor__toolbar">
        <div className="toolbar-group">
          <Tooltip content={t('editor_toolbar.negrita')}>
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              className={editor.isActive('bold') ? 'is-active' : ''}
            >
              <Bold size={16} />
            </button>
          </Tooltip>
          <Tooltip content={t('editor_toolbar.cursiva')}>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              className={editor.isActive('italic') ? 'is-active' : ''}
            >
              <Italic size={16} />
            </button>
          </Tooltip>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <Tooltip content={t('editor_toolbar.titulo_1')}>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
            >
              <Heading1 size={16} />
            </button>
          </Tooltip>
          <Tooltip content={t('editor_toolbar.titulo_2')}>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
            >
              <Heading2 size={16} />
            </button>
          </Tooltip>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <Tooltip content={t('editor_toolbar.lista')}>
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive('bulletList') ? 'is-active' : ''}
            >
              <List size={16} />
            </button>
          </Tooltip>
          <Tooltip content={t('editor_toolbar.lista_numerada')}>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive('orderedList') ? 'is-active' : ''}
            >
              <ListOrdered size={16} />
            </button>
          </Tooltip>
          <Tooltip content={t('editor_toolbar.cita')}>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={editor.isActive('blockquote') ? 'is-active' : ''}
            >
              <Quote size={16} />
            </button>
          </Tooltip>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <Tooltip content={t('editor_toolbar.deshacer')}>
            <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
              <Undo size={16} />
            </button>
          </Tooltip>
          <Tooltip content={t('editor_toolbar.rehacer')}>
            <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
              <Redo size={16} />
            </button>
          </Tooltip>
          <Tooltip content={t('editor_toolbar.limpiar_formato')}>
            <button onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
              <Eraser size={16} />
            </button>
          </Tooltip>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <Tooltip content={t('editor_toolbar.disminuir_fuente')}>
            <button onClick={() => handleFontSizeChange(-1)}>
              <Minus size={16} />
            </button>
          </Tooltip>
          <span style={{ fontSize: '11px', padding: '0 4px', color: 'var(--text-muted)', minWidth: '28px', textAlign: 'center' }}>
            {fontSize}
          </span>
          <Tooltip content={t('editor_toolbar.aumentar_fuente')}>
            <button onClick={() => handleFontSizeChange(1)}>
              <Plus size={16} />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="rich-editor__content-wrapper" style={{ '--editor-font-size': `${fontSize}px` }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
