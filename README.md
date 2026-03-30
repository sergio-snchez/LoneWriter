# LoneWriter v1.1-cloud 🖋️ (Beta)

![LoneWriter Banner](banner-lonewriter.png)

> **Tu compañero inteligente para escribir grandes historias.**
>
> 🌐 **Versión Web/PWA:** [lonewriter.vercel.app](https://lonewriter.vercel.app/)
>
> 💻 **Versión de Escritorio (Windows):** [Descargar Instalador (.exe)](https://github.com/sergio-snchez/LoneWriter/releases/latest)
>
> ☕ **Apoya el proyecto:** [Invítame a un café](https://buymeacoffee.com/sergio.snchez)

LoneWriter es una aplicación minimalista y potente diseñada para escritores que buscan un entorno zen pero con capacidades de inteligencia artificial de última generación. Gestiona tu estructura narrativa, crea un compendio detallado de tu mundo y recibe ayuda de asistentes literarios expertos, todo en un solo lugar.

## ✨ Características Principales

### 📖 Estructura Narrativa Dinámica
- **Jerarquía Clave:** Organiza tu novela en Actos, Capítulos y Escenas de forma fluida.
- **Enfoque Zen:** Interfaz limpia diseñada para minimizar las distracciones y maximizar la creatividad.
- **Estadísticas en Tiempo Real:** Controla tu progreso de palabras y objetivos diarios.

### 🧠 Asistente de IA Integrado
- **Múltiples Modelos:** Soporte para Gemini, GPT-4o, Claude 3.5 y modelos locales (LM Studio/Ollama).
- **Herramientas Literarias:** Reescribe escenas, ajusta el tono, mejora el ritmo o cambia el punto de vista (POV) con un clic.
- **Debate Creativo:** Interactúa con agentes especializados (Editor, Crítico, Corrector) para pulir tu manuscrito.

### 📚 Compendio y Lore
- **Biblioteca de Personajes:** Fichas detalladas con rasgos, motivaciones y arcos.
- **Construcción de Mundo:** Gestiona lugares, objetos clave y reglas de tu universo.
- **Base de Conocimiento:** Sube archivos de referencia (PDF, TXT, MD) para que la IA los use como contexto.

### 💾 Portabilidad y Sincronización en la Nube **(¡Novedad!)**
- **Cloud Sync:** Conexión nativa con **Google Drive** para respaldos automáticos y persistencia contra borrado de caché.
- **Sin Costes Ocultos:** Tus datos son tuyos. Se guardan localmente (IndexedDB) y opcionalmente en tu propio espacio personal de Google.
- **Exportación Versátil:** Descarga tu proyecto completo en formato `.lwrt` o genera un documento de Word (`.docx`) listo para enviar a editoriales.
- **Multiplataforma:** Úsalo como aplicación de escritorio (Electron), instálalo como PWA o accede vía web.

## 🛠️ Tecnologías

- **Frontend:** React + Vite
- **Base de Datos:** Dexie.js (IndexedDB)
- **Estilos:** Vanilla CSS (Aesthetic Minimalist)
- **Escritorio:** Electron
- **Despliegue:** Vercel (PWA ready)
- **Iconos:** Lucide React

## 🚀 Instalación y Desarrollo

Para ejecutar el proyecto localmente:

1. Clona el repositorio:
   ```bash
   git clone https://github.com/sergio-snchez/LoneWriter.git
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Ejecuta el servidor de desarrollo:
   ```bash
   npm run dev
   ```
4. Para la versión de escritorio (Electron):
   ```bash
   npm run electron:dev
   ```

## 📜 Créditos

Diseñado y desarrollado con ♥ por **Sergio Sánchez** con Antigravity.

---
*LoneWriter v1.1-cloud - Tu obra, siempre protegida y asistida por IA.*
