# Debate Forum

Have you ever wished you could discuss a plot twist or character consistency with a team of professionals? LoneWriter's Debate Forum allows you to invoke different AI agents to analyze your work from multiple perspectives.


## How Debate Works

Unlike rewriting, the Debate Forum does not modify your text directly. It is a consultation space where you can:
1. **Select** a fragment of your novel or write a specific question.
2. **Activate** the participants you want (Editor, Critic, Proofreader...).
3. **Start the Debate** and let the AI discuss with each other to offer you a reasoned conclusion.


## Agent Management

You can customize your debate team according to the needs of each consultation:
- **Flexible Selection**: Activate or deactivate participants with a single click. Only selected agents will intervene in the current conversation.
- **Debate Rounds**: Configure how many times agents should respond to each other to deepen the discussion.
- **Intelligent Context**: Agents have automatic access to the current scene and relevant information from your Compendium. Although you can fine-tune this access using the toolbar icons, the system is designed to include context by default without needing additional configuration.

> [!WARNING] TOKEN USAGE WARNING
> Each additional round multiplies token consumption. The system is designed so that **each agent reads the entire preceding conversation** (including previous participants' responses) before generating its own intervention.

<StepCarousel :slides="[
  { src: '/img/guide/editor/debate_step1.png', label: '1. Consulting the debate forum about a paragraph introducing a new character.' },
  { src: '/img/guide/editor/debate_step2.png', label: '2. Change participants at will, leaving only the proofreader for a technical review.' },
  { src: '/img/guide/editor/debate_step3.png', label: '3. Participant management screen: edit existing profiles or create new agents.' },
  { src: '/img/guide/editor/debate_step4.png', label: '4. Creating a new custom participant, such as a \'Roleplay Enthusiast\'.' },
  { src: '/img/guide/editor/debate_step5.png', label: '5. Test your new agent to get a unique perspective on your scene.' }
]" />


## The Participants (Agents)
	
LoneWriter includes three pre-configured profiles, each with a distinct "personality" and technical focus. However, the team is fully flexible: you can **edit their instructions (prompts)** to adjust their behavior or **create as many new participants as you need** (e.g., a Nordic mythology expert or a scientific advisor).

- **Editor**: Focuses on narrative structure, plot pacing, and character arcs.
- **Critic**: Offers an analytical and honest evaluation, comparing techniques and looking for weak points in the story's logic.
- **Proofreader**: Handles the technical side: grammar, spelling, writing tics, and sentence-level fluency.

<ZoomImage src="/img/guide/editor/debate_manage_btn.png" alt="Manage Participants Button" />


## Forum Memory
Each debate chat is saved independently. You can browse your discussion history, rename threads, or delete them when no longer needed.


> [!TIP] TIP
> The Debate Forum is especially powerful thanks to its Compendium integration. Agents can warn you if any idea arising in the conversation contradicts what you've already established as canon in your world.

## Next step
Organize the details of your universe in **[The Compendium](../worldbuilding/compendium.md)**.
