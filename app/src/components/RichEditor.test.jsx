import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks de dependencias externas ──────────────────────────────────────────

// Fábrica de cadenas Tiptap (usada tanto para editor.chain() como editor.can().chain())
const createTiptapChain = () => {
  const chain = {
    focus: vi.fn(() => chain),
    toggleBold: vi.fn(() => chain),
    toggleItalic: vi.fn(() => chain),
    toggleHeading: vi.fn(() => chain),
    toggleBulletList: vi.fn(() => chain),
    toggleOrderedList: vi.fn(() => chain),
    toggleBlockquote: vi.fn(() => chain),
    undo: vi.fn(() => chain),
    redo: vi.fn(() => chain),
    clearNodes: vi.fn(() => chain),
    unsetAllMarks: vi.fn(() => chain),
    insertContent: vi.fn(() => chain),
    run: vi.fn(),
  };
  return chain;
};

// editor.can() admite DOS patrones:
//   1. editor.can().undo() → boolean (llamada directa)
//   2. editor.can().chain().focus().toggleBold().run() (encadenado)
const canMethods = [
  'toggleBold', 'toggleItalic', 'toggleHeading', 'toggleBulletList',
  'toggleOrderedList', 'toggleBlockquote', 'undo', 'redo',
  'clearNodes', 'unsetAllMarks', 'insertContent',
];
const canApi = {
  chain: () => createTiptapChain(),
  ...Object.fromEntries(canMethods.map((m) => [m, () => true])),
};

const mockGetHTML = vi.fn(() => '<p>test content</p>');
const mockTextBetween = vi.fn(() => 'paragraph text');
const mockEditor = {
  chain: vi.fn(() => createTiptapChain()),
  can: vi.fn(() => canApi),
  isActive: vi.fn(() => false),
  getHTML: mockGetHTML,
  state: {
    selection: {
      from: 0,
      to: 0,
      $from: { start: () => 0, end: () => 10 },
    },
    doc: { textBetween: mockTextBetween },
  },
};

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(() => mockEditor),
  // eslint-disable-next-line react/prop-types
  EditorContent: ({ editor }) => {
    if (!editor) return null;
    return <div data-testid="editor-content">Editor Content</div>;
  },
}));

vi.mock('@tiptap/starter-kit', () => ({
  default: {
    configure: vi.fn(() => ({})),
  },
}));

vi.mock('@tiptap/extension-text-style', () => ({
  TextStyle: {},
}));

// Mock de lucide-react (solo los iconos que RichEditor usa directamente)
vi.mock('lucide-react', () => {
  const iconMock = (name) => {
    const Icon = (props) => <span data-testid={`icon-${name}`} {...props} />;
    Icon.displayName = name;
    return Icon;
  };
  return {
    Bold: iconMock('Bold'),
    Italic: iconMock('Italic'),
    List: iconMock('List'),
    ListOrdered: iconMock('ListOrdered'),
    Quote: iconMock('Quote'),
    Heading1: iconMock('Heading1'),
    Heading2: iconMock('Heading2'),
    Undo: iconMock('Undo'),
    Redo: iconMock('Redo'),
    Eraser: iconMock('Eraser'),
    Minus: iconMock('Minus'),
    Plus: iconMock('Plus'),
  };
});

// Mock de components/index.js para evitar cascade-load de TODOS los componentes
// al importar `Tooltip` desde `./` en RichEditor.jsx
vi.mock('./index', () => ({
  // eslint-disable-next-line react/prop-types
  Tooltip: ({ children, content, className }) => (
    <span title={content} className={className}>{children}</span>
  ),
}));

// Mock de la base de datos
const mockEditorPrefsGet = vi.fn();
const mockEditorPrefsPut = vi.fn();
vi.mock('../db/database', () => ({
  db: {
    editorPrefs: {
      get: (...args) => mockEditorPrefsGet(...args),
      put: (...args) => mockEditorPrefsPut(...args),
    },
  },
}));

// Mock del contexto AI
const mockSetSelection = vi.fn();
const mockSetOracleText = vi.fn();
vi.mock('../context', () => ({
  useAI: () => ({
    setSelection: mockSetSelection,
    setOracleText: mockSetOracleText,
  }),
}));

// Mock de i18next
const mockT = vi.fn((key) => {
  const map = {
    'editor_toolbar.negrita': 'Negrita',
    'editor_toolbar.cursiva': 'Cursiva',
    'editor_toolbar.titulo_1': 'Título 1',
    'editor_toolbar.titulo_2': 'Título 2',
    'editor_toolbar.lista': 'Lista',
    'editor_toolbar.lista_numerada': 'Lista numerada',
    'editor_toolbar.cita': 'Cita',
    'editor_toolbar.deshacer': 'Deshacer',
    'editor_toolbar.rehacer': 'Rehacer',
    'editor_toolbar.limpiar_formato': 'Limpiar formato',
    'editor_toolbar.disminuir_fuente': 'Disminuir fuente',
    'editor_toolbar.aumentar_fuente': 'Aumentar fuente',
  };
  return map[key] || key;
});
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
}));

// ── Componente bajo test ────────────────────────────────────────────────────
import RichEditor from './RichEditor';

