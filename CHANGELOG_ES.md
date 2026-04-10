# Changelog

<div align="center">

[También disponible en Inglés](./CHANGELOG.md)

</div>

## [LoneWriter v1.5-compendio (Stable)] - 2026-04-10

### Added
- **RAG (Retrieval-Augmented Generation)**: Motor de búsqueda semántica basado en vectores para el Oráculo y las funciones de IA del Compendium. Embeddings almacenados en IndexedDB usando Transformers.js (`ort-wasm-simd`), permitiendo consultas contextuales sin APIs externas.
- **MPC (Monitor de Propuestas del Compendio)**: Mientras escribes, la app detecta automáticamente potenciales nuevas entidades (personajes, lugares, objetos, lore). Un panel morado no intrusivo sugiere añadirlas al Compendio con un clic.
- **Servidor IA Local**: Nueva opción de proveedor para modelos locales de Ollama y LM Studio con URL base configurable (ej. `http://localhost:1234/v1`).
- **Selector de Tema**: Alternar entre modo oscuro ("Clásico") y modo claro ("Manuscrito Moderno") en Configuración > General. El tema se guarda en localStorage.
- **Verificación de Backup en Vinculación**: Al vincular una cuenta de Google Drive, comprueba automáticamente si existe un backup y propone restaurarlo si lo encuentra.
- **Historial de Versiones de Google Drive**: Botón para ver y restaurar versiones anteriores de los backups usando el sistema de revisiones nativo de Google Drive.
- **Logs de Consola**: Añadidos logs de debug para todas las operaciones principales de IA (Reescribir, Debate, Oráculo, RAG, Compendium IA) para facilitar la resolución de problemas.

### Changed
- **Sincronización Google Drive**: Los backups ahora usan el sistema de revisiones nativo de Google Drive para tener historial de versiones.
- **Mejoras UI**: Botones selectors de tema más pequeños con círculos bicolor representando cada tema. Fusionados el toggle de sincronización y la info de seguridad en una sola caja. Movida la sección de enlaces a la pestaña Nube.
- **Optimización de Base de Datos**: Añadido índice compuesto `[novelId+sceneId]` a la tabla `lastRewrite` para consultas más rápidas (schema Dexie.js v10).
- **Tooltips**: Añadido componente Tooltip personalizado a todos los botones de sincronización en nube de Configuración.

### Fixed
- **Consultas de Last Rewrite**: Añadido índice compuesto faltante para evitar warnings de rendimiento en consola.
- **Condición de carrera en restauración cloud**: Añadido flag `isRestoring` y `cloudCheckInProgress` para prevenir restauraciones duplicadas.
- **Sincronización de relaciones de personajes**: Los cambios bidireccionales de relaciones ahora se propagan correctamente a ambas fichas.

### CSS
- **Nuevos archivos**: `ragWorker.js` (web worker para embeddings), extendido `Compendium.css` para el panel MPC.
- **Soporte de tema**: Añadidas variables CSS de tema claro en `index.css` (data attribute `--theme-light`).
- **SettingsModal.css**: Actualizado el estilo del selector de tema con círculos bicolor.

---

## [LoneWriter v1.4-multilenguaje (Stable)] - 2026-04-04

### Added
- **Viewport meta responsive**: Soporte `safe-area-inset` para notch/bars de dispositivos móviles
- **Drawer navigation en móvil**: Menú hamburguesa para sidebar en pantallas <768px
- **Panel de árbol colapsable**: Tree view del árbol narrativo como drawer en móvil
- **Sistema de internacionalización (i18n)**: Implementación completa con `i18next` y `react-i18next` — toda la interfaz traducida a **Español** e **Inglés**
- **Selector de idioma**: Dropdown en Configuración > General con `Español` / `English`, persistencia automática en `localStorage`
- **Diccionarios JSON estructurados**: 7 namespaces (`common`, `app`, `editor`, `compendium`, `resources`, `ai`, `settings`) con ~400+ claves por idioma
- **Exportación comprimida (.lwrt)**: Los proyectos se exportan en formato gzip comprimido + base64 con header `LWRT_V1`, ilegibles en editor de texto
- **Compatibilidad hacia atrás en importación**: El importador detecta automáticamente archivos `.lwrt` antiguos (JSON plano) y nuevos (comprimidos)
- **Persistencia del check de corrección del Oráculo**: El estado de "corregido/pendiente" ahora se guarda en IndexedDB (campo `isCorrected` en `oracleEntries`)
- **Cambio de texto en semáforo del Oráculo**: "Párrafo coherente" → "Sin coincidencias halladas"

### Changed
- **Editor full-width en móvil**: Ocupa todo el ancho, tree view oculto por defecto en <768px
- **Touch targets optimizados**: Targets táctiles y tipografía responsive en todas las vistas
- **Badges → puntos de color**: Status badges en filas de escenas se muestran como puntos coloreados en móvil
- **Botón de debate estilizado**: Uppercase + letter-spacing para el botón de nueva sesión
- **Versionado completo**: `v1.3-oráculo` → `v1.4-multilenguaje` en toda la aplicación
- **Compresión con pako**: Reemplazada `CompressionStream` (API nativa no universal) por `pako` para compresión gzip compatible con todos los navegadores
- **Sincronización con Google Drive**: Los backups ahora se suben en formato comprimido (`application/octet-stream`)
- **Manejo de errores en exportación**: `handleExportProject` ahora es async con `try/catch` y alerta de error visible
- **Sincronización bidireccional de relaciones**: Reescrita la lógica de relaciones entre personajes para que los cambios se reflejen correctamente en ambas fichas
- **Tabs del panel IA**: Traducidas a `Reescribir` / `Debate` / `Oráculo` (ES) y `Rewrite` / `Debate` / `Oracle` (EN)

### Fixed
- **Conteo duplicado de palabras**: Corregido en acordeón de capítulo
- **Hint de seguridad**: Sintaxis `<0>` reemplazada por `<strong>` en EN/ES (Settings)
- **Stack overflow en compresión**: `btoa(String.fromCharCode(...array))` causaba error con datos grandes; reemplazado por conversión chunk-based de 8192 bytes
- **Tabs duplicadas en AIPanel**: Eliminadas pestañas duplicadas de Debate y Oráculo que quedaban de ediciones anteriores
- **`<Trans>` sin namespace**: Corregido `bienvenida.creditos` añadiendo `ns="app"` al componente Trans
- **Relaciones de personajes no sincronizadas**: La lógica de diffing anterior no propagaba cambios de `type`/`reverseType` al otro personaje

### UI Enhancements
- **Editor de Goals**: Borde dorado + glow + indicador de dot activo
- **Templates de Goals**: Rango de capítulos (cap./ch.), layout de 3 líneas (wds./pal.)
- **Numeración continua**: Capítulos numerados de forma global a través de todos los actos

### CSS
- **Nuevos archivos**: `Editor.css` (+337), `Compendium.css` (+189), `Resources.css` (+81)
- **Actualizados**: App.css, AIPanel.css, RichEditor.css, Sidebar.css, SettingsModal.css
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