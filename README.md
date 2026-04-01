# LoneWriter v1.3-oraculo (beta) 🖋️

![LoneWriter Banner](banner-lonewriter.png)

> **Tu compañero inteligente para escribir grandes historias, ahora con capacidades de IA avanzadas y optimizado como PWA.**
>
> 🌐 **Acceso Web:** [lonewriter.vercel.app](https://lonewriter.vercel.app/)
>
> ☕ **Apoya el proyecto:** [Invítame a un café](https://buymeacoffee.com/sergio.snchez)

LoneWriter es una aplicación minimalista y potente diseñada para escritores que buscan un entorno zen pero con capacidades de inteligencia artificial de última generación. Gestiona tu estructura narrativa, crea un compendio detallado de tu mundo y recibe ayuda de asistentes literarios expertos, todo desde tu navegador o instalado como una aplicación nativa gracias a su tecnología PWA.

Esta versión introduce capacidades avanzadas de IA para mejorar tu proceso creativo:

## ✨ Características Principales

### 📖 Estructura Narrativa Dinámica
- **Jerarquía Clave:** Organiza tu novela en Actos, Capítulos y Escenas de forma fluida.
- **Enfoque Zen:** Interfaz limpia diseñada para minimizar las distracciones y maximizar la creatividad.
- **Estadísticas en Tiempo Real:** Controla tu progreso de palabras y objetivos diarios.

### 🧠 Asistente de IA Integrado (Oracle)
- **Múltiples Modelos:** Soporte para Gemini, GPT-4o, Claude 3.5 y modelos locales (LM Studio/Ollama).
- **Herramientas Literarias:** Reescribe escenas, ajusta el tono, mejora el ritmo o cambia el punto de vista (POV) con un clic.
- **Búsqueda Semántica Local:** Integra tu lore directamente en las consultas de IA para un contexto perfecto sin salir de la app (vía Transformers.js y Orama).

### 📚 Compendio y Lore
- **Biblioteca de Personajes:** Fichas detalladas con rasgos, motivaciones y arcos.
- **Construcción de Mundo:** Gestiona lugares, objetos clave y reglas de tu universo.
- **Base de Conocimiento:** Sube archivos de referencia (PDF, TXT, MD) para que la IA los use como contexto.

### 💾 Portabilidad y Sincronización
- **Cloud Sync:** Conexión nativa con **Google Drive** para respaldos automáticos y persistencia total.
- **Privacidad Primero:** Tus datos se guardan localmente (IndexedDB) y opcionalmente en tu propio espacio personal de Google.
- **Exportación Versátil:** Descarga tu proyecto completo en formato `.lwrt` o genera un documento de Word (`.docx`).

## 🛠️ Tecnologías

- **Core:** React + Vite
- **Base de Datos:** Dexie.js (IndexedDB)
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
*LoneWriter v1.2-cloud - Tu obra, siempre protegida y asistida por IA.*