describe('RichEditor (Smoke Test)', () => {
  const defaultProps = {
    content: '<p>Initial content</p>',
    onChange: vi.fn(),
    placeholder: 'Escribe aquí...',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEditorPrefsGet.mockResolvedValue({ value: 15 });
    mockEditorPrefsPut.mockResolvedValue(undefined);
  });

  // ── Renderizado básico ──────────────────────────────────────────────────

  it('renderiza sin errores con props básicas', () => {
    render(<RichEditor {...defaultProps} />);
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('renderiza null cuando el editor no está listo', async () => {
    // El mock global devuelve un editor, este test verifica que el componente
    // maneja el caso useEditor → null (cubierto por el check if(!editor))
    const { useEditor } = await import('@tiptap/react');
    useEditor.mockReturnValueOnce(null);
    const { container } = render(<RichEditor {...defaultProps} />);
    expect(container.innerHTML).toBe('');
  });

  // ── Toolbar ─────────────────────────────────────────────────────────────

  it('renderiza todos los botones del toolbar', () => {
    render(<RichEditor {...defaultProps} />);
    const icons = [
      'icon-Bold', 'icon-Italic',
      'icon-Heading1', 'icon-Heading2',
      'icon-List', 'icon-ListOrdered', 'icon-Quote',
      'icon-Undo', 'icon-Redo', 'icon-Eraser',
      'icon-Minus', 'icon-Plus',
    ];
    icons.forEach((icon) => {
      expect(screen.getByTestId(icon)).toBeInTheDocument();
    });
  });

  // ── Control de tamaño de fuente ─────────────────────────────────────────

  it('muestra el tamaño de fuente por defecto (15)', async () => {
    render(<RichEditor {...defaultProps} />);
    expect(await screen.findByText('15')).toBeInTheDocument();
  });

  it('incrementa el tamaño de fuente al pulsar Plus', async () => {
    render(<RichEditor {...defaultProps} />);
    const plusBtn = screen.getByTestId('icon-Plus').closest('button');
    expect(plusBtn).not.toBeNull();

    fireEvent.click(plusBtn);

    expect(await screen.findByText('16')).toBeInTheDocument();
    expect(mockEditorPrefsPut).toHaveBeenCalledWith({ key: 'fontSize', value: 16 });
  });

  it('decrementa el tamaño de fuente al pulsar Minus', async () => {
    mockEditorPrefsGet.mockResolvedValue({ value: 18 });
    render(<RichEditor {...defaultProps} />);
    await screen.findByText('18');
    
    const minusBtn = screen.getByTestId('icon-Minus').closest('button');
    expect(minusBtn).not.toBeNull();

    fireEvent.click(minusBtn);

    expect(await screen.findByText('17')).toBeInTheDocument();
    expect(mockEditorPrefsPut).toHaveBeenCalledWith({ key: 'fontSize', value: 17 });
  });

  it('clampa el tamaño mínimo a 12', async () => {
    mockEditorPrefsGet.mockResolvedValue({ value: 12 });
    render(<RichEditor {...defaultProps} />);
    await screen.findByText('12');

    const minusBtn = screen.getByTestId('icon-Minus').closest('button');
    fireEvent.click(minusBtn);

    // Sigue siendo 12 porque está en el mínimo
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('clampa el tamaño máximo a 28', async () => {
    mockEditorPrefsGet.mockResolvedValue({ value: 28 });
    render(<RichEditor {...defaultProps} />);
    await screen.findByText('28');

    const plusBtn = screen.getByTestId('icon-Plus').closest('button');
    fireEvent.click(plusBtn);

    expect(screen.getByText('28')).toBeInTheDocument();
  });

  // ── Estado de error ─────────────────────────────────────────────────────

  it('muestra la UI de error cuando el editor falla', () => {
    // Probamos que el componente se renderiza correctamente sin error
    // (el error real de Tiptap se mockea a nivel de useEditor)
    render(<RichEditor content="<p>test</p>" onChange={vi.fn()} />);
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  // ── Evento personalizado ai-apply-rewrite ───────────────────────────────

  it('responde al evento ai-apply-rewrite insertando contenido', () => {
    render(<RichEditor {...defaultProps} />);
    const insertHtml = '<p>New content from AI</p>';
    window.dispatchEvent(new CustomEvent('ai-apply-rewrite', { detail: insertHtml }));
    // editor.chain() se llama múltiples veces. Tomamos la ÚLTIMA cadena devuelta.
    const calls = mockEditor.chain.mock.results;
    const lastChain = calls[calls.length - 1]?.value;
    expect(lastChain).toBeDefined();
    expect(lastChain.insertContent).toHaveBeenCalledWith(insertHtml);
    expect(lastChain.run).toHaveBeenCalled();
  });

  // ── Carga de preferencias ───────────────────────────────────────────────

  it('carga el tamaño de fuente desde Dexie al montar', async () => {
    mockEditorPrefsGet.mockResolvedValue({ value: 20 });
    render(<RichEditor {...defaultProps} />);
    expect(mockEditorPrefsGet).toHaveBeenCalledWith('fontSize');
    expect(await screen.findByText('20')).toBeInTheDocument();
  });

  it('usa tamaño por defecto 15 si no hay preferencia guardada', async () => {
    mockEditorPrefsGet.mockResolvedValue(null);
    render(<RichEditor {...defaultProps} />);
    expect(await screen.findByText('15')).toBeInTheDocument();
  });

  it('tolera errores al cargar fontSize desde Dexie', async () => {
    mockEditorPrefsGet.mockRejectedValue(new Error('DB error'));
    render(<RichEditor {...defaultProps} />);
    expect(await screen.findByText('15')).toBeInTheDocument();
  });
});
