# Changelog

## [LoneWriter v1.4-multilingual (Stable)] - 2026-04-03

### Added
- **Internationalization system (i18n)**: Complete implementation with `i18next` and `react-i18next` — entire interface translated to **Spanish** and **English**
- **Language selector**: Dropdown in Settings > General with `Español` / `English`, automatic persistence in `localStorage`
- **Structured JSON dictionaries**: 7 namespaces (`common`, `app`, `editor`, `compendium`, `resources`, `ai`, `settings`) with ~400+ keys per language
- **Compressed export (.lwrt)**: Projects exported in gzip compressed + base64 format with `LWRT_V1` header, unreadable in text editor
- **Backward compatibility in import**: Importer automatically detects old (plain JSON) and new (compressed) `.lwrt` files
- **Oracle correction check persistence**: The "corrected/pending" state is now saved in IndexedDB (`isCorrected` field in `oracleEntries`)
- **Traffic light text change in Oracle**: "Párrafo coherente" → "Sin coincidencias halladas"

### Changed
- **Complete versioning**: `v1.3-oráculo` → `v1.4-multilingual` throughout the application
- **Compression with pako**: Replaced `CompressionStream` (non-universal native API) with `pako` for gzip compression compatible with all browsers
- **Google Drive sync**: Backups now upload in compressed format (`application/octet-stream`)
- **Export error handling**: `handleExportProject` is now async with `try/catch` and visible error alert
- **Bidirectional relationship sync**: Rewritten character relationship logic so changes are correctly reflected in both sheets
- **AI panel tabs**: Translated to `Reescribir` / `Debate` / `Oráculo` (ES) and `Rewrite` / `Debate` / `Oracle` (EN)

### Fixed
- **Stack overflow in compression**: `btoa(String.fromCharCode(...array))` caused error with large data; replaced with chunk-based conversion of 8192 bytes
- **Duplicate tabs in AIPanel**: Removed duplicate Debate and Oracle tabs from previous edits
- **`<Trans>` without namespace**: Fixed `bienvenida.creditos` adding `ns="app"` to Trans component
- **Character relationships not synchronized**: Previous diffing logic didn't propagate `type`/`reverseType` changes to the other character

### CSS
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