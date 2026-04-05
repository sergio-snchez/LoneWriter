![LoneWriter Banner](banner-lonewriter.png)

<div align="center">

[También disponible en Inglés](./README.md)

</div>

# LoneWriter v1.4-multilenguaje (Stable) 🖋️

> **Tu compañero inteligente para escribir grandes historias, ahora con capacidades de IA avanzadas, optimizado como PWA y disponible en múltiples idiomas.**
>
> 🌐 **Acceso Web:** [lonewriter.vercel.app](https://lonewriter.vercel.app/)
>
> ☕ **Apoya el proyecto:** [Invítame a un café](https://buymeacoffee.com/sergio.snchez)

LoneWriter es una aplicación minimalista y potente diseñada para escritores que buscan un entorno zen pero con capacidades de inteligencia artificial de última generación. Gestiona tu estructura narrativa, crea un compendio detallado de tu mundo y recibe ayuda de asistentes literarios expertos, todo desde tu navegador o instalado como una aplicación nativa gracias a su tecnología PWA.

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

### 🧠 Asistente de IA Integrado (Oracle)
- **Múltiples Modelos:** Soporte para Gemini, GPT-4o, Claude 3.5 y modelos locales (LM Studio/Ollama).
- **Herramientas Literarias:** Reescribe escenas, ajusta el tono, mejora el ritmo o cambia el punto de vista (POV) con un clic.
- **Contexto Inteligente del Compendio:** Detecta automáticamente entidades de tu lore (personajes, lugares, objetos) y las integra en las consultas de IA para coherencia narrativa perfecta.
- **Sistema de Debate:** Múltiples agentes IA debaten entre sí sobre tu escena con rondas configurables y sesiones persistentes.
- **Veredictos del Oracle:** Análisis de coherencia párrafo a párrafo con detección de contradicciones en tiempo real.
- **Exclusión Selectiva:** Controla qué entidades del Compendio participan en el análisis de coherencia con un clic.

### 📚 Compendio y Lore
- **Biblioteca de Personajes:** Fichas detalladas con rasgos, motivaciones y arcos.
- **Construcción de Mundo:** Gestiona lugares, objetos clave y reglas de tu universo.
- **Base de Conocimiento:** Sube archivos de referencia (TXT, MD, CSV, JSON) para que la IA los use como contexto.

### 💾 Portabilidad y Sincronización
- **Cloud Sync:** Conexión nativa con **Google Drive** para respaldos automáticos y persistencia total.
- **Privacidad Primero:** Tus datos se guardan localmente (IndexedDB) y opcionalmente en tu propio espacio personal de Google.
- **Exportación Comprimida:** Descarga tu proyecto completo en formato `.lwrt` comprimido con gzip (ilegible en texto plano) o genera un documento de Word (`.docx`).
- **Compatibilidad hacia atrás:** El importador detecta automáticamente archivos `.lwrt` antiguos (JSON plano) y nuevos (comprimidos).

## 🛠️ Tecnologías

- **Core:** React + Vite
- **Base de Datos:** Dexie.js (IndexedDB)
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
   npm install
   ```
3. Ejecuta el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## 📜 Créditos

Diseñado y desarrollado con ♥ por **Sergio Sánchez** con Antigravity.

---

*LoneWriter v1.4-multilenguaje - Tu espacio personal para dar vida a grandes historias.*

---

<div align="center">

[También disponible en Inglés](./README.md)

</div>