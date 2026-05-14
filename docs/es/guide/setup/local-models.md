# Modelos Locales

Una de las características más potentes de LoneWriter es su capacidad para funcionar de forma privada utilizando modelos que se ejecutan en su propio ordenador.

Al utilizar un modelo local, los textos no salen de su equipo y no se requiere conexión a internet para el uso de la inteligencia artificial.


## Opción A: Ollama
Ollama es la herramienta recomendada para ejecutar modelos de inteligencia artificial en Windows, Mac o Linux de forma sencilla y eficiente.

### Pasos para la configuración:

1. Busca el modelo que quieras ejecutar en la web oficial de [Ollama](https://ollama.com/library). En nuestro ejemplo, utilizaremos **Gemma 4**.
2. En la ficha del modelo, selecciona y copia el **Model ID** con los parámetros que mejor se adapten a tu hardware (ej. `gemma4:e4b`).
3. Una vez descargado e instalado Ollama, ve a la sección **Settings** y haz login con tu cuenta.
4. Con la sesión iniciada, busca el modelo con el ID que has copiado previamente y descárgalo directamente desde la aplicación de Ollama. Es necesario iniciar un chat con cualquier mensaje para "forzar" la descarga del modelo.
5. Finalmente, en los ajustes (**Settings**), activa la opción **"Expose Ollama to the network"** para permitir que LoneWriter se comunique con el servidor.
6. Por último, copia en LoneWriter el **Model ID** y la **URL del servidor** (asegurando que finalice en `/v1`).
<StepCarousel :slides="[
  { src: '/img/guide/local/ollama_step1.png', label: '1. Busca el modelo deseado en la biblioteca de Ollama.' },
  { src: '/img/guide/local/ollama_step2.png', label: '2. Copia el ID del modelo (Tag) específico.' },
  { src: '/img/guide/local/ollama_step3.png', label: '3. Instala Ollama e inicia sesión en los ajustes.' },
  { src: '/img/guide/local/ollama_step4.png', label: '4. Inicia un chat para forzar la descarga del modelo.' },
  { src: '/img/guide/local/ollama_step5.png', label: '5. Activa Expose Ollama to the network en los ajustes.' },
  { src: '/img/guide/local/ollama_step6.png', label: '6. Copia el ID y la URL en los ajustes de LoneWriter.' }
]" />

### Conexión con LoneWriter:
1. En LoneWriter, ve a **Ajustes > Inteligencia Artificial**.
2. Selecciona el proveedor **Local**.
3. En el campo **Servidor URL**, verifica que aparezca: `http://localhost:11434/v1` (o usa `http://127.0.0.1:11434/v1` como alternativa).
4. En el campo **Modelo**, introduce el ID exacto (ej. `gemma4:e4b`).
5. **Asegúrate de que la URL finalice en `/v1`** si has introducido la dirección manualmente.
6. Confirma la conexión pulsando el botón de prueba.

<ZoomImage src="/img/guide/local/config_ok.png" alt="Conexión establecida correctamente" />


## Opción B: LM Studio
LM Studio ofrece una interfaz gráfica avanzada para descargar y gestionar modelos GGUF, ideal para quienes prefieren no utilizar la terminal.

### Pasos para la configuración:

1. Una vez descargado e instalado [LM Studio](https://lmstudio.ai/), busca el modelo deseado (ej. Gemma 4) en la pantalla principal y descárgalo.
2. Con el modelo descargado, entra en la sección **Developer** desde el menú lateral izquierdo (icono de la terminal) y activa el **Servidor Local**.
3. Pulsa en **Load Model** para cargar y seleccionar uno de los modelos que hayas descargado.
4. Una vez cargado el modelo, puedes copiar el **API Model Identifier** y la **URL del servidor local** desde el panel derecho.
5. Es muy recomendable activar la opción **"Serve on Local Network"** en los ajustes del servidor para asegurar una comunicación fluida con el navegador.

<StepCarousel :slides="[
  { src: '/img/guide/local/lmstudio_step1.png', label: '1. Busca y descarga el modelo que prefieras.' },
  { src: '/img/guide/local/lmstudio_step2.png', label: '2. Entra en el modo Developer y activa el Servidor Local.' },
  { src: '/img/guide/local/lmstudio_step3.png', label: '3. Carga el modelo en la memoria de tu equipo.' },
  { src: '/img/guide/local/lmstudio_step4.png', label: '4. Copia el ID del modelo y la URL de conexión.' },
  { src: '/img/guide/local/lmstudio_step5.png', label: '5. Activa Serve on Local Network en los ajustes del servidor.' },
  { src: '/img/guide/local/lmstudio_step6.png', label: '6. Copia el ID y la URL en los ajustes de LoneWriter.' }
]" />

### Conexión con LoneWriter:
1. En LoneWriter, ve a **Ajustes > Inteligencia Artificial**.
2. Selecciona el proveedor **Local**.
3. En el campo **Servidor URL**, pega la URL copiada de LM Studio (normalmente `http://localhost:1234/v1` o `http://127.0.0.1:1234/v1`).
4. En el campo **Modelo**, pega el **API Model Identifier**.
5. **Asegúrate de añadir `/v1` al final de la URL** si LM Studio no lo ha incluido automáticamente (ej. `http://localhost:1234/v1`).
6. Confirma la conexión pulsando el botón de prueba.

<ZoomImage src="/img/guide/local/config_ok.png" alt="Conexión establecida correctamente" />


## Requisitos de Hardware
La ejecución de modelos locales requiere recursos significativos:
- **8GB RAM**: Modelos pequeños (1B - 3B parámetros).
- **16GB RAM**: Modelos estándar (7B - 8B parámetros).
- **32GB RAM o superior**: Modelos avanzados.


> [!TIP] CONSEJO
> Si tu equipo tiene dificultades con los modelos locales, puedes optar por modelos en la nube. Consulta la [Guía de Selección de Modelos](./model-guide) para entender las diferencias de rendimiento y privacidad.

## Siguiente paso
Una vez configurada su conexión, aprenda a utilizar el **[Editor de LoneWriter](../editor/basics.md)** para dar vida a su historia.
