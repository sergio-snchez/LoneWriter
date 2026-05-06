# Local Models (Total Sovereignty) 🛡️

One of the most powerful features of LoneWriter is its ability to operate **100% privately** using models that run on your own computer.

If you use a local model, your texts **never** leave your device. You don't need an internet connection to use the AI.

---

## 🚀 Option A: Ollama (Recommended for Simplicity)
Ollama is the easiest way to run AI models on Windows, Mac, or Linux.

### Step-by-step Installation:
1. Download Ollama from [ollama.com](https://ollama.com/).
2. Install the application like any other program.
3. Once installed, open a **Terminal** (PowerShell or CMD on Windows) and type:
   ```bash
   ollama run llama3
   ```
   *This will download Llama 3 (Meta's model) to your computer. It will take a few minutes depending on your connection.*

### Connection with LoneWriter:
1. In LoneWriter, open **Settings** > **AI**.
2. Change the provider to **Local**.
3. In **Server URL**, ensure it says: `http://localhost:11434/v1` (this is Ollama's default port).
4. In **Model**, type `llama3`.
5. Click the **Zap (Lightning)** button to confirm.

---

## 🎨 Option B: LM Studio (Recommended for Visualization)
If you prefer a graphical interface to download and manage models, LM Studio is excellent.

### Installation:
1. Download LM Studio from [lmstudio.ai](https://lmstudio.ai/).
2. Search for a model in the search bar (e.g., "Mistral" or "Llama 3").
3. Download the version that best fits your RAM (the "Q4_K_M" versions are usually the perfect balance).
4. Go to the **Server** icon (double arrow) in the LM Studio sidebar.
5. Click **"Start Server"**.

### Connection with LoneWriter:
1. In LoneWriter, open **Settings** > **AI**.
2. Change the provider to **Local**.
3. In **Server URL**, LM Studio usually uses: `http://localhost:1234/v1`.
4. In **Model**, type the name of the model you have loaded in LM Studio.
5. Click the **Zap (Lightning)** button.

---

## ⚠️ Hardware Requirements
Running local AI requires power. Here is a quick guide:
- **8GB RAM**: You can run small models (1B - 3B parameters) smoothly.
- **16GB RAM**: Recommended for standard models (7B - 8B like Llama 3 or Mistral).
- **32GB RAM or more**: You can try larger, more powerful models.

> [!TIP]
> If your computer is very slow with local models, you can always go back to using **Google Gemini** (Cloud), which is free and doesn't consume your PC's resources.
