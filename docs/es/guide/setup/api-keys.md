# Configuración de Claves API

Para que LoneWriter pueda procesar la información mediante IA, necesita conectarse a un modelo de lenguaje (LLM). La forma más sencilla de hacerlo es a través de una Clave API.

En esta guía se explica cómo obtener las claves de los principales proveedores paso a paso.

> [!CAUTION] PRECAUCIÓN
> **Privacidad**: Las Claves API envían sus textos a la nube y podrían utilizarse para entrenar sus modelos. Para garantizar una privacidad total y **trabajar sin conexión**, le recomendamos configurar **[Modelos Locales](./local-models.md)**.

---

## 1. Google Gemini
Google ofrece actualmente un nivel gratuito a través de Google AI Studio, lo que lo convierte en la opción ideal para usuarios que están empezando.

1. Visita [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Inicia sesión con una cuenta de Google.
3. En el menú lateral izquierdo, selecciona "Get API key".
4. Haz clic en el botón "Create API key".
   - **Nota**: Es necesario disponer de un proyecto para generar la clave. Si no tiene uno por defecto, el sistema le permitirá crear uno manualmente.
5. Copia la clave generada.

> [!IMPORTANT] IMPORTANTE
> **No compartas nunca tu clave**. Si alguien la obtiene, podría consumir tu cuota de uso. LoneWriter guarda esta clave localmente en tu navegador; yo no tengo servidores donde guardarla ni acceso alguno a ella.

<StepCarousel :slides="[
  { src: '/img/guide/api/step1.png', label: '1. Visita la web de Google AI Studio e inicia sesión.' },
  { src: '/img/guide/api/step2.png', label: '2. Genera un nuevo proyecto (ejemplo: LoneWriter).' },
  { src: '/img/guide/api/step3.png', label: '3. Una vez creado, pulsa en Create API Key.' },
  { src: '/img/guide/api/step4.png', label: '4. Genera la nueva Clave API.' },
  { src: '/img/guide/api/step5.png', label: '5. Copia la Clave API recién creada.' }
]" />

---

## 2. Anthropic (Claude)
Claude es reconocido por su capacidad de razonamiento y su estilo de escritura natural.

### Pasos:

1. Visita la [Consola de Anthropic](https://console.anthropic.com/).
2. En el menú lateral, haz clic en **Manage** y luego en **API Keys**.
3. Haz clic en el botón **Create Key**.
4. Asigna un nombre a la nueva API Key (ejemplo: LoneWriter).
5. Copia la clave recién creada.

<StepCarousel :slides="[
  { src: '/img/guide/api/anthropic_step1.png', label: '1. En la consola de Anthropic, ve a Manage > API Keys.' },
  { src: '/img/guide/api/anthropic_step2.png', label: '2. Haz clic en el botón Create Key.' },
  { src: '/img/guide/api/anthropic_step3.png', label: '3. Asigna un nombre descriptivo a tu clave.' },
  { src: '/img/guide/api/anthropic_step4.png', label: '4. Copia la clave generada de forma segura.' }
]" />

---

## 3. OpenAI (ChatGPT)
Ten en cuenta que la API de OpenAI se factura de forma independiente a la suscripción mensual de ChatGPT Plus.

### Pasos:

1. Accede a la [Plataforma de OpenAI](https://platform.openai.com/api-keys) e inicia sesión.
2. En la sección principal (Home) o API Keys, busca el botón **Create API Key** o **Create new secret key**.
3. Asigna un nombre a la Key (ejemplo: LoneWriter) y pulsa en **Create secret key**.
4. Copia la API Key recién creada y guárdala inmediatamente.

<StepCarousel :slides="[
  { src: '/img/guide/api/openai_step1.png', label: '1. Inicia sesión en la plataforma de OpenAI.' },
  { src: '/img/guide/api/openai_step2.png', label: '2. Puedes crear la clave desde el panel principal (Home)...' },
  { src: '/img/guide/api/openai_step3.png', label: '3. ...o desde la sección dedicada de API Keys en el menú lateral.' },
  { src: '/img/guide/api/openai_step4.png', label: '4. Nombra tu clave y confirma la creación.' },
  { src: '/img/guide/api/openai_step5.png', label: '5. Copia la clave generada (no podrás volver a verla).' }
]" />

---

## 4. OpenRouter
OpenRouter permite acceder a diversos modelos con una sola cuenta y una única clave.

:::tip CONSEJO
En OpenRouter se pueden utilizar **LLM gratuitos**, filtrándolos por `:free` o `(free)` en el selector de modelos.
:::

### Pasos:

1. Crea una cuenta en [OpenRouter.ai](https://openrouter.ai/).
2. Haz clic en tu perfil y accede a **Preferences**.
3. En el menú lateral izquierdo, haz clic en **API Keys**.
4. Pulsa en el botón **+ New Key**.
5. Asigna un nombre a la Key (ejemplo: LoneWriter) y haz clic en **Create**.
6. Copia la clave recién generada.

<StepCarousel :slides="[
  { src: '/img/guide/api/openrouter_step1.png', label: '1. Accede a Preferences desde tu menú de perfil.' },
  { src: '/img/guide/api/openrouter_step2.png', label: '2. Selecciona API Keys en el menú lateral.' },
  { src: '/img/guide/api/openrouter_step3.png', label: '3. Pulsa en el botón + New Key.' },
  { src: '/img/guide/api/openrouter_step4.png', label: '4. Nombra tu clave y pulsa en Create.' },
  { src: '/img/guide/api/openrouter_step5.png', label: '5. Copia la clave generada y guárdala bien.' }
]" />

---

## Configuración en LoneWriter

Una vez que tengas tu clave API, el último paso es vincularla dentro de la aplicación para que el Oráculo y el MPC puedan comenzar a asistirte.

### Pasos:

1. Abre cualquier novela en LoneWriter y haz clic en el icono del **engranaje** (Ajustes) en la esquina superior derecha.
2. Navega a la sección **Inteligencia Artificial** en el menú lateral de los ajustes.
3. Selecciona tu **Proveedor** (ej. Google Gemini) e introduce la **API Key** en el campo correspondiente.
4. Para el **Modelo**, puedes usar el enlace proporcionado ("View available models") para ver los nombres técnicos oficiales de cada proveedor.
5. Elige el modelo que prefieras (ej. `gemini-3.1-flash-lite`), cópialo y pégalo en el campo **Desired model**.

<StepCarousel :slides="[
  { src: '/img/guide/setup/config_step1.png', label: '1. Accede a los Ajustes desde el icono del engranaje en tu novela.' },
  { src: '/img/guide/setup/config_step2.png', label: '2. Ve a la sección de Inteligencia Artificial.' },
  { src: '/img/guide/setup/config_step3.png', label: '3. Selecciona el proveedor y pega tu API Key.' },
  { src: '/img/guide/setup/config_step4.png', label: '4. Haz clic en el enlace para ver los modelos disponibles.' },
  { src: '/img/guide/setup/config_step5.png', label: '5. Copia el identificador del modelo y pégalo en LoneWriter.' }
]" />

:::tip PRUEBA DE CONEXIÓN
Te recomendamos pulsar el **botón de prueba de conexión** para verificar que todo está configurado correctamente antes de empezar a escribir. Si el indicador se ilumina en verde, la configuración es correcta.
:::
