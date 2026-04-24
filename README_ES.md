![LoneWriter Banner](app/public/banner-lonewriter.png)

<div align="center">

[También disponible en Inglés](./README.md)

</div>

# LoneWriter v1.7-anáfora 🖋️

> **Tu "Sistema Operativo Narrativo": La IA que te escucha, organiza tu caos y vigila la coherencia de tu mundo mientras tú solo te preocupas de escribir.**
>
> 🏠 **Web Oficial:** [getlonewriter.vercel.app](https://getlonewriter.vercel.app/)
>
> 🌐 **Web App:** [lonewriter.vercel.app](https://lonewriter.vercel.app/)
>
> ☕ **Apoya el proyecto:** [Invítame a un café](https://buymeacoffee.com/sergio.snchez)

LoneWriter es una aplicación minimalista y potente diseñada para escritores que buscan un entorno zen pero con capacidades de **IA Invisible** de última generación. Gestiona tu estructura narrativa, crea un compendio detallado de tu mundo y recibe ayuda de asistentes literarios expertos, todo desde tu navegador o instalado como una aplicación nativa gracias a su tecnología PWA.

## ✨ Características Principales

### 🌍 Multilenguaje (i18n)
- **Español e Inglés:** Interfaz completamente traducida con selector de idioma en Configuración > General.
- **Persistencia:** La preferencia de idioma se guarda automáticamente en `localStorage`.
- **Arquitectura extensible:** Sistema basado en i18next con diccionarios JSON, listo para añadir más idiomas.

### 📖 Estructura Narrativa Dinámica
- **Jerarquía Clave:** Organiza tu novela en Actos, Capítulos y Escenas de forma fluida.
- **Enfoque Zen:** Interfaz limpia diseñada para minimizar las distracciones y maximizar la creatividad.
- **Estadísticas en Tiempo Real:** Controla tu progreso de palabras y objetivos diarios.
- **Responsive Design:** Interfaz optimizada para móviles y tablets con navegación drawer, targets táctiles y paneles colapsables.
- **Selector de Categoría:** Cambia rápidamente la categoría (Personaje, Lugar, etc.) de las entradas del compendio.

### 🤖 IA Invisible y Monitor de Lore (MPC)
- **MPC (Monitor de Propuestas del Compendio):** Adiós a la "burocracia del mundo". LoneWriter te escucha mientras escribes y detecta automáticamente nuevas entidades (personajes, lugares, objetos). Las sugiere en un panel lila no intrusivo para que las añadas al compendio con un clic, sin dejar de narrar.
- **Autocompletado Mágico:** ¿Has mencionado una espada o un pueblo nuevo? Usa el botón de destellos en el Compendio para que la IA escanee tu novela y rellene automáticamente la descripción, rasgos y relaciones de la ficha por ti.
- **Motor RAG (all-MiniLM-L6-v2):** Búsqueda semántica potenciada por embeddings locales (Transformers.js). Tu novela completa se vectoriza en el navegador — consultas contextuales sin APIs externas, manteniendo tus datos privados.
- **Veredictos del Oráculo (Continuity Linter):** Análisis de coherencia párrafo a párrafo. Actúa como un "corrector de lógica" en tiempo real que detecta contradicciones con tu lore establecido (ej: un personaje muerto que reaparece o un objeto que cambia de dueño por error).
- **Palabras Filtradas (Stopwords):** Gestiona términos personalizados en la sección Recursos para refinar la detección de entidades y el análisis de coherencia.
- **Motor de Saliencia (Anáforas):** Monitorización en tiempo real de personajes y correferencias. Detecta pronombres (él, ella, ellos, etc.) y sugiere a qué personaje se refieren, ayudando a mantener la consistencia y resolver ambigüedades en escenas largas o complejas.
- **Exclusión Selectiva:** Controla qué entidades del Compendio participan en el análisis de coherencia con un clic para evitar falsos positivos en sueños o flashbacks.

### 🧠 Asistente de IA Avanzado
- **Múltiples Modelos:** Soporte para Gemini, GPT-4o, Claude 3.5 y modelos locales (LM Studio/Ollama).
- **Configuración Persistente:** Cada configuración de proveedor de IA se guarda de forma segura en la base de datos Dexie.
- **Prueba de Conexión:** Verifica tus claves API y conectividad del modelo con el nuevo botón ⚡ Probar conexión.
- **Herramientas Literarias:** Reescribe escenas, ajusta el tono, mejora el ritmo o cambia el punto de vista (POV) con inteligencia contextual.
- **Objetivo de Idioma:** Nuevo objetivo rápido de reescritura con icono de Globo. Traduce párrafos o cambia el registro lingüístico (formal, informal, variantes locales) con un clic.
- **Continuidad Contextual:** Opción para incluir el párrafo anterior al reescribir para asegurar que la IA mantenga el flujo estilístico y narrativo.
- **Sistema de Debate:** Múltiples agentes IA debutan entre sí sobre tu escena con rondas configurables y sesiones persistentes para Feedback crítico profundo.

### 📚 Compendio y Lore
- **Biblioteca de Personajes:** Fichas detalladas con rasgos, motivaciones y arcos.
- **Construcción de Mundo:** Gestiona lugares, objetos clave y reglas de tu universo.
- **Base de Conocimiento:** Sube archivos de referencia (TXT, MD, CSV, JSON) para que la IA los use como contexto.

### 💾 Portabilidad y Sincronización
- **Cloud Sync:** Conexión nativa con **Google Drive** para respaldos automáticos y persistencia total.
- **Privacidad Primero:** Tus datos se guardan localmente (IndexedDB) y opcionalmente en tu propio espacio personal de Google.
- **Exportación Comprimida:** Descarga tu proyecto completo en formato `.lwrt` comprimido con gzip (ilegible en texto plano) o genera un documento de Word (`.docx`).
- **Compatibilidad hacia atrás:** El importador detecta automáticamente archivos `.lwrt` antiguos (JSON plano) y nuevos (comprimidos).
- **Gestión de Ajustes:** Interfaz organizada con pestañas dedicadas para ajustes de Nube, IA, Interfaz y General. Limpia la caché y restablece preferencias fácilmente.

## 🛠️ Tecnologías

- **Core:** React + Vite
- **Base de Datos:** Dexie.js (IndexedDB)
- **Motor RAG:** Transformers.js (all-MiniLM-L6-v2) — embeddings locales en navegador
- **i18n:** i18next + react-i18next
- **Compresión:** pako (gzip)
- **PWA:** Vite PWA Plugin (Service Workers, Offline support)
- **Sincronización:** Google Drive API (GSI)
- **Despliegue:** Vercel

## 🚀 Instalación y Desarrollo Local

Si deseas probar LoneWriter en tu propio entorno:

1. Clona el repositorio:
   ```bash
   git clone https://github.com/sergio-snchez/LoneWriter.git
   ```
2. Instala las dependencias:
   ```bash
   npm run install:app
   ```
3. Ejecuta el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## 📜 Créditos

Diseñado y desarrollado con ♥ por **Sergio Sánchez** con Antigravity.

---

*LoneWriter v1.7-anáfora - Tu espacio personal para dar vida a grandes historias.*

---

<div align="center">

[También disponible en Inglés](./README.md)

</div>