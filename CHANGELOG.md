# Changelog

<div align="center">

[Also available in Spanish](./CHANGELOG_ES.md)

</div>

## [LoneWriter v2.2.4] - 2026-07-15
### Added
- **Import to Lore**: New "Add to Lore" option in the Import Wizard — imports a file as a compendium Lore entry with title, category, and tags instead of narrative structure. Ideal for world-building rules, magic systems, and fictional languages.
- **Lore reimport**: Re-importing a file that was previously imported as Lore now updates the existing entry, preserving its DB record. Title and tags are pre-filled from the existing entry.
- **Editable title icon**: PenLine icon appears on hover for acts, chapters, scenes, and novel title, making editable fields more discoverable.
- **Default "Importado" tag**: Lore imports automatically include the "Importado" tag, keeping imported entries visually distinct in the compendium.

### Changed
- **Lore config layout**: Category and tags fields now display on the same row for a more compact form.
- **Lore import UX**: Clear distinction between create and update flows with separate button text, progress labels, and completion messages.

### Fixed
- **rawContent in parsers**: All parsers (DOCX, PDF, ODT) now return `rawContent` for plain-text preview during import.
- **Compendium card line breaks**: Lore descriptions and character/location/object card descriptions now preserve `\n` line breaks via `white-space: pre-wrap`.
- **Lore reimport error**: Fixed missing `existingResource` in the lore branch of `handleImport`.

## [LoneWriter v2.2.3] - 2026-07-14
### Added
- **ODT export**: Single scene and full novel export to OpenDocument Text format with proper heading hierarchy (h1-h4).
- **Import progress bar**: Animated progress bar with phase labels (novel preparation, cleanup, scene import, resource saving) during document import.
- **Token Review filters**: Type filter buttons (Act, Chapter, Scene, Text) with token counts in the import review step.
- **Bulk token editing**: Multi-select with checkboxes, bulk type change, and bulk delete in Token Review.
- **Header persistence**: Editor toolbar synopsis/timeline panel state now persists in IndexedDB across view navigation.
- **Re-import token memory**: User's Token Review edits (type assignments, deletions) are saved to the resource and restored when re-importing the same file.

### Fixed
- **DOCX list line breaks**: Numbered and bulleted lists now import with proper line breaks and "- " prefix instead of concatenating all items into a single line.
- **Update mode UI clarity**: "Actualizar [Novela]" text now differs from "Añadir a [Novela]" when re-importing. The "Create new novel" option is hidden in update mode.
- **Token Review in update mode**: Token Review is now shown when choosing "Actualizar", giving users full control over structure before update.
- **Header collapse on navigation**: Editor toolbar header no longer collapses when switching between Editor, Compendium, and Nexus views.

## [LoneWriter v2.1.0] - 2026-06-30
### Added
- **ThemeContext**: New React context wrapping `useAppPreferences()` eliminating prop-drilling of `theme`, `setTheme`, `editorFont`, `setEditorFont`, `meshEnabled`, `setMeshEnabled` across 6 components (App, WelcomeScreen, MeshBackground, SettingsUITab, SettingsModal, Nexus).
- **Nexus theme reactivity**: Replaced MutationObserver on `<html data-theme>` with `useThemeContext().theme` — theme detection is now reactive via React context instead of imperative DOM observation.
- **Database recovery UI**: New `Boot` component in `main.jsx` handling 3 states (loading→error→ready). `DbRecovery` panel with Retry/Reset Database buttons on Dexie open failure. `restoreTables()` now includes automatic rollback with pre-backup and fallback on failure.
- **API key encryption**: New `utils/crypto.js` with `encryptValue`/`decryptValue` using AES-GCM 256 + PBKDF2 key derivation + device fingerprint (userAgent, language, screen). API keys encrypted before persisting to IndexedDB, decrypted on load.
- **Clipboard with fallback**: New `utils/clipboard.js` (`copyToClipboard` with `navigator.clipboard.writeText` → `document.execCommand('copy')` fallback). Migrated OracleTab and RewriteTab.
- **AgentEditForm validation**: Field validation (name ≤100 chars, prompt ≤4000 chars, both required), error display, and HTML escaping via `escapeHtml()` before save.
- **i18n in ErrorBoundary**: Hardcoded Spanish text replaced with `i18n.t()` calls and new `error_boundary` keys in `en/common.json` / `es/common.json`.
- **Auto-restore active novel**: `NovelContext.jsx` restores last active novel from `localStorage('activeNovelId')` after DB initialization. `clearNovelData()` cleans the key.
- **Lazy-load RAG**: `switchNovel` only calls `indexPendingScenes()` if `lw_oracle_visited` flag is set, using dynamic `import()`. Avoids loading the embeddings worker unless the user has visited the Oracle.
- **3 new test files**: `useAIConfig.test.js` (13 tests), `useNovelCrud.test.js` (12 tests), `useCloudSync.test.js` (10 tests). 6 known-answer tests for encryptPayload/decryptPayload in `exportService.test.js`.

