# Modelos Locales (Soberanía Total) 🛡️

Una de las características más potentes de LoneWriter es su capacidad para funcionar de forma **100% privada** utilizando modelos que corren en tu propio ordenador. 

Si usas un modelo local, tus textos **nunca** salen de tu equipo. No necesitas conexión a internet para usar la IA.

---

## 🚀 Opción A: Ollama (Recomendado por sencillez)
Ollama es la forma más fácil de correr modelos de IA en Windows, Mac o Linux.

### Instalación paso a paso:
1. Descarga Ollama desde [ollama.com](https://ollama.com/).
2. Instala la aplicación como cualquier otro programa.
3. Una vez instalada, abre una **Terminal** (PowerShell o CMD en Windows) y escribe:
   ```bash
   ollama run llama3
   ```
   *Esto descargará Llama 3 (el modelo de Meta) en tu equipo. Tardará unos minutos dependiendo de tu conexión.*

### Conexión con LoneWriter:
1. En LoneWriter, abre **Ajustes** > **IA**.
2. Cambia el proveedor a **Local**.
3. En **Servidor URL**, asegúrate de que aparece: `http://localhost:11434/v1` (es el puerto por defecto de Ollama).
4. En **Modelo**, escribe `llama3`.
5. Pulsa el botón del **Rayo** para confirmar.

---

## 🎨 Opción B: LM Studio (Recomendado para visualización)
Si prefieres una interfaz gráfica para descargar y gestionar modelos, LM Studio es excelente.

### Instalación:
1. Descarga LM Studio desde [lmstudio.ai](https://lmstudio.ai/).
2. Busca un modelo en la barra de búsqueda (ej: "Mistral" o "Llama 3").
3. Descarga la versión que mejor se adapte a tu memoria RAM (las versiones "Q4_K_M" suelen ser el equilibrio perfecto).
4. Ve al icono del **Servidor** (flecha doble) en el menú lateral de LM Studio.
5. Haz clic en **"Start Server"**.

### Conexión con LoneWriter:
1. En LoneWriter, abre **Ajustes** > **IA**.
2. Cambia el proveedor a **Local**.
3. En **Servidor URL**, LM Studio suele usar: `http://localhost:1234/v1`.
4. En **Modelo**, escribe el nombre del modelo que has cargado en LM Studio.
5. Pulsa el botón del **Rayo**.

---

## ⚠️ Requisitos de Hardware
Correr IA en local requiere potencia. Aquí tienes una guía rápida:
- **8GB RAM**: Puedes correr modelos pequeños (1B - 3B parámetros) con fluidez.
- **16GB RAM**: Recomendado para modelos estándar (7B - 8B como Llama 3 o Mistral).
- **32GB RAM o más**: Puedes probar modelos más grandes y potentes.

> [!TIP]
> Si tu ordenador va muy lento con modelos locales, siempre puedes volver a usar **Google Gemini** (Nube), que es gratuito y no consume recursos de tu PC.
