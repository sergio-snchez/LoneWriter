# Changelog - LoneWriter

## [1.1-cloud] - 2026-03-30
### ✨ Añadido
- **Sincronización con Google Drive:** Ahora puedes vincular tu cuenta de Google Drive para realizar copias de seguridad automáticas cada 30 segundos (tras cambios) o bajo demanda.
- **Protección contra pérdida de datos:** El sistema detecta si hay una versión más reciente en la nube al iniciar y permite restaurarla.
- **Nuevo Centro de Configuración:** Un modal centralizado (Ajustes) para gestionar la Nube, la IA y los parámetros generales.
- **Soporte ampliado de IA:** Integración mejorada con **OpenRouter** y modelos locales (**Ollama**, **LM Studio**) a través del nuevo panel.
- **Unificación visual:** Estandarización de las tarjetas en todas las categorías del Compendio (Personajes, Lugares, Objetos, Lore) para una experiencia más coherente.

### 🛠️ Mejoras y Correcciones
- Rediseño del `AIPanel` para delegar la configuración al modal global.
- Optimización del layout principal para asegurar el centrado del contenido en pantallas de bienvenida y escritorio.
- Mejora en la persistencia de los tokens de acceso de Google.
- Actualización de dependencias y limpieza de código.

---
## [1.0.0] - Versión Inicial
- Lanzamiento base con Estructura Narrativa, Compendio e IA básica.