### Changed
- **fetchWithRetry**: New `timeoutMs` parameter (default 30s) with `AbortController` + `setTimeout` per attempt. Proper timeout cleanup in all branches. All providers migrated from raw `fetch()` to `fetchWithRetry()` (claude, gemini, openai, openrouter).
- **Claude provider**: Added `anthropic-dangerous-direct-browser-access: 'true'` header required by Anthropic for browser access.
- **Timestamps localized**: OracleTab and useDebateOrchestrator changed from hardcoded `'es-ES'` to `i18n.language` for timestamps.
- **Stopwords deduplication**: `addCustomStopword()` checks for existing word+language before inserting; returns `{ existing: true }` on duplicate. `StopwordsModal` ignores existing entries.
- **OracleTab**: Error display to user no longer includes `err.stack` (only `err.message`), preventing stack trace exposure.
- **useDebate**: `renameDebateSession` now clones array with spread before sorting. Message IDs use `crypto.randomUUID()` instead of `Date.now() + Math.random()`.
- **Export imports refactored**: `encryptPayload`/`decryptPayload` promoted from private to exported functions.
- **SettingsGeneralTab**: Hardcoded `general.version_valor` i18n key replaced with dynamic `APP_VERSION` import.
- **version.test.js**: Changed from `toBe('2.0.4')` to flexible `toMatch(/^\d+\.\d+\.\d+/)`.
- **Local provider**: TypeError detection simplified from string check to `error instanceof TypeError`.
- **Unified exports**: 7 components migrated from named to `export default` (CustomDatePicker, MergeOverlay, SettingsAITab, SettingsCloudTab, SettingsGeneralTab, SettingsUITab, Tooltip). Barrel `components/index.js` updated.
- **PropTypes moved**: `propTypes` definitions moved outside function bodies in 17 components to avoid re-evaluation on every render.

### Fixed
- **Import `.lwrt` binary** (`exportService.js`): Changed from `readAsText()` to `readAsArrayBuffer()` with `TextDecoder().decode()` for correct UTF-8 handling.
- **RichEditor**: `handleApply` event handler now validates `typeof e.detail === 'string'` before inserting content.
- **RagToast**: Removed stale state comment in `useState('idle')`.
- **entityDetector**: Removed unused import of `getEntityStopWords`.

### Removed
- **`process` polyfill**: Removed from `nodePolyfills` in `vite.config.js`.
- **Prop-drilling**: 6 theme-related props removed from SettingsModal and App.jsx.

### Security
- **API keys at rest**: Encrypted with AES-GCM 256 + PBKDF2 key derivation. Each key uses a random salt and device fingerprint — copied IndexedDB data will not decrypt on another device.
- **HTML sanitization**: AgentEditForm escapes user input before saving agent name/prompt.
- **Clipboard security**: Safe fallback using `document.execCommand('copy')` when the async Clipboard API is unavailable.

## [LoneWriter v2.0.4] - 2026-06-14
### Added
- **Oracle continuity toggle**: New checkbox "Include previous scene as continuity context" below detected entities, letting users control token usage.
- **Chronological predecessor injection**: The Oracle now always receives the immediately preceding scene text (not just RAG semantic fragments), catching attribute inconsistencies (material, color, size) even without Compendium entries.

### Changed
- **Oracle prompt relaxed**: Golden Rule now defers to Previous Context when Compendium data is sparse; "completely opposite" threshold removed — any attribute change is reportable.
- **Oracle prompt — explicit attribute instruction**: Added directive to watch physical attributes (material, color, size, shape, possession, location, state).
- **Rewrite context doubled**: `extractPreviousContext` word limit increased from 120 to 240 (~1,000 tokens) for richer rewriting context.

