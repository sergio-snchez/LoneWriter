# Guía de Selección de Modelos

La elección del modelo de lenguaje es determinante para la experiencia de escritura. LoneWriter permite alternar entre diferentes motores según las necesidades de potencia, coste o privacidad.

---

## Modelos en la Nube
Recomendados para quienes no disponen de hardware potente o desean la máxima capacidad de razonamiento.

> [!WARNING] PRIVACIDAD
> Los proveedores en la nube podrían usar sus datos para entrenar sus IA. Para una privacidad total, utilice **Modelos Locales**.

| Proveedor | Modelo de Ejemplo | Perfil de Uso | Listado Oficial |
| :--- | :--- | :--- | :--- |
| **Google** | `gemini-3.1-flash-lite` | Modelo extremadamente rápido y **gratuito**. Ideal para el MPC. | [Ver modelos](https://ai.google.dev/models/gemini) |
| **Anthropic** | `claude-opus-4-7` | La cima del razonamiento complejo y estilo literario avanzado. | [Ver modelos](https://docs.anthropic.com/en/docs/about-claude/models) |
| **OpenAI** | `gpt-5.5` | El equilibrio perfecto entre potencia creativa y precisión técnica. | [Ver modelos](https://platform.openai.com/docs/models) |
| **OpenRouter** | `openrouter/free` | Acceso a una rotación de modelos **gratuitos** de alta calidad. | [Ver modelos](https://openrouter.ai/models?q=free) |

---

## Modelos Locales
Ideales para autores que priorizan la privacidad absoluta y la soberanía de sus datos.

| Modelo | Parámetros | Ollama ID | LM Studio (Repositorio) | Notas |
| :--- | :--- | :--- | :--- | :--- |
| **Gemma 4** | 8B (E4B)<br>*(16GB RAM)* | `gemma4:e4b` | `lmstudio-community/gemma-4-E4B-it-GGUF` | El nuevo estándar para uso local. Muy eficiente en escritura. |
| **Llama 3.1** | 8B<br>*(16GB RAM)* | `llama3.1:8b` | `lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF` | Excelente rendimiento general y capacidad de razonamiento. |
| **Qwen 3.5** | 9B<br>*(16GB RAM)* | `qwen3.5:9b` | `lmstudio-community/Qwen3.5-9B-GGUF` | Muy capaz en tareas creativas y altamente multilingüe. |
| **Phi-3** | 3.8B<br>*(8GB RAM)* | `phi3:mini` | `microsoft/Phi-3-mini-4k-instruct-gguf` | Modelo ligero ideal para equipos con recursos limitados. |

---

## Recomendaciones según Tareas

### Para el Oráculo (Consultas de Lore)
Se requiere una ventana de contexto amplia para procesar tu lore. En la nube, `gemini-3.1-flash-lite` es una opción gratuita inmejorable. En formato local, **Llama 3.1** (`llama3.1:8b`) destaca por su capacidad de razonamiento para conectar los hilos de tu historia con total privacidad.

### Para la Escritura del Borrador
Si buscas un estilo elegante en la nube, `claude-opus-4-7` ofrece resultados muy humanos. Para una experiencia local y privada, **Qwen 3.5** (`qwen3.5:9b`) brilla por su enorme creatividad y riqueza de vocabulario en múltiples idiomas.

### Para el Monitor de Propuestas (MPC)
El MPC trabaja en segundo plano y necesita respuestas casi instantáneas. `gemini-3.1-flash-lite` es ideal en la nube, pero si cuentas con hardware local, **Gemma 4** (`gemma4:e4b`) o **Phi-3** (`phi3:mini`) ofrecen una latencia casi nula sin depender de una conexión a internet.
