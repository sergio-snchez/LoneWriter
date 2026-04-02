# Fix: Renderizado de textos de IA en panel (Debate, Oráculo, Reescribir)

## Problema
Los textos generados por IA contienen markdown (`**negrita**`, `*cursiva*`, `<p>`, etc.) pero se muestran como texto literal en las tres pestañas del panel IA porque React escapa todo en interpolación JSX.

## Solución
Instalar `marked` y crear una utilidad de renderizado markdown→HTML para las 3 tabs.

---

## Cambios a realizar

### 1. Instalar dependencia ✅ COMPLETADO
```bash
npm install marked
```

### 2. Crear utilidad `src/utils/renderMarkdown.js` ✅ PENDIENTE
```javascript
import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function renderMarkdown(text) {
  if (!text) return '';
  return marked.parse(String(text));
}
```

### 3. Modificar `src/components/AIPanel.jsx`

#### 3a. Importar la utilidad (línea ~14, tras los imports existentes) ✅ PENDIENTE
Añadir tras línea 14:
```javascript
import { renderMarkdown } from '../utils/renderMarkdown';
```

#### 3b. RewriteTab — Línea 293 ✅ PENDIENTE
**Antes:**
```jsx
<div className="rewrite-result__text" dangerouslySetInnerHTML={{ __html: lastRewrite }}></div>
```

**Después:**
```jsx
<div className="rewrite-result__text" dangerouslySetInnerHTML={{ __html: renderMarkdown(lastRewrite) }}></div>
```

#### 3c. DebateTab — User messages (línea ~739) ✅ PENDIENTE
**Antes:**
```jsx
<div className="debate-msg__bubble debate-msg__bubble--user">{msg.text}</div>
```

**Después:**
```jsx
<div className="debate-msg__bubble debate-msg__bubble--user" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}></div>
```

#### 3d. DebateTab — Agent messages (líneas ~770-771) ✅ PENDIENTE
**Antes:**
```jsx
<div className={`debate-msg__text ${!isExpanded ? 'debate-msg__text--clamped' : ''}`}>
  {text}
</div>
```

**Después:**
```jsx
<div className={`debate-msg__text ${!isExpanded ? 'debate-msg__text--clamped' : ''}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}>
</div>
```

#### 3e. DebateTab — Error messages (líneas ~749-752) ✅ PENDIENTE
**Antes:**
```jsx
<span><strong>{msg.agentName}:</strong> {msg.text}</span>
```

**Después:**
```jsx
<span><strong>{msg.agentName}:</strong> <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }} /></span>
```

#### 3f. OracleTab — Verdict text (líneas ~1154-1155) ✅ PENDIENTE
**Antes:**
```jsx
<div className={`oracle-tab__entry-text ${isExpanded ? 'oracle-tab__entry-text--expanded' : 'oracle-tab__entry-text--clamped'}`}>
  {cleanText}
</div>
```

**Después:**
```jsx
<div className={`oracle-tab__entry-text ${isExpanded ? 'oracle-tab__entry-text--expanded' : 'oracle-tab__entry-text--clamped'}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(cleanText) }}>
</div>
```

### 4. Añadir CSS a `src/components/AIPanel.css`

#### 4a. Estilos para textos de debate renderizados ✅ PENDIENTE
Añadir al final del archivo:
```css
/* Rendered markdown in debate messages */
.debate-msg__text :where(p) {
  margin: 0.4em 0;
}
.debate-msg__text :where(p:first-child) {
  margin-top: 0;
}
.debate-msg__text :where(p:last-child) {
  margin-bottom: 0;
}
.debate-msg__text :where(strong, b) {
  font-weight: 700;
}
.debate-msg__text :where(em, i) {
  font-style: italic;
}
.debate-msg__text :where(ul, ol) {
  padding-left: 1.2em;
  margin: 0.3em 0;
}
.debate-msg__text :where(li) {
  margin: 0.15em 0;
}
.debate-msg__text :where(code) {
  background: rgba(255,255,255,0.08);
  padding: 0.1em 0.35em;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: 'Fira Code', 'Consolas', monospace;
}
.debate-msg__text :where(blockquote) {
  border-left: 3px solid rgba(255,255,255,0.2);
  padding-left: 0.75em;
  margin: 0.4em 0;
  color: rgba(255,255,255,0.7);
}
```

#### 4b. Estilos para textos de oráculo renderizados ✅ PENDIENTE
Añadir al final del archivo:
```css
/* Rendered markdown in oracle entries */
.oracle-tab__entry-text :where(p) {
  margin: 0.4em 0;
}
.oracle-tab__entry-text :where(p:first-child) {
  margin-top: 0;
}
.oracle-tab__entry-text :where(p:last-child) {
  margin-bottom: 0;
}
.oracle-tab__entry-text :where(strong, b) {
  font-weight: 700;
}
.oracle-tab__entry-text :where(em, i) {
  font-style: italic;
}
.oracle-tab__entry-text :where(ul, ol) {
  padding-left: 1.2em;
  margin: 0.3em 0;
}
.oracle-tab__entry-text :where(li) {
  margin: 0.15em 0;
}
.oracle-tab__entry-text :where(code) {
  background: rgba(0,0,0,0.06);
  padding: 0.1em 0.35em;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: 'Fira Code', 'Consolas', monospace;
}
.oracle-tab__entry-text :where(blockquote) {
  border-left: 3px solid rgba(0,0,0,0.15);
  padding-left: 0.75em;
  margin: 0.4em 0;
  color: rgba(0,0,0,0.7);
}
```

#### 4c. Estilos para textos de reescritura renderizados ✅ PENDIENTE
Añadir al final del archivo:
```css
/* Rendered markdown in rewrite results */
.rewrite-result__text :where(p) {
  margin: 0.6em 0;
}
.rewrite-result__text :where(p:first-child) {
  margin-top: 0;
}
.rewrite-result__text :where(p:last-child) {
  margin-bottom: 0;
}
.rewrite-result__text :where(strong, b) {
  font-weight: 700;
}
.rewrite-result__text :where(em, i) {
  font-style: italic;
}
.rewrite-result__text :where(ul, ol) {
  padding-left: 1.2em;
  margin: 0.3em 0;
}
.rewrite-result__text :where(li) {
  margin: 0.15em 0;
}
```

---

## Resumen de archivos a modificar
| Archivo | Estado | Cambio |
|---------|--------|--------|
| `package.json` | ✅ Hecho | `marked` instalado |
| `src/utils/renderMarkdown.js` | ⏳ Pendiente | **Nuevo** — Utilidad de renderizado |
| `src/components/AIPanel.jsx` | ⏳ Pendiente | Usar `dangerouslySetInnerHTML` + `renderMarkdown()` en 5 ubicaciones |
| `src/components/AIPanel.css` | ⏳ Pendiente | Añadir estilos para elementos HTML hijos en 3 secciones |
