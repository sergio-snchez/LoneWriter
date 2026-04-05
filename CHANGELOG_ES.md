# Changelog

<div align="center">

[También disponible en Inglés](./CHANGELOG.md)

</div>

## [LoneWriter v1.4-multilenguaje (Stable)] - 2026-04-03

### Added
- **Sistema de internacionalización (i18n)**: Implementación completa con `i18next` y `react-i18next` — toda la interfaz traducida a **Español** e **Inglés**
- **Selector de idioma**: Dropdown en Configuración > General con `Español` / `English`, persistencia automática en `localStorage`
- **Diccionarios JSON estructurados**: 7 namespaces (`common`, `app`, `editor`, `compendium`, `resources`, `ai`, `settings`) con ~400+ claves por idioma
- **Exportación comprimida (.lwrt)**: Los proyectos se exportan en formato gzip comprimido + base64 con header `LWRT_V1`, ilegibles en editor de texto
- **Compatibilidad hacia atrás en importación**: El importador detecta automáticamente archivos `.lwrt` antiguos (JSON plano) y nuevos (comprimidos)
- **Persistencia del check de corrección del Oráculo**: El estado de "corregido/pendiente" ahora se guarda en IndexedDB (campo `isCorrected` en `oracleEntries`)
- **Cambio de texto en semáforo del Oráculo**: "Párrafo coherente" → "Sin coincidencias halladas"

### Changed
- **Versionado completo**: `v1.3-oráculo` → `v1.4-multilenguaje` en toda la aplicación
- **Compresión con pako**: Reemplazada `CompressionStream` (API nativa no universal) por `pako` para compresión gzip compatible con todos los navegadores
- **Sincronización con Google Drive**: Los backups ahora se suben en formato comprimido (`application/octet-stream`)
- **Manejo de errores en exportación**: `handleExportProject` ahora es async con `try/catch` y alerta de error visible
- **Sincronización bidireccional de relaciones**: Reescrita la lógica de relaciones entre personajes para que los cambios se reflejen correctamente en ambas fichas
- **Tabs del panel IA**: Traducidas a `Reescribir` / `Debate` / `Oráculo` (ES) y `Rewrite` / `Debate` / `Oracle` (EN)

### Fixed
- **Stack overflow en compresión**: `btoa(String.fromCharCode(...array))` causaba error con datos grandes; reemplazado por conversión chunk-based de 8192 bytes
- **Tabs duplicadas en AIPanel**: Eliminadas pestañas duplicadas de Debate y Oráculo que quedaban de ediciones anteriores
- **`<Trans>` sin namespace**: Corregido `bienvenida.creditos` añadiendo `ns="app"` al componente Trans
- **Relaciones de personajes no sincronizadas**: La lógica de diffing anterior no propagaba cambios de `type`/`reverseType` al otro personaje

### CSS
- **LanguageSelector.css**: Nuevo componente con dropdown de idioma estilizado
- **AIPanel.css**: Selector de sesiones de debate más compacto (`max-width: 140px`), texto truncado a `90px`, dropdown ampliado a `300px`, fuente de items reducida a `11px`

---

## [LoneWriter v1.3-oráculo (Stable)] - 2026-04-02

### Added
- **Sistema de Tooltips**: Nuevo componente `Tooltip.jsx` reemplaza los atributos `title` nativos en toda la UI (Sidebar, AIPanel, Editor, Compendium, App topbar) para tooltips consistentes y enriquecidos
- **Renderizado Markdown**: Integración de `renderMarkdown` en el panel IA — reescrituras, mensajes de debate y veredictos del Oracle ahora muestran formato Markdown (negritas, listas, encabezados)
- **Exclusión de entidades del Oracle**: Nuevo campo `ignoredForOracle` en personajes, lugares, objetos y entradas de lore para excluirlos del análisis de coherencia
- **Badges "Contexto IA"**: Indicador visual en las tarjetas del Compendio mostrando qué entidades están activas para el análisis de coherencia
- **Auto-renombrado de sesiones de debate**: Al crear un debate nuevo desde una escena, la sesión se renombra automáticamente con el número de capítulo y título de escena
- **Persistencia de estado de nodos**: El estado de expansión/colapso de actos, capítulos y escenas se guarda por novela en IndexedDB (`uiExpanded`)
- **Tooltips enriquecidos en Oracle**: Las etiquetas de entidades detectadas muestran información detallada (nombre, tipo, palabras detectadas) al pasar el cursor
- **Nueva utilidad `utils/renderMarkdown.js`**: Parser de Markdown ligero para la app
- **Función `fetchDetectedEntityData`**: Reemplaza la búsqueda semántica anterior por datos directos de entidades detectadas en el compendio

### Changed
- **Versionado completo**: `v1.2-cloud` → `v1.3-oráculo` en Sidebar, App.jsx footer, SettingsModal (sincronización y sección "Información de la aplicación"), y README.md
- **Cloud Sync mejorado**: Protección contra race conditions con `cloudCheckInProgress`, lectura directa de `localStorage` para evitar problemas de timing, tolerancia de 5s en detección de versiones en la nube
- **`refreshAfterRestore()`**: Nueva función para recargar la UI tras restaurar desde la nube sin necesidad de `window.location.reload()`
- **Confirmación al descartar reescritura**: Modal de confirmación antes de eliminar permanentemente una reescritura
- **Estadísticas colapsadas por defecto**: El panel de estadísticas del editor ahora aparece colapsado al iniciar
- **Mejoras en `entityDetector.js`**: Lógica de detección de entidades refactorizada y optimizada
- **Mejoras en `compendiumSearch.js`**: Integración con `fetchDetectedEntityData` para contexto del compendio

### Fixed
- **Race condition en cloud restore**: Doble protección con `isRestoring` flag y `cloudCheckInProgress` para evitar restauraciones duplicadas
- **Prevención de sobrescritura en cloud sync**: Tolerancia de 5 segundos para evitar falsos positivos al detectar versiones más recientes en la nube
- **Reordenación de carga en `switchNovel`**: `reloadData` ahora se ejecuta antes de `setActiveNovel` para evitar inconsistencias

### CSS
- **AIPanel.css**: Nuevos estilos para spinner de reescritura, tooltips, y layout mejorado
- **Resources.css**: Archivo nuevo con estilos para la vista de Recursos
- **Editor.css**: Estilos para traffic light del Oracle, tooltips, y layout del tree header
- **Compendium.css**: Estilos para tarjetas ignoradas (`card--ignored`), badges de Contexto IA, y botón zap activo
