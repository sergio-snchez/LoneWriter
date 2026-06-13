import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './renderMarkdown';

describe('renderMarkdown', () => {
  it('returns empty string for null/undefined input', () => {
    expect(renderMarkdown(null)).toBe('');
    expect(renderMarkdown(undefined)).toBe('');
    expect(renderMarkdown('')).toBe('');
  });

  it('converts basic markdown to HTML', () => {
    const result = renderMarkdown('# Hello');
    expect(result).toContain('<h1');
    expect(result).toContain('Hello');
  });

  it('converts bold text', () => {
    const result = renderMarkdown('**bold**');
    expect(result).toContain('<strong>bold</strong>');
  });

  it('converts italic text', () => {
    const result = renderMarkdown('*italic*');
    expect(result).toContain('<em>italic</em>');
  });

  it('converts links', () => {
    const result = renderMarkdown('[click](https://example.com)');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('click');
  });

  it('converts paragraphs with line breaks', () => {
    const result = renderMarkdown('Line 1\nLine 2');
    // GFM + breaks: lines should be <br> or separate paragraphs
    expect(result).toContain('Line 1');
    expect(result).toContain('Line 2');
  });

  it('normalizes excessive whitespace', () => {
    const result = renderMarkdown('Hello    world');
    expect(result).not.toContain('    '); // No multiple spaces
  });

  it('normalizes excessive newlines', () => {
    const result = renderMarkdown('Line 1\n\n\n\n\nLine 2');
    expect(result).toContain('Line 1');
    expect(result).toContain('Line 2');
  });

  it('handles Windows line endings (\\r\\n)', () => {
    const result = renderMarkdown('Hello\r\nWorld');
    expect(result).toContain('Hello');
    expect(result).toContain('World');
  });

  it('handles old Mac line endings (\\r)', () => {
    const result = renderMarkdown('Hello\rWorld');
    expect(result).toContain('Hello');
    expect(result).toContain('World');
  });

  it('converts unordered lists', () => {
    const result = renderMarkdown('- Item 1\n- Item 2');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>Item 1</li>');
    expect(result).toContain('<li>Item 2</li>');
    expect(result).toContain('</ul>');
  });
});
