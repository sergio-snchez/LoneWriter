# Configuración de Claves API 🔑

Para que LoneWriter pueda "pensar", necesita conectarse a un modelo de lenguaje (LLM). La forma más sencilla de hacerlo es a través de una **Clave API** (API Key).

En esta guía te explicamos cómo conseguir las claves de los principales proveedores paso a paso.

---

## 1. Google Gemini (Recomendado para empezar)
Google ofrece actualmente un nivel gratuito muy generoso a través de **Google AI Studio**, lo que lo convierte en la opción ideal para usuarios que están empezando.

### Pasos para obtener tu clave:
1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Inicia sesión con tu cuenta de Google.
3. En el menú lateral izquierdo, haz clic en **"Get API key"**.
4. Haz clic en el botón azul que dice **"Create API key"**.
   - Puedes elegir "Create API key in new project" si no tienes uno configurado.
5. Copia la clave que aparece (es una cadena larga de letras y números).


> [!IMPORTANT]
> **No compartas nunca tu clave**. Si alguien la obtiene, podría consumir tu cuota de uso. LoneWriter guarda esta clave localmente en tu navegador; yo no tengo servidores donde guardarla ni acceso alguno a ella.

---

## 2. Anthropic (Claude)
Claude es conocido por su excelente capacidad de razonamiento y su estilo de escritura natural, muy apreciado por autores.

### Pasos:
1. Regístrate en la [Consola de Anthropic](https://console.anthropic.com/).
2. Ve a la sección **"Settings"** > **"API Keys"**.
3. Haz clic en **"Create Key"**.
4. Ponle un nombre (ej: "LoneWriter-Casa") y copia la clave.

---

## 3. OpenAI (ChatGPT)
Si ya eres usuario de ChatGPT Plus, ten en cuenta que la API se paga por separado del plan mensual.

### Pasos:
1. Ve a la [Plataforma de OpenAI](https://platform.openai.com/api-keys).
2. Haz clic en **"Create new secret key"**.
3. Copia y guarda la clave inmediatamente, ya que no podrás volver a verla.

---

## 4. OpenRouter (El "Todo en uno")
OpenRouter es un agregador que te permite acceder a casi cualquier modelo (incluidos muchos gratuitos y de código abierto) con una sola cuenta y una sola clave.

### Pasos:
1. Crea una cuenta en [OpenRouter.ai](https://openrouter.ai/).
2. Ve a **"Keys"** y crea una nueva clave.
3. Recarga tu cuenta con unos pocos dólares (el consumo suele ser muy bajo para escritura).

---

## Cómo configurar la IA en LoneWriter
Una vez tengas tu clave, sigue estos pasos para activar el "cerebro" de la aplicación:

1. Abre LoneWriter y haz clic en el icono de **Ajustes** (engranaje).
2. Ve a la pestaña **IA**.
3. Selecciona tu **Proveedor** (ej: Google).
4. **Introduce el Modelo**: Este es el nombre técnico del motor de IA. Aquí tienes los más recomendados (puedes copiarlos y pegarlos):
   - **Google**: `gemini-1.5-flash` (rápido y gratis) o `gemini-1.5-pro` (más inteligente).
   - **Anthropic**: `claude-3-5-sonnet-20240620` (excelente para escritura).
   - **OpenAI**: `gpt-4o-mini` (económico) o `gpt-4o` (potente).
5. Pega tu **API Key** en el campo correspondiente.
6. Haz clic en el botón de **Rayo (Zap)** para probar la conexión. 

> [!TIP]
> Si el rayo se ilumina en **verde**, la configuración es correcta. Si se pone **rojo**, revisa que no haya espacios en blanco antes o después de la clave y que el nombre del modelo sea exacto.
