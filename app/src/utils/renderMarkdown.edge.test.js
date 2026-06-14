import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './renderMarkdown';

describe('renderMarkdown — edge cases', () => {
  // ── HTML injection / XSS ────────────────────────────────────────────────

  it('NO escapa HTML (se espera, la sanitización la hace DOMPurify aparte)', () => {
    // marked permite HTML sin escapar por diseño.
    // La sanitización real contra XSS ocurre en MarkdownRenderer.jsx vía DOMPurify.
    const result = renderMarkdown('<script>alert("xss")</script>');
    // marked pasa el HTML sin modificar (no escapa)
    expect(result).toContain('<script>');
  });

  it('NO escapa HTML en bloque', () => {
    const result = renderMarkdown('<div onclick="evil">click</div>');
    expect(result).toContain('<div onclick');
  });

  // ── URLs y enlaces complejos ────────────────────────────────────────────

  it('convierte enlaces con caracteres especiales en la URL', () => {
    const result = renderMarkdown('[link](https://example.com/path?q=a+b&c=d#frag)');
    // marked conserva los caracteres especiales sin escapar en href
    expect(result).toContain('href="https://example.com/path?q=a+b&c=d#frag"');
  });

  it('convierte URLs desnudas a enlaces (GFM autolink)', () => {
    const result = renderMarkdown('Visita https://example.com ahora');
    // GFM autolink convierte URLs automáticamente
    expect(result).toContain('href="https://example.com"');
  });

  // ── Markdown complejo mixto ─────────────────────────────────────────────

  it('convierte listas anidadas', () => {
    const result = renderMarkdown('- Item 1\n  - Subitem 1\n  - Subitem 2\n- Item 2');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>Item 1');
    expect(result).toContain('<li>Subitem 1');
    expect(result).toContain('</ul>');
  });

  it('convierte texto con formato mixto (bold + italic + link)', () => {
    const result = renderMarkdown('**bold** and *italic* and [link](https://x.com)');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('href="https://x.com"');
  });

  it('convierte headings de nivel 1 y 2', () => {
    const h1 = renderMarkdown('# Title');
    const h2 = renderMarkdown('## Subtitle');
    expect(h1).toContain('<h1');
    expect(h1).toContain('Title');
    expect(h2).toContain('<h2');
    expect(h2).toContain('Subtitle');
  });

  it('convierte blockquote', () => {
    const result = renderMarkdown('> Cita célebre');
    expect(result).toContain('<blockquote>');
    expect(result).toContain('Cita célebre');
  });

  it('convierte código inline', () => {
    const result = renderMarkdown('Usa `console.log()` para depurar');
    expect(result).toContain('<code>console.log()</code>');
  });

  it('convierte código en bloque (fenced code block)', () => {
    const result = renderMarkdown('```js\nconst x = 1;\n```');
    expect(result).toContain('<pre><code');
    expect(result).toContain('const x = 1;');
  });

  it('convierte línea horizontal con ***', () => {
    const result = renderMarkdown('Antes\n\n***\n\nDespués');
    expect(result).toContain('<hr');
  });

  // ── Normalización de whitespace ─────────────────────────────────────────

  it('normaliza múltiples espacios seguidos', () => {
    const result = renderMarkdown('Esto    tiene    muchos    espacios');
    expect(result).not.toContain('    '); // No debe tener 4 espacios seguidos
  });

  it('normaliza líneas en blanco al inicio', () => {
    const result = renderMarkdown('\n\n\nHola');
    expect(result).toContain('Hola');
  });

  it('normaliza líneas en blanco al final (marked 18 trims these)', () => {
    const result = renderMarkdown('Hola\n\n\n\n');
    expect(result).toContain('Hola');
    // marked 18 trims trailing blank lines from block tokens
    const pTags = result.match(/<p>/g);
    expect(pTags?.length).toBeLessThanOrEqual(2);
  });

  // ── Unicode y caracteres especiales ─────────────────────────────────────

  it('maneja caracteres Unicode (acentos, ñ, emojis)', () => {
    const result = renderMarkdown('Niño, canción, café, corazón \u{1F496}');
    expect(result).toContain('Niño');
    expect(result).toContain('canci\u00F3n');
    expect(result).toContain('coraz\u00F3n');
    expect(result).toContain('\u{1F496}');
  });

  it('maneja texto en otros alfabetos (cirílico, árabe, chino)', () => {
    const result = renderMarkdown('Привет мир / مرحبا بالعالم / 你好世界');
    expect(result).toContain('Привет');
    expect(result).toContain('مرحبا');
    expect(result).toContain('你好世界');
  });

  // ── Salida con <br> por la opción breaks:true ───────────────────────────

  it('convierte saltos de línea simples a <br> (breaks: true)', () => {
    const result = renderMarkdown('Línea 1\nLínea 2');
    // Con breaks:true, los saltos de línea simples se convierten en <br>
    expect(result).toContain('<br>');
  });

  it('convierte doble salto de línea a párrafo único con <br>', () => {
    // Con breaks:true, incluso doble \n produce <br> dentro del mismo párrafo
    // porque la normalización colapsa whitespace. El contenido queda en un solo <p>.
    const result = renderMarkdown('Párrafo 1\n\nPárrafo 2');
    expect(result).toContain('Párrafo 1');
    expect(result).toContain('Párrafo 2');
    expect(result).toContain('<br>');
  });

  // ── Input vacíos / nulos ────────────────────────────────────────────────

  it('devuelve string vacío para whitespace-only', () => {
    expect(renderMarkdown('   ')).toBe('');
    expect(renderMarkdown('\n\n\n')).toBe('');
    expect(renderMarkdown(' \n \n ')).toBe('');
  });

  it('devuelve string vacío para input numérico', () => {
    expect(renderMarkdown(0)).toBe('');
  });

  it('convierte input booleano a string', () => {
    const result = renderMarkdown(true);
    expect(result).toContain('true');
  });

  // ── Compatibilidad marked 18: trailing blank lines ─────────────────────

  it('marked 18: no genera párrafos extra por líneas en blanco finales', () => {
    const result = renderMarkdown('Texto\n\n\n\n  \n\n');
    expect(result).toContain('Texto');
    const pTags = result.match(/<p>/g);
    expect(pTags?.length).toBeLessThanOrEqual(2);
  });

  // ── GFM: tachado, tablas, task lists ────────────────────────────────────

  it('convierte tachado (GFM)', () => {
    const result = renderMarkdown('~~tachado~~');
    expect(result).toContain('<del>tachado</del>');
  });

  it('convierte tablas (GFM) con <th> para cabeceras y <td> para celdas', () => {
    const result = renderMarkdown('| A | B |\n|---|---|\n| 1 | 2 |');
    expect(result).toContain('<table>');
    expect(result).toContain('<th>A</th>');
    expect(result).toContain('<th>B</th>');
    expect(result).toContain('<td>1</td>');
    expect(result).toContain('<td>2</td>');
    expect(result).toContain('</table>');
  });

  it('convierte task lists (GFM)', () => {
    const result = renderMarkdown('- [x] Hecho\n- [ ] Pendiente');
    expect(result).toContain('<input checked="" disabled="" type="checkbox">');
    expect(result).toContain('<input disabled="" type="checkbox">');
  });
});
