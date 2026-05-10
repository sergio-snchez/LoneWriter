# API Keys Setup

For LoneWriter to process information using AI, it needs to connect to a Language Model (LLM). The simplest way to do this is through an API Key.

This guide explains how to obtain keys from the main providers step by step.

> [!CAUTION]
> **Privacy**: API Keys send your texts to the cloud and could be used to train their models. To ensure total privacy and **work offline**, we recommend configuring **[Local Models](./local-models.md)**.

---

## 1. Google Gemini
Google currently offers a free tier through Google AI Studio, making it the ideal choice for users who are starting out.

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with a Google account.
3. In the left sidebar, select "Get API key".
4. Click the "Create API key" button.
   - **Note**: A project is required to generate the key. If you don't have one by default, the system will allow you to create one manually.
5. Copy the generated key.

> [!IMPORTANT]
> **Never share your key**. If someone gets it, they could use up your usage quota. LoneWriter stores this key locally in your browser; I don't have servers to store it, nor do I have any access to it.

<StepCarousel :slides="[
  { src: '/img/guide/api/step1.png', label: '1. Visit the Google AI Studio website and sign in.' },
  { src: '/img/guide/api/step2.png', label: '2. Create a new project (e.g., LoneWriter).' },
  { src: '/img/guide/api/step3.png', label: '3. Once created, click on Create API Key.' },
  { src: '/img/guide/api/step4.png', label: '4. Generate the new API Key.' },
  { src: '/img/guide/api/step5.png', label: '5. Copy the newly created API Key.' }
]" />

---

## 2. Anthropic (Claude)
Claude is recognized for its reasoning capacity and natural writing style.

### Steps:

1. Visit the [Anthropic Console](https://console.anthropic.com/).
2. In the sidebar, click on **Manage** and then **API Keys**.
3. Click the **Create Key** button.
4. Assign a name to the new API Key (e.g., LoneWriter).
5. Copy the newly created key.

<StepCarousel :slides="[
  { src: '/img/guide/api/anthropic_step1.png', label: '1. In the Anthropic console, go to Manage > API Keys.' },
  { src: '/img/guide/api/anthropic_step2.png', label: '2. Click on the Create Key button.' },
  { src: '/img/guide/api/anthropic_step3.png', label: '3. Assign a descriptive name to your key.' },
  { src: '/img/guide/api/anthropic_step4.png', label: '4. Copy the generated key securely.' }
]" />

---

## 3. OpenAI (ChatGPT)
Note that the OpenAI API is billed independently from the ChatGPT Plus monthly subscription.

### Steps:

1. Access the [OpenAI Platform](https://platform.openai.com/api-keys) and sign in.
2. In the Home or API Keys section, look for the **Create API Key** or **Create new secret key** button.
3. Assign a name to the Key (e.g., LoneWriter) and click on **Create secret key**.
4. Copy the newly created API Key and save it immediately.

<StepCarousel :slides="[
  { src: '/img/guide/api/openai_step1.png', label: '1. Sign in to the OpenAI platform.' },
  { src: '/img/guide/api/openai_step2.png', label: '2. You can create the key from the Home dashboard...' },
  { src: '/img/guide/api/openai_step3.png', label: '3. ...or from the dedicated API Keys section in the sidebar.' },
  { src: '/img/guide/api/openai_step4.png', label: '4. Name your key and confirm the creation.' },
  { src: '/img/guide/api/openai_step5.png', label: '5. Copy the generated key (you won’t be able to see it again).' }
]" />

---

## 4. OpenRouter
OpenRouter allows access to various models with a single account and a single key.

:::tip TIP
On OpenRouter, you can use **free LLMs** by filtering them by `:free` or `(free)` in the model selector.
:::

### Steps:

1. Create an account at [OpenRouter.ai](https://openrouter.ai/).
2. Click on your profile and go to **Preferences**.
3. In the left sidebar, click on **API Keys**.
4. Click the **+ New Key** button.
5. Assign a name to the Key (e.g., LoneWriter) and click **Create**.
6. Copy the newly generated key.

<StepCarousel :slides="[
  { src: '/img/guide/api/openrouter_step1.png', label: '1. Go to Preferences from your profile menu.' },
  { src: '/img/guide/api/openrouter_step2.png', label: '2. Select API Keys in the sidebar.' },
  { src: '/img/guide/api/openrouter_step3.png', label: '3. Click on the + New Key button.' },
  { src: '/img/guide/api/openrouter_step4.png', label: '4. Name your key and click Create.' },
  { src: '/img/guide/api/openrouter_step5.png', label: '5. Copy the generated key and save it securely.' }
]" />

---

## Configuration in LoneWriter

Once you have your API key, the final step is to link it within the application so that the Oracle and MPC can start assisting you.

### Steps:

1. Open any novel in LoneWriter and click on the **gear icon** (Settings) in the top right corner.
2. Navigate to the **Artificial Intelligence** section in the settings sidebar.
3. Select your **Provider** (e.g., Google Gemini) and enter the **API Key** in the corresponding field.
4. For the **Model**, you can use the provided link ("View available models") to see the official technical names for each provider.
5. Choose your preferred model (e.g., `gemini-3.1-flash-lite`), copy it, and paste it into the **Desired model** field.

<StepCarousel :slides="[
  { src: '/img/guide/setup/config_step1.png', label: '1. Access Settings from the gear icon in your novel.' },
  { src: '/img/guide/setup/config_step2.png', label: '2. Go to the Artificial Intelligence section.' },
  { src: '/img/guide/setup/config_step3.png', label: '3. Select the provider and paste your API Key.' },
  { src: '/img/guide/setup/config_step4.png', label: '4. Click the link to view available models.' },
  { src: '/img/guide/setup/config_step5.png', label: '5. Copy the model ID and paste it into LoneWriter.' }
]" />

:::tip CONNECTION TEST
We recommend clicking the **connection test button** to verify that everything is correctly configured before you start writing. If the indicator lights up green, the configuration is correct.
:::
