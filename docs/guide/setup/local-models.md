# Local Models

One of the most powerful features of LoneWriter is its ability to operate privately using models that run on your own computer.

By using a local model, your texts do not leave your device, and no internet connection is required to use artificial intelligence.

---

## Option A: Ollama
Ollama is the recommended tool for running artificial intelligence models on Windows, Mac, or Linux easily and efficiently.

### Setup Steps:

1. Search for the model you want to run on the official [Ollama](https://ollama.com/library) website. In this example, we will use **Gemma 4**.
2. On the model page, select and copy the **Model ID** with the parameters that best fit your hardware (e.g., `gemma4:e4b`).
3. Once Ollama is downloaded and installed, go to the **Settings** section and log in with your account.
4. Once logged in, search for the model with the ID you previously copied and download it directly from the Ollama application. You will need to start a chat with any message to "force" the model download.
5. Finally, in the **Settings**, activate the **"Expose Ollama to the network"** option to allow LoneWriter to communicate with the server.
6. Finally, you can copy the **Model ID** and the **Server URL** (ensuring it ends in `/v1`) into LoneWriter.

<StepCarousel :slides="[
  { src: '/img/guide/local/ollama_step1.png', label: '1. Search for the desired model in the Ollama library.' },
  { src: '/img/guide/local/ollama_step2.png', label: '2. Copy the specific Model ID (Tag).' },
  { src: '/img/guide/local/ollama_step3.png', label: '3. Install Ollama and log in through the settings.' },
  { src: '/img/guide/local/ollama_step4.png', label: '4. Start a chat to force the model download.' },
  { src: '/img/guide/local/ollama_step5.png', label: '5. Activate Expose Ollama to the network in the settings.' },
  { src: '/img/guide/local/ollama_step6.png', label: '6. Copy the ID and URL into LoneWriter settings.' }
]" />

### Connection with LoneWriter:
1. In LoneWriter, go to **Settings > Artificial Intelligence**.
2. Select the **Local** provider.
3. In the **Server URL** field, verify that it shows: `http://localhost:11434/v1` (or use `http://127.0.0.1:11434/v1` as an alternative).
4. In the **Model** field, enter the exact ID (e.g., `gemma4:e4b`).
5. **Make sure the URL ends in `/v1`** if you have entered the address manually.
6. Confirm the connection by clicking the test button.

![Connection OK](/img/guide/local/config_ok.png)

---

## Option B: LM Studio
LM Studio provides an advanced graphical interface to download and manage GGUF models, ideal for those who prefer not to use the terminal.

### Setup Steps:

1. Once [LM Studio](https://lmstudio.ai/) is downloaded and installed, search for the desired model (e.g., Gemma 4) on the home screen and download it.
2. With the model downloaded, access the **Developer** section from the left sidebar (terminal icon) and activate the **Local Server**.
3. Click on **Load Model** to load and select one of the models you have downloaded.
4. Once the model is loaded, you can copy the **API Model Identifier** and the **Local Server URL** from the right panel.
5. It is highly recommended to activate the **"Serve on Local Network"** option in the server settings to ensure smooth communication with the browser.

<StepCarousel :slides="[
  { src: '/img/guide/local/lmstudio_step1.png', label: '1. Search for and download your preferred model.' },
  { src: '/img/guide/local/lmstudio_step2.png', label: '2. Enter Developer mode and activate the Local Server.' },
  { src: '/img/guide/local/lmstudio_step3.png', label: '3. Load the model into your system memory.' },
  { src: '/img/guide/local/lmstudio_step4.png', label: '4. Copy the Model ID and the connection URL.' },
  { src: '/img/guide/local/lmstudio_step5.png', label: '5. Activate Serve on Local Network in the server settings.' },
  { src: '/img/guide/local/lmstudio_step6.png', label: '6. Copy the ID and URL into LoneWriter settings.' }
]" />

### Connection with LoneWriter:
1. In LoneWriter, go to **Settings > Artificial Intelligence**.
2. Select the **Local** provider.
3. In the **Server URL** field, paste the URL copied from LM Studio (usually `http://localhost:1234/v1` or `http://127.0.0.1:1234/v1`).
4. In the **Model** field, paste the **API Model Identifier**.
5. **Make sure to add `/v1` at the end of the URL** if LM Studio hasn't included it automatically (e.g., `http://localhost:1234/v1`).
6. Confirm the connection by clicking the test button.

![Connection OK](/img/guide/local/config_ok.png)

---

## Hardware Requirements
Running local models requires significant resources:
- **8GB RAM**: Small models (1B - 3B parameters).
- **16GB RAM**: Standard models (7B - 8B parameters).
- **32GB RAM or higher**: Advanced models.

> [!TIP] TIP
> If your device struggles to run local models, you can opt for cloud models. Check the [Model Selection Guide](./model-guide) to understand the differences in performance and privacy.
