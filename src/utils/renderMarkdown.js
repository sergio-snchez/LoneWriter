import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function renderMarkdown(text) {
  if (!text) return '';
  
  let normalized = String(text);
  
  normalized = normalized
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  
  normalized = normalized
    .replace(/[ \t]+/g, ' ')
    .replace(/^\s+/gm, '')
    .replace(/\s+$/gm, '');
  
  normalized = normalized
    .replace(/\n{5,}/g, '\n\n\n')
    .replace(/\n\n\n+/g, '\n\n')
    .replace(/\n\n\s*\n/g, '\n\n');
  
  return marked.parse(normalized);
}