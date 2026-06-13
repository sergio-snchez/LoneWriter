# Fase 4 — PropTypes + JSDoc Types

## Resumen
Añadida documentación de tipos a todos los componentes React (PropTypes) y a los servicios clave (JSDoc). Esto completa la **Fase 4** del plan de deuda técnica.

## ¿Qué se hizo?

### 1. PropTypes añadidos a **34 componentes** (de 45 que aceptan props)

| Archivo | Componentes |
|---------|-------------|
| `components/Tooltip.jsx` | `Tooltip` |
| `components/CustomDatePicker.jsx` | `CustomDatePicker` |
| `components/ProposalCard.jsx` | `ProposalCard` |
| `components/PwaUpdateModal.jsx` | `PwaUpdateModal` |
| `components/TypingEffect.jsx` | `TypingEffect` |
| `components/MeshBackground.jsx` | `MeshBackground` |
| `components/Sidebar.jsx` | `Sidebar` |
| `components/RichEditor.jsx` | `RichEditor` |
| `components/AIPanel.jsx` | `AIPanel` |
| `components/SettingsModal.jsx` | `SettingsModal` |
| `components/SettingsAITab.jsx` | `SettingsAITab` |
| `components/SettingsCloudTab.jsx` | `SettingsCloudTab` |
| `components/SettingsGeneralTab.jsx` | `SettingsGeneralTab` |
| `components/SettingsUITab.jsx` | `SettingsUITab` |
| `components/StorylineChart.jsx` | `StorylineChart` |
| `components/aipanel/AgentEditForm.jsx` | `AgentEditForm` |
| `components/aipanel/RewriteTab.jsx` | `RewriteTab` |
| `components/aipanel/DebateTab.jsx` | `DebateTab` |
| `components/aipanel/OracleTab.jsx` | `OracleTab` |
| `components/StopwordsModal.jsx` | — (solo `onClose`) |
| `views/compendium/CompendiumCards.jsx` | `CharacterCard`, `LocationCard`, `ObjectCard`, `LoreCard` |
| `views/compendium/CompendiumFilters.jsx` | `CompendiumFilters` |
| `views/compendium/CompendiumMpcOverlay.jsx` | `CompendiumMpcOverlay` |
| `views/compendium/CompendiumPanel.jsx` | `CompendiumPanel` |
| `views/editor/EditorSortables.jsx` | `StatusBadge`, `EditableTitle`, `SortableSceneRow`, `SortableChapterAccordion`, `SortableActSection` |
| `views/editor/EditorStats.jsx` | `EditorStats` |
| `views/editor/EditorToolbar.jsx` | `EditorToolbar` |
| `views/Editor.jsx` | `EditorView` |
| `views/Nexus.jsx` | `Nexus` |
| `context/AIContext.jsx` | `AIProvider` (children) |
| `context/ModalContext.jsx` | `ModalProvider` (children) |
| `context/NovelContext.jsx` | `NovelProvider` (children) |

### 2. Componentes SIN props (no necesitan PropTypes)
- `App.jsx` (sin props)
- `CompendiumView` (sin props)
- `LanguageSelector`, `MergeOverlay`, `RagToast`, `ResourcesView` (sin props)

### 3. JSDoc types añadidos a servicios clave

| Archivo | Mejora |
|---------|--------|
| `services/aiService.js` | `@typedef AIConfig` + `@typedef AIResponse` con todos los campos documentados. Todos los métodos públicos (`_callWithConfig`, `rewrite`, `summarizeScene`, `autoCompleteCompendiumEntry`, `agentChat`, `fuseEntities`, `fuseMultipleEntities`) ahora tienen `@param`/`@returns` completos. |
| `services/providers/fetchWithRetry.js` | JSDoc ampliado con `@throws` y descripciones. |

Los 5 providers (`openai`, `claude`, `gemini`, `openrouter`, `local`) ya tenían JSDoc `@param`/`@returns` desde Fase 2, no se modificaron.

## Verificación

| Comando | Resultado |
|---------|-----------|
| `npm run lint` | **0 errores**, 23 warnings (todos preexistentes) |
| `npm test` | **117 tests passed** (12 files) |
| `npm run build` | **Build exitoso** |

## Pendiente post-Fase 4
- Los 11 componentes sin props (`LanguageSelector`, `MergeOverlay`, `RagToast`, etc.) son intencionales — no reciben props, no necesitan PropTypes.
- Queda pendiente migrar a TypeScript si se desea en el futuro. PropTypes + JSDoc son el paso intermedio que documenta tipos sin cambiar el lenguaje.
