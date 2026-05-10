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

## Technical Operation
To ensure the accuracy and speed of responses, LoneWriter performs a local indexing process:

1. **Indexing**: The system processes the text in the background to structure information in a local vector database.
2. **Privacy**: All processing is done locally in the browser. The knowledge database is not transferred to external servers.
3. **Updating**: The system notifies the user when the draft content has been correctly indexed and is available for queries.

---

## Usage Recommendations
- **Precision**: For best results, it is recommended to ask specific questions that include entity names.
- **Compendium Maintenance**: The quality of responses depends on the completeness of information in the Compendium and the drafts.
- **Context**: It is possible to limit the scope of the search to specific chapters or the entire work.

> [!NOTE]
> The Oracle is a tool designed to assist in managing complex plots and maintaining consistency in extensive works.
