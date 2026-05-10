# The Oracle

The Oracle is an advanced narrative query tool. Unlike general language models, the Oracle has direct access to the drafts and the Compendium of your project.

It uses RAG (Retrieval-Augmented Generation) technology to process your texts and provide accurate answers based exclusively on your story.

---

## Queries to the Oracle
Access to the Oracle is provided via the main toolbar.

### Examples of Use:
- "What was the name of the secondary character introduced in the first chapter?"
- "What is the historical link between the city of Kaelum and the protagonist?"
- "Provide a summary of the events that occurred in the previous scene."
- "Are there any inconsistencies in the description of the relic object?"

---

### The Trial by Fire
There is no better way to understand the value of the Oracle than seeing it in action detecting a human error. Here, the system alerts us to a direct inconsistency based on previously established facts:

![Oracle Inconsistency Detection](/img/guide/editor/oracle_proof.png)

---

## Technical Operation (RAG)

To ensure accuracy and speed of responses, LoneWriter utilizes **RAG** (Retrieval-Augmented Generation) technology through a local indexing process:

1. **Indexing**: The system processes the text in the background to structure information in a local vector database.
2. **Privacy**: All processing is done locally in the browser. The knowledge database is not transferred to external servers.
3. **Updating**: The system notifies the user when the draft content has been correctly indexed and is available for queries.

> [!TIP] TIP
> The first time you access the Oracle (or use local semantic features), the system will automatically download the local **all-MiniLM-L6-v2** model (approx. 25MB). This process only happens once and allows the analysis to be performed entirely on your device, ensuring your privacy.

![RAG Model Ready Notification](/img/guide/analysis/oracle_model_ready.png)

---

## Usage Recommendations
- **Precision**: For best results, it is recommended to ask specific questions that include entity names.
- **Compendium Maintenance**: The quality of responses depends on the completeness of information in the Compendium and the drafts.
- **Context**: It is possible to limit the scope of the search to specific chapters or the entire work.

> [!NOTE]
> The Oracle is a tool designed to assist in managing complex plots and maintaining consistency in extensive works.
