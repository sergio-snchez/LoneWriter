![LoneWriter Banner](banner-lonewriter.png)

<div align="center">

[Also available in Spanish](./README_ES.md)

</div>

# LoneWriter v1.5-compendium (Stable) 🖋️

> **Your "Narrative Operating System": The AI that listens to you, organizes your chaos, and monitors your world's coherence while you only worry about writing.**
>
> 🌐 **Web Access:** [lonewriter.vercel.app](https://lonewriter.vercel.app/)
>
> ☕ **Support the project:** [Buy me a coffee](https://buymeacoffee.com/sergio.snchez)

LoneWriter is a minimalist and powerful application designed for writers seeking a zen environment with cutting-edge **Invisible AI** capabilities. Manage your narrative structure, create a detailed compendium of your world, and receive help from expert literary assistants, all from your browser or installed as a native application thanks to its PWA technology.

## ✨ Main Features

### 🌍 Multilingual (i18n)
- **Spanish and English:** Fully translated interface with language selector in Settings > General.
- **Persistence:** Language preference is automatically saved in `localStorage`.
- **Extensible Architecture:** i18next-based system with JSON dictionaries, ready to add more languages.

### 📖 Dynamic Narrative Structure
- **Key Hierarchy:** Organize your novel into Acts, Chapters and Scenes fluidly.
- **Zen Focus:** Clean interface designed to minimize distractions and maximize creativity.
- **Real-time Statistics:** Track your progress with word count and daily goals.
- **Responsive Design:** Interface optimized for mobile and tablets with drawer navigation, touch targets and collapsible panels.

### 🤖 Invisible AI & Lore Monitor (MPC)
- **MPC (Compendium Proposal Monitor):** Goodbye to "world bureaucracy." LoneWriter listens as you write and automatically detects new entities (characters, places, objects). It suggests them in a non-intrusive purple panel so you can add them to your compendium with one click, without stopping your narrative flow.
- **Magic Auto-complete:** Mentioned a new sword or a mysterious village? Use the sparkle button in the Compendium to let the AI scan your novel and automatically fill in descriptions, traits, and relationships for you.
- **RAG Engine (all-MiniLM-L6-v2):** Semantic search powered by local embeddings (Transformers.js). Your entire novel is vectorized in the browser — context-aware queries without external APIs, keeping your data private.
- **Oracle Verdicts (Continuity Lintor):** Real-time paragraph-by-paragraph coherence analysis. It acts as a "logic corrector" that detects contradictions with your established lore (e.g., a dead character reappearing or an object mistakenly changing owners).
- **Selective Exclusion:** Control which Compendium entities participate in coherence analysis with one click to avoid false positives during dreams or flashbacks.

### 🧠 Advanced AI Assistant
- **Multiple Models:** Support for Gemini, GPT-4o, Claude 3.5 and local models (LM Studio/Ollama).
- **Literary Tools:** Rewrite scenes, adjust tone, improve pacing, or change POV with contextual intelligence.
- **Debate System:** Multiple AI agents debate your scene with configurable rounds and persistent sessions for deep critical feedback.

### 📚 Compendium and Lore
- **Character Library:** Detailed character sheets with traits, motivations and arcs.
- **World Building:** Manage places, key objects and rules of your universe.
- **Knowledge Base:** Upload reference files (TXT, MD, CSV, JSON) for AI to use as context.

### 💾 Portability and Synchronization
- **Cloud Sync:** Native connection with **Google Drive** for automatic backups and total persistence.
- **Privacy First:** Your data is saved locally (IndexedDB) and optionally in your own Google personal space.
- **Compressed Export:** Download your complete project in compressed `.lwrt` format (unreadable as plain text) or generate a Word document (`.docx`).
- **Backward Compatibility:** The importer automatically detects old (plain JSON) and new (compressed) `.lwrt` files.

## 🛠️ Technologies

- **Core:** React + Vite
- **Database:** Dexie.js (IndexedDB)
- **RAG Engine:** Transformers.js (all-MiniLM-L6-v2) — local embeddings in browser
- **i18n:** i18next + react-i18next
- **Compression:** pako (gzip)
- **PWA:** Vite PWA Plugin (Service Workers, Offline support)
- **Synchronization:** Google Drive API (GSI)
- **Deployment:** Vercel

## 🚀 Installation and Local Development

If you want to try LoneWriter in your own environment:

1. Clone the repository:
   ```bash
   git clone https://github.com/sergio-snchez/LoneWriter.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## 📜 Credits

Designed and developed with ♥ by **Sergio Sánchez** with Antigravity.

---

*LoneWriter v1.5-compendium - Your personal space to bring great stories to life.*

---

<div align="center">

[Also available in Spanish](./README_ES.md)

</div>