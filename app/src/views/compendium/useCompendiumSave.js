export function useCompendiumSave({
  activeSection,
  editingItem,
  characters,
  locations,
  objects,
  lore,
  addCompendiumEntry,
  updateCompendiumEntry,
  deleteCompendiumEntry,
  dismissMpcProposal,
  onClosePanel,
}) {
  const syncCompendiumRelationships = async (data, category, isUpdate, oldItem) => {
    const promises = [];

    const syncBilateral = (entityA, oldEntityA, catA, catB, fieldA, fieldB, arrayB) => {
      const newNamesB = entityA[fieldA] || [];
      const oldNamesB = isUpdate ? (oldEntityA[fieldA] || []) : [];
      const allNamesB = new Set([...newNamesB, ...oldNamesB]);

      const myNameA = entityA.name || entityA.title;
      const oldNameA = isUpdate ? (oldEntityA.name || oldEntityA.title) : myNameA;

      allNamesB.forEach(nameB => {
        const entityB = arrayB.find(x => (x.name || x.title) === nameB);
        if (!entityB) return;

        let assocListAInB = [...(entityB[fieldB] || [])];
        const isNowAssociated = newNamesB.includes(nameB);

        let changed = false;
        if (isNowAssociated) {
          if (oldNameA && oldNameA !== myNameA && assocListAInB.includes(oldNameA)) {
            assocListAInB = assocListAInB.filter(n => n !== oldNameA);
            changed = true;
          }
          if (!assocListAInB.includes(myNameA)) {
            assocListAInB.push(myNameA);
            changed = true;
          }
        } else {
          if (assocListAInB.includes(oldNameA)) {
            assocListAInB = assocListAInB.filter(n => n !== oldNameA);
            changed = true;
          }
          if (assocListAInB.includes(myNameA)) {
            assocListAInB = assocListAInB.filter(n => n !== myNameA);
            changed = true;
          }
        }
        if (changed) {
          promises.push(updateCompendiumEntry(catB, entityB.id, { [fieldB]: assocListAInB }));
        }
      });
    };

    if (category === 'characters') {
      syncBilateral(data, oldItem, 'characters', 'lore', 'associatedLore', 'associatedCharacters', lore);
      syncBilateral(data, oldItem, 'characters', 'locations', 'associatedLocations', 'associatedCharacters', locations);
      syncBilateral(data, oldItem, 'characters', 'objects', 'associatedObjects', 'associatedCharacters', objects);
    } else if (category === 'locations') {
      syncBilateral(data, oldItem, 'locations', 'lore', 'associatedLore', 'associatedLocations', lore);
      syncBilateral(data, oldItem, 'locations', 'objects', 'associatedObjects', 'associatedLocations', objects);
      syncBilateral(data, oldItem, 'locations', 'characters', 'associatedCharacters', 'associatedLocations', characters);
    } else if (category === 'objects') {
      syncBilateral(data, oldItem, 'objects', 'lore', 'associatedLore', 'associatedObjects', lore);
      syncBilateral(data, oldItem, 'objects', 'locations', 'associatedLocations', 'associatedObjects', locations);
      syncBilateral(data, oldItem, 'objects', 'characters', 'associatedCharacters', 'associatedObjects', characters);
    } else if (category === 'lore') {
      syncBilateral(data, oldItem, 'lore', 'characters', 'associatedCharacters', 'associatedLore', characters);
      syncBilateral(data, oldItem, 'lore', 'locations', 'associatedLocations', 'associatedLore', locations);
      syncBilateral(data, oldItem, 'lore', 'objects', 'associatedObjects', 'associatedLore', objects);
    }

    await Promise.all(promises);
  };

  const handleSavePanel = async (data, newCategory) => {
    const targetCategory = newCategory || activeSection;
    const isFreshlyCreated = data._isNewlyCreated;
    delete data._isNewlyCreated;
    const isUpdate = !!editingItem && !isFreshlyCreated;
    const isMpcProposal = !!data._mpcId;
    const mpcId = data._mpcId;
    const originalCategory = data._originalCategory || activeSection;
    delete data._mpcId;
    delete data._originalCategory;

    if (targetCategory === 'characters') {
      const newRels = (data.relations || []).filter(r => r.name);
      data.relations = newRels;

      const oldName = isUpdate ? editingItem.name : data.name;
      const c1Name = data.name;

      const allCharNames = new Set();
      if (isUpdate) {
        (editingItem.relations || []).forEach(r => { if (r.name) allCharNames.add(r.name); });
      }
      newRels.forEach(r => { if (r.name) allCharNames.add(r.name); });

      const promises = [];

      for (const otherName of allCharNames) {
        const otherChar = characters.find(c => c.name === otherName);
        if (!otherChar) continue;

        const existingRels = [...(otherChar.relations || [])];
        const relToMeIdx = existingRels.findIndex(r => r.name === oldName);
        const stillRelated = newRels.some(r => r.name === otherName);

        if (stillRelated) {
          const myRel = newRels.find(r => r.name === otherName);
          const reverseRel = {
            name: c1Name,
            type: myRel.reverseType || '',
            reverseType: myRel.type || ''
          };
          if (relToMeIdx >= 0) {
            existingRels[relToMeIdx] = reverseRel;
          } else {
            existingRels.push(reverseRel);
          }
        } else {
          if (relToMeIdx >= 0) {
            existingRels.splice(relToMeIdx, 1);
          }
        }

        promises.push(updateCompendiumEntry('characters', otherChar.id, { relations: existingRels }));
      }

      if (isUpdate) {
        await updateCompendiumEntry(targetCategory, editingItem.id, data);
      } else {
        await addCompendiumEntry(targetCategory, data);
      }

      await Promise.all(promises);
      await syncCompendiumRelationships(data, targetCategory, isUpdate, editingItem);

      if (isMpcProposal && mpcId) {
        dismissMpcProposal(mpcId);
      }

      onClosePanel();
      return;
    }

    const categoryChanged = targetCategory !== originalCategory;

    if (isFreshlyCreated) {
      if (isMpcProposal && mpcId) {
        dismissMpcProposal(mpcId);
      }
      await syncCompendiumRelationships(data, targetCategory, false, null);
    } else if (isUpdate) {
      if (categoryChanged) {
        await deleteCompendiumEntry(originalCategory, editingItem.id);
        await addCompendiumEntry(targetCategory, data);
      } else {
        await updateCompendiumEntry(targetCategory, editingItem.id, data);
      }
      await syncCompendiumRelationships(data, targetCategory, true, editingItem);
    } else {
      await addCompendiumEntry(targetCategory, data);
      await syncCompendiumRelationships(data, targetCategory, false, null);

      if (isMpcProposal && mpcId) {
        dismissMpcProposal(mpcId);
      }
    }

    onClosePanel();
  };

  return { handleSavePanel }
}
