# Model Selection Guide

The choice of language model is decisive for the writing experience. LoneWriter allows you to switch between different engines according to your needs for power, cost, or privacy.


## Cloud Models
Recommended for those who do not have powerful hardware or desire maximum reasoning capability.

> [!WARNING] PRIVACY
> Cloud providers may use your data to train their AI models. For total privacy, use **Local Models**.

| Provider | Example Model | Usage Profile | Official Listing |
| :--- | :--- | :--- | :--- |
| **Google** | `gemini-3.1-flash-lite` | Extremely fast and **free** model. Ideal for the MPC. | [View models](https://ai.google.dev/models/gemini) |
| **Anthropic** | `claude-opus-4-7` | The pinnacle of complex reasoning and advanced literary style. | [View models](https://docs.anthropic.com/en/docs/about-claude/models) |
| **OpenAI** | `gpt-5.5` | The perfect balance between creative power and technical precision. | [View models](https://platform.openai.com/docs/models) |
| **OpenRouter** | `openrouter/free` | Access to a rotation of high-quality **free** models. | [View models](https://openrouter.ai/models?q=free) |


## Local Models
Ideal for authors who prioritize absolute privacy and data sovereignty.

| Model | Parameters | Ollama ID | LM Studio (Repository) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Gemma 4** | 8B (E4B)<br>*(16GB RAM)* | `gemma4:e4b` | `lmstudio-community/gemma-4-E4B-it-GGUF` | The new standard for local use. Very efficient for writing. |
| **Llama 3.1** | 8B<br>*(16GB RAM)* | `llama3.1:8b` | `lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF` | Excellent overall performance and reasoning capability. |
| **Qwen 3.5** | 9B<br>*(16GB RAM)* | `qwen3.5:9b` | `lmstudio-community/Qwen3.5-9B-GGUF` | Very capable in creative tasks and highly multilingual. |
| **Phi-3** | 3.8B<br>*(8GB RAM)* | `phi3:mini` | `microsoft/Phi-3-mini-4k-instruct-gguf` | Lightweight model ideal for devices with limited resources. |


## Recommendations by Task

### For the Oracle (Lore Queries)
A wide context window is required to process your lore. In the cloud, `gemini-3.1-flash-lite` is an unbeatable free option. For local use, **Llama 3.1** (`llama3.1:8b`) stands out for its reasoning capability to connect the threads of your story with total privacy.

### For Draft Writing
If you are looking for an elegant style in the cloud, `claude-opus-4-7` offers very human-like results. For a private, local experience, **Qwen 3.5** (`qwen3.5:9b`) shines with its immense creativity and rich vocabulary in multiple languages.

### For the Proposal Monitor (MPC)
The MPC works in the background and needs near-instant responses. `gemini-3.1-flash-lite` is ideal in the cloud, but if you have local hardware, **Gemma 4** (`gemma4:e4b`) or **Phi-3** (`phi3:mini`) offer near-zero latency without relying on an internet connection.
