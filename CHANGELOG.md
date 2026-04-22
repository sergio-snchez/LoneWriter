# Changelog

<div align="center">

[Also available in Spanish](./CHANGELOG_ES.md)

</div>

## [LoneWriter v1.8] - 2026-xx-xx

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