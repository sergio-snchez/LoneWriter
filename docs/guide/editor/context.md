# Context and Continuity

The biggest challenge in writing a long novel is maintaining consistency of details. LoneWriter uses its artificial intelligence architecture to ensure that every new word is faithful to what has already been established.

---

## The Context Window
When you request a rewrite or consult the Oracle, LoneWriter does not just send your request to the AI. The system automatically attaches relevant information:

1. **Scene Context**: The paragraphs immediately before and after your cursor.
2. **Novel Context**: A global summary of the plot and main themes.
3. **Lore Context**: Information from the Compendium about characters and places mentioned in the current scene.

---

## Avoiding Inconsistencies
Thanks to local indexing (RAG), the system can detect if you are contradicting an established fact.

- **Detection**: If you write that a character has blue eyes when in Chapter 1 they were described as green, the Oracle or the MPC can alert you to this discrepancy.
- **Continuity Suggestions**: When requesting a scene continuation, the AI will take into account the tone, pace, and emotional state of the characters to ensure a smooth transition.

---

## Project "Memory" Management
For continuity to be effective, the author should:
- **Maintain the Compendium**: Ensure that key entities are well described.
- **Summarize Scenes**: Use the synopsis function to provide the system with a structured view of the plot.
- **Periodic Indexing**: The system updates its knowledge database automatically, but the author can force a re-indexing if deep structural changes have been made.

> [!IMPORTANT]
> The system does not make creative decisions for you. Its function is to act as a safety net that warns you of possible logical errors, allowing you to maintain total control over the narrative.
