# API Keys Setup 🔑

For LoneWriter to "think," it needs to connect to a Language Model (LLM). The simplest way to do this is through an **API Key**.

In this guide, we explain how to get keys from the main providers step by step.

---

## 1. Google Gemini (Recommended for Beginners)
Google currently offers a very generous free tier through **Google AI Studio**, making it the ideal choice for users just starting out.

### Steps to get your key:
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. In the left sidebar, click on **"Get API key"**.
4. Click the blue button that says **"Create API key"**.
   - You can choose "Create API key in new project" if you don't have one configured.
5. Copy the key that appears (it's a long string of letters and numbers).


> [!IMPORTANT]
> **Never share your key**. If someone gets it, they could use up your usage quota. LoneWriter stores this key locally in your browser; I don't have servers to store it, nor do I have any access to it.

---

## 2. Anthropic (Claude)
Claude is known for its excellent reasoning ability and natural writing style, which is highly valued by authors.

### Steps:
1. Register at the [Anthropic Console](https://console.anthropic.com/).
2. Go to the **"Settings"** > **"API Keys"** section.
3. Click on **"Create Key"**.
4. Give it a name (e.g., "LoneWriter-Home") and copy the key.

---

## 3. OpenAI (ChatGPT)
If you are already a ChatGPT Plus user, please note that the API is paid separately from the monthly plan.

### Steps:
1. Go to the [OpenAI Platform](https://platform.openai.com/api-keys).
2. Click on **"Create new secret key"**.
3. Copy and save the key immediately, as you won't be able to see it again.

---

## 4. OpenRouter (The "All-in-one")
OpenRouter is an aggregator that allows you access to almost any model (including many free and open-source ones) with a single account and a single key.

### Steps:
1. Create an account at [OpenRouter.ai](https://openrouter.ai/).
2. Go to **"Keys"** and create a new key.
3. Top up your account with a few dollars (usage is usually very low for writing).

---

## How to Configure AI in LoneWriter
Once you have your key, follow these steps to activate the application's "brain":

1. Open LoneWriter and click the **Settings** icon (gear).
2. Go to the **AI** tab.
3. Select your **Provider** (e.g., Google).
4. **Enter the Model**: This is the technical name of the AI engine. Here are the most recommended ones (you can copy and paste them):
   - **Google**: `gemini-1.5-flash` (fast and free) or `gemini-1.5-pro` (smarter).
   - **Anthropic**: `claude-3-5-sonnet-20240620` (excellent for writing).
   - **OpenAI**: `gpt-4o-mini` (economical) or `gpt-4o` (powerful).
5. Paste your **API Key** into the corresponding field.
6. Click the **Zap (Lightning)** button to test the connection.

> [!TIP]
> If the lightning bolt lights up **green**, the configuration is correct. If it turns **red**, check that there are no blank spaces before or after the key and that the model name is exact.