### Fixed
- **Duplicate DB restore logic**: 3 identical blocks extracted into a shared `restoreTables()` function.
- **Export inconsistency**: 5 components migrated from named to `export default`.
- **Console.log removal**: 6 debug logs removed across MPC, RewriteTab, and Nexus.
- **Deep JSX nesting**: 4 subcomponents extracted (ModalActions, OracleEntry, DebateSessionMenu, per-category forms).
- **Prop drilling reduced**: EditorToolbar: 15→3 props; CompendiumPanel restructured.

### Removed
- Unnecessary `import React` from `Nexus.jsx` (automatic JSX transform).

## [LoneWriter v2.0.3] - 2026-06-10
### Changed
- **Dependencies updated**: 11 pinned packages moved to caret ranges (lucide-react, dexie, lodash, @tiptap/*, react, i18next).
- **marked 17→18**: Major bump with 25 new compatibility smoke tests.
- **@huggingface/transformers**: Updated 4.0.1→4.2.0 (transitive onnxruntime-web dev).
- **vite**: Patched 7.3.1→7.3.5; `vite-plugin-pwa` 1.2.0→1.3.0; `vite-plugin-node-polyfills` 0.25.0→0.28.0.

### Added
- **`.nvmrc`**: Created with Node.js 24.16.0 to pin runtime version.
- **2 new test files** (RichEditor + renderMarkdown edge cases): total 155 tests across 14 files.

### Deferred
- Vite 8 (Rolldown migration), ESLint 10 compatibility, `@vitejs/plugin-react` 6 — require major build toolchain changes.

## [LoneWriter v2.0.2] - 2026-06-07
### Added
- **Error Boundaries**: New `ErrorBoundary.jsx` component with 8 wrappers (global + per-view + per-panel) for granular crash recovery.
- **Barrel files**: 10 `index.js` files created across components, services, context, hooks, views, and sub-views — clean, decoupled imports.
- **Memoization**: `useCallback` on 20+ handlers, `useMemo` on 6 computations, `React.memo` on 10 components — reduced unnecessary re-renders.

### Changed
- **Monolithic components split**: 6 components reduced below 500 lines — 11 new hooks extracted (`useCloudRestore`, `useProjectIO`, `useCompendiumMerge`, `useCompendiumSave`, `useEditorMpc`, `useOracle`, `useDebate`, `useNovelData`, `useNovelCrud`, `useNovelProgress`, `NexusGraph`). ~2,800→~1,600 total lines.

### Fixed
- **`data-font` CSS accidentally deleted**: Restored 4 `:root[data-font="..."]` rules in `index.css`.
- **Invisible theme swatches**: Added `.theme-option__swatch` class with `width: 28px; height: 28px; border-radius: 50%`.

## [LoneWriter v2.0.1] - 2026-06-04
### Added
- **ESLint 9 + Prettier**: Flat config, React 19 JSX rules, browser/worker globals. 5 pre-existing code bugs fixed.
- **Vitest test suite**: 117 tests across 12 files — providers, AI service, export, entity detection, compendium search, markdown rendering.
- **PropTypes + JSDoc**: Types on 34 components; `AIConfig` type and JSDoc on all public methods in `aiService.js`.
- **MarkdownRenderer + DOMPurify**: Safe HTML rendering replacing 9 `dangerouslySetInnerHTML` usages.
- **Generic CompendiumCards**: Unified 4 card types into 1 generic component (332→265 lines).

### Changed
- **AI Providers refactored**: ~35 if/else conditionals eliminated — replaced with 2 lookup tables (`PROVIDER_COMPLETION`, `PROVIDER_CHAT`). Centralized `getProvider()`, `t(es, en)`, and `requireApiKey()` helpers.
- **Monolithic CSS fragmented**: ~7,300 lines split into ~2,500 across specialized files. 4 master files broken into 18 focused stylesheets.
- **Inline styles eliminated**: ~242 occurrences across 26 files migrated to CSS classes. Only 4 dynamic CSS variable cases kept.

### Removed
- **dangerouslySetInnerHTML**: 9 usages reduced to 1 (inside MarkdownRenderer, sanitized by DOMPurify).

## [LoneWriter v2.0-timeline] - 2026-05-16
### Added
- **New Links section in Settings**: Centralized access to Official Documentation, Website, and Support (Buy Me a Coffee).
- **Official Documentation Integration**: Direct link to `https://lonewriter-docs.vercel.app/` from both the App and Landing Page.
- **Extended Multilingual Support**: Full translations for new configuration panels and external resource links.
- Automated Oracle continuity validation with visual status indicators.
- Narrative structure auto-generation (Act/Chapter/Scene) for new novels.
- Persistence verification for scene chronology (in-game dates).

### Changed
- **Architectural Refactoring**: Decomposed monolithic components (such as `SettingsModal` and configuration panels) into specialized modules for better maintainability and performance.
- **Timeline Redesign**: Adjusted labels and persistence logic for the scene "Chronology", ensuring in-game dates are correctly saved in Dexie.
- **Settings UI Optimization**: Relocated "Clear Cache & Reload" tool to the Cloud & Backup tab for a more logical functional hierarchy.
- **Icon Compatibility**: Replaced problematic icons with universal versions to ensure reliability across environments with legacy dependencies.
- Improved glassmorphism and visual consistency across the editor.

### Removed
- Obsolete v1.9 references in banners and footers across the application and landing page.

## [LoneWriter v1.9-nexus] - 2026-05-03

### Added
- **Nexus — 3D/2D Knowledge Graph**: New top-level view (`Nexus`) with a dual-mode interactive graph of all Compendium entities. Powered by `react-force-graph-3d` / `react-force-graph-2d` and Three.js.
  - **Animated energy flows**: Particles travel along connections with a pulsing opacity animation, visually representing relationship strength and direction.
  - **Permanent node labels**: Entity names displayed at all times, sized and colored by importance and theme.
  - **Ambient radiance (halo)**: Important nodes emit a subtle color glow rendered behind the graph links.
  - **3D node texture cache** (`nodeObjectCache`): Canvas textures and Three.js `Group` objects cached per node to avoid re-creation on every render tick, greatly improving 3D performance.
- **Nexus — Chronological Timeline**: Full scene-by-scene timeline of in-universe events using `vis-timeline`.
  - Timeline scale locked to `day` granularity — hours are never shown, dates always visible even at max zoom-in.
  - Clicking a timeline item dispatches `navigate-to-scene` to open the corresponding scene in the Editor.
  - Free/Locked view toggle: "Vista Libre" (grey, free zoom persists) vs "Vista Bloqueada" (gold, auto-fits on navigation). State saved in `localStorage`.
- **Nexus → Compendium navigation**: Double-clicking any graph node (2D or 3D) fires a `navigate-to-compendium-item` event. `CompendiumView` listens and opens the entity's edit panel automatically.
- **Theme-adaptive Nexus UI**: All floating elements (graph tooltip, timeline grids, view-selector buttons, error card) now use CSS variable tokens, adapting to all 4 themes (Dark, Light/Modern, Sepia, Nordic).
- **Encrypted `.lwrt` export**: Optional password protection when exporting projects. Password prompt with "leave blank for no encryption" UX. Wrong-password import flow shows a dedicated re-prompt modal.
- **Dynamic app version** via `__APP_VERSION__`: `vite.config.js` reads `package.json` at build time and exposes the version globally; `App.jsx` renders it from `utils/version.js` instead of a hardcoded i18n key.
- **i18n — new keys**: Added `exportar`, `importar`, `error_titulo` blocks (EN/ES) for encrypted export/import flows. Relation labels in Nexus (`rel_relacion`, `rel_asociado`, `rel_portador`, `rel_contiene`, `rel_menciona`) are now fully translated.

### Changed
- **Graph node click**: Single click now zooms to x4 and centers on the node (2D); double-click navigates to Compendium.
- **Timeline `selectable: true`**: Re-enabled selection on the timeline with proper `.off('select')` cleanup to prevent duplicate listeners.
- **3D particle pulse**: `linkDirectionalParticleColor` now uses a live `Math.sin(Date.now())` calculation inside ForceGraph's own render loop for smooth, per-link pulsing without React re-renders.
- **2D background in light themes**: Graph canvas receives a subtle dark tint (`bgGraph: rgba(0,0,0,0.22)`) in light themes so node particles and labels have sufficient contrast.
- **Object owner detection** in Nexus links: Replaced locale-specific string comparison (`'Desconocido'`) with a null/empty check to avoid false positives across languages.
- **CSS — Nexus selector buttons**: Use `var(--bg-elevated)` and `var(--bg-hover)` instead of hardcoded rgba values; active tab text changed from `white` to `#1a1710` for legibility on gold accent.
- **CSS — Nexus graph tooltip**: Class renamed from `.graph-tooltip` (conflicts with library default) to `.nexus-tooltip`. Library container reset to `transparent` via `:has(> .nexus-tooltip)` selector, eliminating the dark block artifact.
- **CSS — vis-timeline grid lines**: Now use `var(--border)` / `var(--border-accent)` instead of hardcoded rgba white values.
- **CSS — CustomDatePicker popup**: Background changed from hardcoded dark rgba to `var(--bg-surface)`; shadow softened to `0 10px 40px rgba(0,0,0,0.15)` for light theme compatibility.
- **App error modals**: Replaced `alert()` calls in cloud restore / import error paths with the proper `openModal('alert', ...)` pattern.
- **`showCurrentTime: false`** on timeline to avoid the red "now" line appearing at wrong dates for fictional timelines.
- **`cooldownTicks: 80`** added to 2D ForceGraph to let the physics simulation settle faster.

### Fixed
- **Timeline hours bug**: Timeline was reverting to show hourly grid after refactoring. Fixed by setting `timeAxis: { scale: 'day', step: 1 }` and providing explicit `format.minorLabels/majorLabels` for all sub-day scales.
- **Graph tooltip dark block**: Library's default `.graph-tooltip` container was painting a black background on top of our styled panel. Fixed with a CSS nuclear reset using the `:has()` selector.
- **Stale 3D node labels after theme change**: `nodeObjectCache` is now cleared on `currentTheme` change, forcing label texture regeneration with the correct colors.
- **`clickTracker` ref order**: Moved `useRef` declaration to the top of the component (before early returns) to comply with React's Rules of Hooks.
- **`WRONG_PASSWORD` import error**: Added dedicated re-prompt modal branch for wrong password on `.lwrt` import, instead of silently swallowing the error.

---

## [LoneWriter v1.8-glassmorphism] - 2026-04-25

### Added
- **Premium Typography**: New curated font selector in Settings > Interface:
  - Sans (Inter): Maximum clarity
  - Serif (Playfair Display): Classic novel feel
  - Mono (JetBrains Mono): Technical precision
  - Typewriter (Special Elite): Vintage writing machine aesthetic
- **Custom Themes with Personality**: Added 2 new themes (4 total):
  - **Classic Dark** (default): Warm gold accents on dark gray
  - **Modern Light**: Clean cream manuscript
  - **Sepia Memoir** (NEW): Vintage paper tones with antique gold
  - **Nordic Night** (NEW): Deep icy blues and aurora accents
- **Dynamic Background (Anti-Fatigue)**: Animated color blobs that drift slowly behind the interface. Subtle, calming movement to reduce visual fatigue during long writing sessions. Theme-specific colors - cool tones for dark themes, warm tones for light themes. Toggle in Settings > Interface.
- **Glassmorphism Interface Effects**: Added frosted glass effect (blur + transparency) to modals, panels, and floating elements. Implemented for all themes with theme-specific opacity levels.
- **Smooth Animations**: Fluid transitions with spring easing for:
  - AI Panel open/close
  - Settings Modal open/close
  - View changes (Editor ↔ Compendium ↔ Resources)
  - Sidebar collapse
- **Combined Reasoning Engine (Anaphora Resolution)**: Replaced the previous Saliency Engine with a new multi-component approach:
  - **RAG (Compendium)**: Sends all relevant entries detected in the current paragraph to the Oracle.
  - **Previous Context**: Sends previous paragraphs so the AI knows what is being discussed and who is who.
  - **POV (Point of View)**: Reminds the AI who the narrator is.
  - **Continuity Instructions**: The Oracle prompt is specifically designed to use this information and detect contradictions (e.g., if RAG says "Markus is a wolf" but the text says "Markus is an elf", the Oracle will detect it thanks to this connection).
- **Font Size Control**: New +/- buttons in the editor toolbar to adjust text size (12-28px). Preference persists in database.
- **AI-Powered Entity Merging**: New feature to detect and unify duplicate or similar entities in the Compendium.
  - **Similarity Detection**: Scans for entries with similar names or descriptions.
  - **Intelligent Combination**: The AI automatically merges traits, descriptions, and relationships from multiple entries into a single cohesive one.

---

## [LoneWriter v1.7-anaphora] - 2026-04-18

### Added
- **Saliency Engine (Anaphoras)**: Real-time detection of pronouns and their references (coreferences) in the Oracle tab. Helps maintain consistency in complex scenes with multiple characters.
- **Language Quick Goal**: New "Globe" icon in the Rewrite panel to quickly translate or adjust the linguistic register of a paragraph.
- **Context-aware Rewriting**: New toggle to include the previous paragraph as context for the AI, ensuring better stylistic and narrative continuity when rewriting.
- **Oracle UI Redesign**: Redesigned the "Detected Entities" and "Saliency Engine" sections into symmetric, collapsible panels with internal scrolling and coreference counters.
- **Resizable Side Panels**: Added mouse-drag resizing for both the AI panel and the Narrative Structure panel with persistent layout constraints.

### Changed
- **Saliency Prompt Optimization**: Grouped detections by pronoun (e.g., "«she» could refer to Megan or Clara") to reduce token usage and improve AI clarity.
- **Prompt Injection Logic**: Enhanced the Oracle prompt with a maximum cap of 20 pronouns to prevent context window bloat in extremely long scenes.
- **Internationalization**: Updated `ai` locales (EN/ES) with new keys for saliency engine headers and language goal descriptions.

### Fixed
- **Language Goal Default Prompt**: Fixed an issue where the default prompt was not loading when selecting the Language goal for the first time.
- **Oracle Scroll Issues**: Long lists of detected entities or anaphoras no longer overflow the AI panel; they now stay within scrollable containers.

## [LoneWriter v1.6-stopwords] - 2026-04-12

### Added
- **New "Interface" Settings Tab**: reorganized Settings into 4 tabs: Cloud & Backup, Artificial Intelligence, Interface, and General. Language and Theme selectors moved to new Interface tab.
- **Clear Cache & Reload Button**: New option in Settings > General to clear Service Worker cache and localStorage preferences. Equivalent to "Ctrl+F5" in desktop browsers - helps resolve loading issues on Android PWAs. Includes confirmation warning to sync with Google Drive or export before using.
- **Category Selector in Compendium**: When editing Compendium entries (characters, locations, objects, lore), now you can change the category using icon buttons. Useful for fixing MPC misclassifications or reorganizing entries.
- **Typing Effect on Welcome Screen**: Subtitle "Your personal space to bring great stories to life." now displays with a typing animation and blinking cursor like a typewriter.
- **Fixed Toolbar Sticky**: Editor toolbar (B I H1 H2 ...) now stays fixed at top while scrolling through long scenes. Fixed scroll container overflow issue.
- **AI Provider Configurations in Dexie**: Each AI provider's configuration (API key, model, server URL) is now stored persistently in the Dexie database (`aiProviderConfigs` table). Switching between providers no longer loses your settings.
- **Test Connection Button** (⚡ Zap): New button in Settings > AI tab to test API connectivity. Shows success/error status with translated messages for all providers (OpenAI, Google Gemini, Anthropic, OpenRouter, Local).
- **Oracle Filtered Words Interface**: Reorganized stopwords management in Resources view. Default/system words are now pinned in a dedicated "System File" card, and custom stopwords can be managed via an edit modal.

### Changed
- **MPC "Edit" Flow Improved**: When editing a proposed entity from MPC, now it first saves the entry, then opens the edit panel. Previously it tried to edit a non-existent entry which failed.
- **PWA Settings Reorganization**: Settings modal now organized into 4 tabs with better grouping: Cloud (backup), AI (providers), Interface (language/theme), General (app info + cache).
- **AI Settings Persistence**: Configuration now persists in IndexedDB (Dexie) instead of localStorage.
- **Stopwords UX**: Moved custom stopword management from a static section to a system-fictional file card in the Resources list for better consistency.

### Fixed
- **OpenRouter Connection**: Fixed connection test for OpenRouter by adding mandatory headers (`HTTP-Referer`, `X-Title`). Updated connection flow to test both API key and model availability.
- **Connection Test Flow**: Standardized AI provider connection tests (OpenAI, Google, Anthropic, OpenRouter) to verify both key and model before reporting success.
- **Typing Effect Bug**: Fixed first character disappearing issue when typing effect animation ran. Now preserves all characters correctly.
- **Compendium Category Change**: Fixed category change not working when editing an existing entry. Now properly deletes from old table and creates in new table.
- **AI Config Loading**: Fixed issue where switching providers would lose other providers' settings. Now each provider's config loads correctly.

## [LoneWriter v1.5-compendium (Stable)] - 2026-04-10

### Added
- **RAG (Retrieval-Augmented Generation)**: Vector-based semantic search engine for the Oracle and Compendium AI features. Embeddings stored in IndexedDB using Transformers.js (`ort-wasm-simd`), enabling context-aware queries without external APIs.
- **MPC (Compendium Proposal Monitor)**: As you write, the app automatically detects potential new entities (characters, places, objects, lore). A non-intrusive purple panel suggests adding them to your Compendium with one click.
- **Local AI Server Support**: New provider option for Ollama and LM Studio local models with configurable base URL (e.g., `http://localhost:1234/v1`).
- **Theme Switcher**: Toggle between dark mode ("Classic") and light mode ("Modern Manuscript") in Settings > General. Theme persists in localStorage.
- **Cloud Backup Check on Link**: When linking a Google Drive account, automatically checks if a backup exists and prompts to restore if found.
- **Google Drive Version History**: Button to view and restore previous backup versions from Google Drive's native revision system.
- **Console Logs**: Added debug logs for all major AI operations (Rewrite, Debate, Oracle, RAG, Compendium AI) to help troubleshoot.

### Changed
- **Google Drive Sync**: Backups now use Google Drive's native revision system for version history.
- **UI Improvements**: Smaller theme selector buttons with bicolor circles representing each theme. Merged sync toggle and security info into single box. Moved links section to Cloud tab.
- **Database Optimization**: Added compound index `[novelId+sceneId]` to `lastRewrite` table for faster queries (Dexie.js v10 schema).
- **Tooltips**: Added custom Tooltip component to all cloud sync buttons in Settings.

### Fixed
- **Last Rewrite queries**: Added missing compound index to prevent performance warnings in console.
- **Cloud restore race condition**: Added `isRestoring` flag and `cloudCheckInProgress` to prevent duplicate restorations.
- **Character relationship sync**: Bidirectional relationship changes now properly propagate to both character sheets.

### CSS
- **New files**: `ragWorker.js` (web worker for embeddings), extended `Compendium.css` for MPC panel.
- **Theme support**: Added light theme CSS variables in `index.css` (`--theme-light` data attribute).
- **SettingsModal.css**: Updated theme selector styling with bicolor circles.

---

## [LoneWriter v1.4-multilingual (Stable)] - 2026-04-04

### Added
- **Viewport meta responsive**: Support `safe-area-inset` for notch/bars on mobile devices
- **Drawer navigation on mobile**: Hamburger menu for sidebar on screens <768px
- **Collapsible tree panel**: Narrative tree view as drawer on mobile
- **Internationalization system (i18n)**: Complete implementation with `i18next` and `react-i18next` — entire interface translated to **Spanish** and **English**
- **Language selector**: Dropdown in Settings > General with `Español` / `English`, automatic persistence in `localStorage`
- **Structured JSON dictionaries**: 7 namespaces (`common`, `app`, `editor`, `compendium`, `resources`, `ai`, `settings`) with ~400+ keys per language
- **Compressed export (.lwrt)**: Projects exported in gzip compressed + base64 format with `LWRT_V1` header, unreadable in text editor
- **Backward compatibility in import**: Importer automatically detects old (plain JSON) and new (compressed) `.lwrt` files
- **Oracle correction check persistence**: The "corrected/pending" state is now saved in IndexedDB (`isCorrected` field in `oracleEntries`)
- **Traffic light text change in Oracle**: "Párrafo coherente" → "Sin coincidencias halladas"

### Changed
- **Editor full-width on mobile**: Occupies full width, tree view hidden by default on <768px
- **Optimized touch targets**: Touch targets and responsive typography across all views
- **Badges → colored dots**: Status badges on scene rows displayed as colored dots on mobile
- **Styled debate button**: Uppercase + letter-spacing for new session button
- **Complete versioning**: `v1.3-oráculo` → `v1.4-multilingual` throughout the application
- **Compression with pako**: Replaced `CompressionStream` (non-universal native API) with `pako` for gzip compression compatible with all browsers
- **Google Drive sync**: Backups now upload in compressed format (`application/octet-stream`)
- **Export error handling**: `handleExportProject` is now async with `try/catch` and visible error alert
- **Bidirectional relationship sync**: Rewritten character relationship logic so changes are correctly reflected in both sheets
- **AI panel tabs**: Translated to `Reescribir` / `Debate` / `Oráculo` (ES) and `Rewrite` / `Debate` / `Oracle` (EN)

### Fixed
- **Duplicate word counting**: Fixed in chapter accordion
- **Security hint**: Syntax `<0>` replaced by `<strong>` in EN/ES (Settings)
- **Stack overflow in compression**: `btoa(String.fromCharCode(...array))` caused error with large data; replaced with chunk-based conversion of 8192 bytes
- **Duplicate tabs in AIPanel**: Removed duplicate Debate and Oracle tabs from previous edits
- **`<Trans>` without namespace**: Fixed `bienvenida.creditos` adding `ns="app"` to Trans component
- **Character relationships not synchronized**: Previous diffing logic didn't propagate `type`/`reverseType` changes to the other character

### UI Enhancements
- **Goals editor**: Golden border + glow + active dot indicator
- **Goals templates**: Chapter range (cap./ch.), 3-line layout (wds./pal.)
- **Continuous numbering**: Chapters numbered globally across all acts

### CSS
- **New files**: `Editor.css` (+337), `Compendium.css` (+189), `Resources.css` (+81)
- **Updated**: App.css, AIPanel.css, RichEditor.css, Sidebar.css, SettingsModal.css
- **LanguageSelector.css**: New component with styled language dropdown
- **AIPanel.css**: More compact debate session selector (`max-width: 140px`), text truncated to `90px`, dropdown expanded to `300px`, items font reduced to `11px`

---

## [LoneWriter v1.3-oráculo (Stable)] - 2026-04-02

### Added
- **Tooltip system**: New `Tooltip.jsx` component replaces native `title` attributes throughout the UI (Sidebar, AIPanel, Editor, Compendium, App topbar) for consistent and enriched tooltips
- **Markdown rendering**: Integration of `renderMarkdown` in AI panel — rewrites, debate messages and Oracle verdicts now display Markdown formatting (bold, lists, headings)
- **Oracle entity exclusion**: New `ignoredForOracle` field in characters, places, objects and lore entries to exclude them from coherence analysis
- **"AI Context" badges**: Visual indicator on Compendium cards showing which entities are active for coherence analysis
- **Auto-renaming of debate sessions**: When creating a new debate from a scene, the session is automatically renamed with chapter number and scene title
- **Node state persistence**: Expansion/collapse state of acts, chapters and scenes is saved per novel in IndexedDB (`uiExpanded`)
- **Enriched tooltips in Oracle**: Detected entity labels show detailed information (name, type, detected words) on hover
- **New `utils/renderMarkdown.js` utility**: Lightweight Markdown parser for the app
- **`fetchDetectedEntityData` function**: Replaces previous semantic search with direct data from detected entities in the compendium

### Changed
- **Complete versioning**: `v1.2-cloud` → `v1.3-oráculo` in Sidebar, App.jsx footer, SettingsModal (sync and "Application Information" section), and README.md
- **Improved Cloud Sync**: Race condition protection with `cloudCheckInProgress`, direct `localStorage` reading to avoid timing issues, 5s tolerance in cloud version detection
- **`refreshAfterRestore()`**: New function to reload UI after restoring from cloud without needing `window.location.reload()`
- **Confirmation when discarding rewrite**: Confirmation modal before permanently deleting a rewrite
- **Statistics collapsed by default**: The editor statistics panel now appears collapsed on startup
- **Improvements in `entityDetector.js`**: Refactored and optimized entity detection logic
- **Improvements in `compendiumSearch.js`**: Integration with `fetchDetectedEntityData` for compendium context

### Fixed
- **Race condition in cloud restore**: Double protection with `isRestoring` flag and `cloudCheckInProgress` to prevent duplicate restorations
- **Cloud sync overwriting prevention**: 5-second tolerance to avoid false positives when detecting newer versions in the cloud
- **Load reordering in `switchNovel`**: `reloadData` now executes before `setActiveNovel` to avoid inconsistencies

### CSS
- **AIPanel.css**: New styles for rewrite spinner, tooltips, and improved layout
- **Resources.css**: New file with styles for Resources view
- **Editor.css**: Styles for Oracle traffic light, tooltips, and tree header layout
- **Compendium.css**: Styles for ignored cards (`card--ignored`), AI Context badges, and active zap button