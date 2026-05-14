# The MPC (Compendium Proposal Monitor)

The Compendium Proposal Monitor (MPC) is an assistance tool that operates during the writing process. Its function is to automatically identify mentions of characters, places, or objects in the draft to suggest their incorporation into the **[Compendium](./compendium.md)**.


> [!IMPORTANT]
> The MPC has been designed as a support tool that always requires author supervision. No element will be added to the Compendium without your explicit approval.

## MPC Operation

<div style="display: flex; gap: 40px; align-items: center; flex-wrap: wrap;">
<div style="flex: 0.8; min-width: 280px; text-align: center;">

<ZoomImage src="/img/guide/worldbuilding/mpc_switch.png" alt="MPC Automatic Scanning Switch" />

</div>
<div style="flex: 1; min-width: 300px;">

While you write in the **[editor](../editor/basics.md)**, the AI engine periodically and silently analyzes your narrative flow in the background to detect key elements that haven't been registered yet (Characters, Locations, Objects, or Lore).

To ensure smooth performance, the monitor uses a **cooldown** interval of about 15 seconds between each automatic analysis. If you prefer an immediate result on a specific paragraph, you can force it using **Manual Analysis**: simply select the text and press the MPC button in the header.

**To ensure background analysis runs, make sure the "Scanning Auto" switch at the top of the **[Compendium](./compendium.md)** view is active.**

</div>
</div>


## Managing Proposals
Detections are shown in the MPC side panel. The system automatically filters any name already in your Compendium to avoid duplicates. For each proposal, you have the following options:

- **Accept**: The entity is created in the **[Compendium](./compendium.md)**. The system attempts to automatically extract data such as role, category, or distinctive traits based on the detected context.
- **Reject**: Removes the proposal from the current suggestions list.
- **Ignore Permanently**: Adds the name to a novel-specific "blacklist" so the monitor won't suggest that entity again in future scans.
- **Edit**: Allows modifying the name or changing the category (e.g., from Character to Object) before confirming the final creation.

> [!NOTE] TIP
> MPC proposals are saved locally for each novel. You can close the application, and your pending suggestions will still be available in your next session.

<StepCarousel :slides="[
  { src: '/img/guide/worldbuilding/mpc_step1.png', label: '1. Automatic entity detection while the author writes.' },
  { src: '/img/guide/worldbuilding/mpc_step2.png', label: '2. Review of automatically detected entities (notified on the MPC button).' },
  { src: '/img/guide/worldbuilding/mpc_step3.png', label: '3. Manual MPC activation: search for entities in a selected text fragment.' },
  { src: '/img/guide/worldbuilding/mpc_step4.png', label: '4. Review of new entities detected based on the previous selection.' },
  { src: '/img/guide/worldbuilding/mpc_step5.png', label: '5. Compendium navigation with all new entities saved and organized.' }
]" />

## Next step
Learn how to deepen the bonds between your discoveries in **[Relationships and Entities](./entities.md)**.
