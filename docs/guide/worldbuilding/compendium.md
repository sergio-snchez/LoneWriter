# The Compendium

The Compendium constitutes the knowledge base of your world. It is an intelligent database that LoneWriter uses to maintain narrative consistency and provide accurate information to **[The Oracle](../analysis/oracle.md)**.


## Structure of the Compendium
The Compendium organizes information into four main categories:

1. **Characters**: Protagonists, antagonists, and supporting characters.
2. **Locations**: Geographical environments, cities, or specific rooms.
3. **Objects**: Items, technology, or relics relevant to the plot.
4. **Lore**: Historical facts, magic systems, or cultural concepts.


## Advanced Features

### AI Context Management
Inside each entity's file, you will find a tag labeled **AI Context**. This toggle is vital for **[The Oracle's](../analysis/oracle.md)** accuracy:
- **Enabled**: The AI knows about this entity and its details when answering questions.
- **Disabled**: The entity is hidden from the AI's "knowledge." This is useful to prevent the model from hallucinating with information about characters who haven't appeared yet or who have died.

### Intelligent Autocomplete
The "Magic Wand" button activates deep scanning. LoneWriter will search your entire draft for mentions of this entity to:
1.  Generate an **automatic summary** of its role in the story.
2.  Identify **relevant tags** (traits, types).
3.  Detect **relationships** with other existing entities.

<StepCarousel :slides="[
  { src: '/img/guide/worldbuilding/compendium_step1.png', label: '1. Compendium Overview: organized by categories (Characters, Locations, etc.).' },
  { src: '/img/guide/worldbuilding/compendium_step2.png', label: '2. Accessing Details: clicking on an entity displays its tags, description, and the **Relationships** access.' },
  { src: '/img/guide/worldbuilding/compendium_step3.png', label: '3. AI Context Control: toggle the switch to let the AI ignore or consider this entity.' },
  { src: '/img/guide/worldbuilding/compendium_step4.png', label: '4. Edit Mode: access the full form to modify any attribute of the entry.' },
  { src: '/img/guide/worldbuilding/compendium_step5.png', label: '5. AI Autocomplete: let the system analyze your draft and complete the entry for you.' }
]" />

> [!TIP] TIP
> Use autocomplete after an intense writing session to ensure your character files always reflect the latest changes in the draft.


## Relationships between Entities
For a detailed guide on how to connect characters, places, and objects, please refer to the **[Relationships and Entities](./entities.md)** section.


These connections are the engine that powers **[The Nexus](../analysis/nexus.md)**. Every entity and relationship you define here will be automatically projected onto the Knowledge Graph, allowing you to visualize your story's network of connections in 3D and navigate through it intuitively.

## Next step
Discover how to automate entry creation with the **[Proposal Monitor (MPC)](./mpc.md)**.
