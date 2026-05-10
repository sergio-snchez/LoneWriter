# The MPC (Compendium Proposal Monitor)

The Compendium Proposal Monitor (MPC) is an assistance tool that operates during the writing process. Its function is to automatically identify mentions of characters, places, or objects in the draft to suggest their incorporation into the Compendium.

---

## MPC Operation

<div style="display: flex; gap: 40px; align-items: center; flex-wrap: wrap;">
<div style="flex: 0.8; min-width: 280px; text-align: center;">

![MPC Automatic Scanning Switch](/img/guide/worldbuilding/mpc_switch.png)

</div>
<div style="flex: 1; min-width: 300px;">

While you write in the editor, the AI engine periodically and silently analyzes your narrative flow in the background to detect key elements.

**To ensure this intelligent analysis runs correctly, make sure the automatic scanning switch (Scanning Auto) located at the top of the Compendium view is active.**

For example, if you write: *"Officer Valerius explored the ruins of Kaelum,"* the MPC will identify possible entries for Valerius and Kaelum.

</div>
</div>

> [!TIP] First Use
> The first time you activate the MPC, the system will automatically download the local **all-MiniLM-L6-v2** model (approx. 25MB). This process only happens once and allows the semantic analysis to be performed entirely on your device, ensuring your privacy.

---

## Managing Proposals
Detections are shown in the MPC side panel. For each proposal, you have the following options:

- **Accept**: The entity is created in the Compendium with the data extracted by the system.
- **Reject**: The proposal is discarded.
- **Edit**: Allows modifying the name or category before confirming the creation.

---

## Relationship Detection
The system is not limited to identifying proper names but also attempts to infer links between entities based on the context of the text, suggesting automatic relationships when possible.

---

## Configuration
The sensitivity and frequency of the MPC can be adjusted from the Settings menu:
- **Frequency**: Defines the text analysis interval.
- **Status**: Allows activating or deactivating the monitor according to workflow needs.

> [!IMPORTANT]
> The MPC has been designed as a support tool that always requires author supervision. No element will be added to the Compendium without your explicit approval.
