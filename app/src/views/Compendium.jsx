import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  Users, MapPin, Package, BookOpen,
  Search, Filter, Plus, Trash2, 
  X, Zap, Sparkles, Loader2, CheckCircle2, Combine
} from 'lucide-react'
import { useNovel } from '../context/NovelContext'
import { useAI } from '../context/AIContext'
import { useModal } from '../context/ModalContext'
import { extractKeywords, TABLE_CONFIG } from '../services/compendiumSearch'
import { Tooltip } from '../components/Tooltip'
import { ProposalCard } from '../components/MpcProposalDrawer'
import './Compendium.css'

import { CompendiumPanel } from './compendium/CompendiumPanel'
import { CharacterCard, LocationCard, ObjectCard, LoreCard } from './compendium/CompendiumCards'

export default function CompendiumView() {
  const { t } = useTranslation('compendium')
  const { characters, locations, objects, lore, addCompendiumEntry, updateCompendiumEntry, deleteCompendiumEntry, activeNovel } = useNovel()
  const { 
    mpcProposals, dismissMpcProposal, isMpcEnabled, setIsMpcEnabled,
    mpcStatus,
    acceptMpcProposal, dismissMpcProposalPermanently, clearMpcProposals
  } = useAI()
  const { provider, apiKey, currentModel, localBaseUrl, logAIUsage } = useAI()
  const { openModal } = useModal()
  const [activeSection, setActiveSection] = useState('characters')
  const [query, setQuery] = useState('')

  // Edit Panel State
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null means "Add new"

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [isMpcOverlayOpen, setIsMpcOverlayOpen] = useState(false);
  const [isMpcOverlayClosing, setIsMpcOverlayClosing] = useState(false);

  // Merge/Unify State (from useNovel)
  const {
    selectedMerge, setSelectedMerge,
    mergeResult, setMergeResult,
    isMerging,
    isScanningMerge,
    showMergeOverlay, setShowMergeOverlay,
    scanForMergeDuplicates,
    handleMergeSelection: globalHandleMergeSelection,
    confirmMerge
  } = useNovel()

  const handleCloseMpcOverlay = () => {
    setIsMpcOverlayClosing(true);
    setTimeout(() => {
      setIsMpcOverlayOpen(false);
      setIsMpcOverlayClosing(false);
    }, 220);
  };
  const [acceptingMpcId, setAcceptingMpcId] = useState(null);

  // Limpiar filtros al cambiar de sección
  useEffect(() => {
    setActiveFilters([]);
    setIsFilterOpen(false);
  }, [activeSection]);

  // Listener for mpc-edit-proposal event (dispatched from App.jsx drawer)
  useEffect(() => {
    const handler = (e) => {
      const { proposal } = e.detail || {};
      if (!proposal) return;
      setActiveSection(proposal.type);
      const data = { ...proposal };
      delete data.id; delete data.confidence; delete data.reason; delete data.type;
      if (proposal.type === 'characters') {
        data.initials = data.initials || (data.name || '').substring(0, 2).toUpperCase();
        data.color = data.color || '#6b9fd4';
      }
      if (proposal.type === 'lore' && data.name && !data.title) {
        data.title = data.name;
        delete data.name;
      }
      setEditingItem(data);
      setIsPanelOpen(true);
      dismissMpcProposal(proposal.id);
    };
    window.addEventListener('mpc-edit-proposal', handler);
    return () => window.removeEventListener('mpc-edit-proposal', handler);
  }, [dismissMpcProposal]);

  // Listener for navigating to a specific compendium item (from Nexus double click)
  useEffect(() => {
    const handler = (e) => {
      const { id, group } = e.detail || {};
      if (!id || !group) return;
      
      // Set correct tab
      setActiveSection(group);
      
      // Find the entity
      let item = null;
      if (group === 'characters') item = characters.find(c => c.id === id);
      else if (group === 'locations') item = locations.find(l => l.id === id);
      else if (group === 'objects') item = objects.find(o => o.id === id);
      else if (group === 'lore') item = lore.find(l => l.id === id);
      
      if (item) {
        setEditingItem(item);
        setIsPanelOpen(true);
      }
    };
    window.addEventListener('navigate-to-compendium-item', handler);
    return () => window.removeEventListener('navigate-to-compendium-item', handler);
  }, [characters, locations, objects, lore]);

  const getAvailableFilters = () => {
    const list = new Set();
    const ensureArr = (val) => Array.isArray(val) ? val : (typeof val === 'string' ? val.split(',').map(s=>s.trim()).filter(Boolean) : []);
    
    if (activeSection === 'characters') {
      characters.forEach(c => {
        if (c.role) list.add(c.role);
        ensureArr(c.tags).forEach(t => list.add(t));
        ensureArr(c.traits).forEach(t => list.add(t));
      });
    } else if (activeSection === 'locations') {
      locations.forEach(l => {
        if (l.type) list.add(l.type);
        ensureArr(l.tags).forEach(t => list.add(t));
      });
    } else if (activeSection === 'objects') {
      objects.forEach(o => {
        if (o.type) list.add(o.type);
        ensureArr(o.tags).forEach(t => list.add(t));
      });
    } else if (activeSection === 'lore') {
      lore.forEach(e => {
        if (e.category) list.add(e.category);
        ensureArr(e.tags).forEach(t => list.add(t));
      });
    }
    return Array.from(list).sort();
  };

  const toggleFilter = (f) => {
    setActiveFilters(prev => 
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  };

  const matchesFilters = (item) => {
    if (activeFilters.length === 0) return true;
    let itemTags = [];
    const ensureArr = (val) => Array.isArray(val) ? val : (typeof val === 'string' ? val.split(',').map(s=>s.trim()).filter(Boolean) : []);
    
    if (activeSection === 'characters') {
      itemTags = [item.role, ...ensureArr(item.tags), ...ensureArr(item.traits)];
    } else if (activeSection === 'locations') {
      itemTags = [item.type, ...ensureArr(item.tags)];
    } else if (activeSection === 'objects') {
      itemTags = [item.type, ...ensureArr(item.tags)];
    } else if (activeSection === 'lore') {
      itemTags = [item.category, ...ensureArr(item.tags)];
    }
    return activeFilters.some(f => itemTags.includes(f));
  };

  const SECTIONS = [
    { id: 'characters', label: t('tabs.personajes'), icon: Users, count: characters.length },
    { id: 'locations',  label: t('tabs.localizaciones'), icon: MapPin, count: locations.length },
    { id: 'objects',    label: t('tabs.objetos'), icon: Package, count: objects.length },
    { id: 'lore',       label: t('tabs.lore'), icon: BookOpen, count: lore.length },
  ]

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsPanelOpen(true);
  };

  const handleDelete = async (id) => {
    let sourceArray = [];
    if (activeSection === 'characters') sourceArray = characters;
    else if (activeSection === 'locations') sourceArray = locations;
    else if (activeSection === 'objects') sourceArray = objects;
    else if (activeSection === 'lore') sourceArray = lore;
    
    const item = sourceArray.find(i => i.id === id);
    const itemName = item?.name || item?.title || 'esta entrada';
    
    openModal('confirm', {
      title: t('eliminar.titulo'),
      message: t('eliminar.mensaje', { name: itemName }),
      isDanger: true,
      confirmLabel: t('eliminar.boton'),
      onConfirm: async () => {
        await deleteCompendiumEntry(activeSection, id);
        if (editingItem && editingItem.id === id) {
          setIsPanelOpen(false);
        }
      }
    });
  };

  const handleAdd = () => {
    setEditingItem(null);
    setIsPanelOpen(true);
  };

  const getTableForSection = (section) => {
    const map = {
      characters: 'characters',
      locations: 'locations',
      objects: 'objects',
      lore: 'lore'
    };
    return map[section] || section;
  };

  const handleToggleIgnore = async (item) => {
    const table = getTableForSection(activeSection);
    const newValue = item.ignoredForOracle === 1 ? 0 : 1;
    await updateCompendiumEntry(table, item.id, { ignoredForOracle: newValue });
  };

  // ---- Merge/Unify Functions ----
  const handleScanMerge = async () => {
    try {
      await scanForMergeDuplicates(activeSection);
    } catch (err) {
      if (!apiKey && provider !== 'local') {
        openModal('alert', { message: t('unificar.sin_ia') });
      } else {
        openModal('alert', { message: t('unificar.error_escaneo') });
      }
    }
  };


  const handleMergeSelection = async (entities) => {
    if (!apiKey && provider !== 'local') {
      openModal('alert', { message: t('unificar.sin_ia') });
      return;
    }

    try {
      const aiConfig = { provider, apiKey, model: currentModel, localBaseUrl };
      await globalHandleMergeSelection(entities, activeSection, aiConfig, logAIUsage);
    } catch (err) {
      openModal('alert', { message: t('unificar.error_fusion', { error: err.message }) });
    }
  };

  const handleConfirmMerge = async (finalData = null) => {
    try {
      await confirmMerge(activeSection, finalData);
    } catch (err) {
      openModal('alert', { message: t('unificar.error_confirmar', { error: err.message }) });
    }
  };

  const handleSkipMerge = () => {
    setSelectedMerge(null);
    setMergeResult(null);
  };

  // ---- MPC Accordion Functions ----
  const buildMpcCompendiumData = (proposal) => {
    const { id: _id, confidence: _c, reason: _r, type, ...data } = proposal;
    if (type === 'lore') {
      if (!data.title && data.name) { data.title = data.name; delete data.name; }
    }
    if (data.entityType !== undefined) {
      data.type = data.entityType;
      delete data.entityType;
    }
    if (type === 'characters') {
      data.initials = data.initials || (data.name || '').substring(0, 2).toUpperCase();
      data.color = data.color || '#6b9fd4';
    }
    return { type, data };
  };

  const handleMpcAccept = async (proposal) => {
    setAcceptingMpcId(proposal.id);
    try {
      const { type, data } = buildMpcCompendiumData(proposal);
      await addCompendiumEntry(type, data);
      acceptMpcProposal(proposal.id);
    } catch (err) {
      console.error('[MPC] Error al aceptar propuesta:', err);
    } finally {
      setAcceptingMpcId(null);
    }
  };

  const handleMpcEdit = async (proposal) => {
    setAcceptingMpcId(proposal.id);
    
    try {
      const { type, data } = buildMpcCompendiumData(proposal);
      
      const savedId = await addCompendiumEntry(type, data);
      
      dismissMpcProposal(proposal.id);
      
      const savedItem = { 
        ...data, 
        id: savedId,
        _isNewlyCreated: true
      };
      
      setActiveSection(type);
      setEditingItem(savedItem);
      setIsPanelOpen(true);
      setIsMpcOverlayOpen(false);
    } catch (err) {
      console.error('[MPC] Error editando propuesta:', err);
    } finally {
      setAcceptingMpcId(null);
    }
  };

  const handleMpcDismiss = (id) => {
    dismissMpcProposal(id);
  };

  const handleMpcDismissPermanently = (proposal) => {
    dismissMpcProposalPermanently(proposal);
  };

  const syncCompendiumRelationships = async (data, category, isUpdate, oldItem) => {
    const promises = [];
    
    // Generic bilateral sync
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
      let newRels = (data.relations || []).filter(r => r.name);
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
      
      setIsPanelOpen(false);
      return;
    } // -- Fin logica bidireccional

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
    
    setIsPanelOpen(false);
  };

  const matchesQuery = (item) => {
    if (!query) return true;
    const config = TABLE_CONFIG[activeSection];
    if (!config) return true;
    const keywords = extractKeywords(query);
    if (keywords.length === 0) {
      const lowerQuery = query.toLowerCase();
      const nameField = config.nameField;
      if (item[nameField]?.toLowerCase().includes(lowerQuery)) return true;
      return false;
    }
    let totalMatches = 0;
    for (const field of config.searchableFields) {
      const value = item[field];
      if (Array.isArray(value)) {
        for (const v of value) {
          if (typeof v === 'string') {
            for (const kw of keywords) {
              if (v.toLowerCase().includes(kw)) totalMatches++;
            }
          } else if (typeof v === 'object' && v !== null) {
            for (const val of Object.values(v)) {
              if (typeof val === 'string') {
                for (const kw of keywords) {
                  if (val.toLowerCase().includes(kw)) totalMatches++;
                }
              }
            }
          }
        }
      } else if (typeof value === 'string') {
        for (const kw of keywords) {
          if (value.toLowerCase().includes(kw)) totalMatches++;
        }
      }
    }
    return totalMatches > 0;
  };

  return (
    <div className="compendium-view">
      {/* Left column – section tabs */}
      <div className="compendium-view__tabs">
        <div className="compendium-view__tabs-header">
          <h1 className="section-title">{t('titulo')}</h1>
          <p className="section-subtitle">{t('subtitulo')}</p>
        </div>

        {/* MPC Master Switch */}
        <div className="mpc-control">
          <span className="mpc-control__label">
            <Zap size={10} style={{ fill: isMpcEnabled ? 'currentColor' : 'none' }} />
            {t('mpc.interruptor_label')}
          </span>
          <label className="mpc-switch">
            <input 
              type="checkbox" 
              checked={isMpcEnabled} 
              onChange={(e) => setIsMpcEnabled(e.target.checked)} 
            />
            <span className="mpc-slider"></span>
          </label>
        </div>

        <div className="compendium-tabs">
          {SECTIONS.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              id={`compendium-tab-${id}`}
              className={`compendium-tab ${activeSection === id ? 'compendium-tab--active' : ''}`}
              onClick={() => {
                setActiveSection(id);
                setIsPanelOpen(false); // Close panel when changing sections
              }}
            >
              <span className="compendium-tab__icon"><Icon size={16} /></span>
              <span className="compendium-tab__label">{label}</span>
              <span className="compendium-tab__count">{count}</span>
            </button>
          ))}
        </div>

        {/* MPC Badge - abre overlay flotante */}
        <div className="compendium-mpc-badge">
          <div
            className={`compendium-mpc-badge__button ${
              mpcStatus === 'analyzing' ? 'compendium-mpc-badge--analyzing' : ''
            } ${
              mpcProposals.length > 0 ? 'compendium-mpc-badge--active' : ''
            }`}
            onClick={() => setIsMpcOverlayOpen(true)}
          >
            {mpcProposals.length > 0 || mpcStatus === 'analyzing' ? (
              <span className="compendium-mpc-badge__count">
                {mpcProposals.length > 0 ? mpcProposals.length : <Loader2 size={12} className="spin" />}
              </span>
            ) : (
              <Sparkles size={14} className="compendium-mpc-badge__icon" />
            )}
            <span>
              {mpcStatus === 'analyzing' ? t('ai:oraculo.consultando') : t('compendium:mpc.titulo')}
            </span>
          </div>
        </div>

        {/* Summary mini-stats */}
        <div className="compendium-summary">
          <div className="compendium-summary__item">
            <span className="compendium-summary__num">{characters.length}</span>
            <span className="compendium-summary__label">{t('resumen.personajes')}</span>
          </div>
          <div className="compendium-summary__item">
            <span className="compendium-summary__num">{locations.length}</span>
            <span className="compendium-summary__label">{t('resumen.lugares')}</span>
          </div>
          <div className="compendium-summary__item">
            <span className="compendium-summary__num">{objects.length}</span>
            <span className="compendium-summary__label">{t('resumen.objetos')}</span>
          </div>
          <div className="compendium-summary__item">
            <span className="compendium-summary__num">{lore.length}</span>
            <span className="compendium-summary__label">{t('resumen.entradas_lore')}</span>
          </div>
        </div>
      </div>

      {/* Center column – content */}
      <div className="compendium-view__content">
        {/* Toolbar */}
        <div className="compendium-toolbar">
          <div className="search-bar" style={{ flex: 1, maxWidth: 320 }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              placeholder={t('toolbar.buscar', { section: SECTIONS.find(s=>s.id===activeSection)?.label.toLowerCase() })}
              value={query}
              onChange={e => setQuery(e.target.value)}
              id="compendium-search-input"
            />
          </div>
          <div style={{ position: 'relative' }}>
            <button 
              className={`btn ${isFilterOpen || activeFilters.length > 0 ? 'btn-primary' : 'btn-ghost'}`} 
              id="compendium-filter-btn"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <Filter size={13} />
              {activeFilters.length > 0 ? t('toolbar.filtrar_con_cuenta', { count: activeFilters.length }) : t('toolbar.filtrar')}
            </button>
            {isFilterOpen && (
              <div className="compendium-filter-popup">
                <div className="compendium-filter-popup__header">
                  <span className="compendium-filter-popup__title">{t('toolbar.filtrar_titulo')}</span>
                  {activeFilters.length > 0 && (
                    <button className="btn btn-ghost" onClick={() => setActiveFilters([])} style={{padding: '2px 6px', fontSize: 11}}>{t('toolbar.limpiar')}</button>
                  )}
                </div>
                <div className="compendium-filter-popup__body">
                  {getAvailableFilters().length === 0 ? (
                    <div style={{color: 'var(--text-muted)', fontSize: 12}}>{t('toolbar.sin_etiquetas')}</div>
                  ) : (
                    getAvailableFilters().map(f => (
                      <label key={f} className="compendium-filter-option">
                        <input 
                          type="checkbox" 
                          checked={activeFilters.includes(f)} 
                          onChange={() => toggleFilter(f)} 
                        />
                        {f}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <Tooltip content={t('unificar.boton_tooltip')}>
            <button 
              className={`btn ${isMerging || mergeResult ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => {
                if (isMerging || mergeResult) setShowMergeOverlay(true);
                else handleScanMerge();
              }}
              disabled={isScanningMerge || (characters.length + locations.length + objects.length + lore.length < 2 && !isMerging && !mergeResult)}
              id="compendium-merge-btn"
              style={{
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {isScanningMerge || isMerging ? (
                <Loader2 size={13} className="spin" />
              ) : mergeResult ? (
                <CheckCircle2 size={13} />
              ) : (
                <Combine size={13} />
              )}
              {isMerging 
                ? t('unificar.fusionando_cargando') 
                : mergeResult 
                  ? t('unificar.ver_resultado') 
                  : t('unificar.boton')}
            </button>
          </Tooltip>
          
          <button className="btn btn-primary" id="compendium-add-btn" onClick={handleAdd}>
            <Plus size={13} />
            {t('toolbar.añadir')}
          </button>
        </div>

        {/* Cards */}
        <div className="compendium-cards">
          {activeSection === 'characters' && characters
            .filter(matchesQuery)
            .filter(matchesFilters)
            .map(c => <CharacterCard key={c.id} char={c} onEdit={handleEdit} onDelete={handleDelete} onToggleIgnore={handleToggleIgnore} />)}

          {activeSection === 'locations' && locations
            .filter(matchesQuery)
            .filter(matchesFilters)
            .map(l => <LocationCard key={l.id} loc={l} onEdit={handleEdit} onDelete={handleDelete} onToggleIgnore={handleToggleIgnore} />)}

          {activeSection === 'objects' && objects
            .filter(matchesQuery)
            .filter(matchesFilters)
            .map(o => <ObjectCard key={o.id} obj={o} onEdit={handleEdit} onDelete={handleDelete} onToggleIgnore={handleToggleIgnore} />)}

          {activeSection === 'lore' && lore
            .filter(matchesQuery)
            .filter(matchesFilters)
            .map(e => <LoreCard key={e.id} entry={e} onEdit={handleEdit} onDelete={handleDelete} onToggleIgnore={handleToggleIgnore} />)}
            
          {/* Empty state visual fallback */}
          {((activeSection === 'characters' && characters.length === 0) ||
            (activeSection === 'locations' && locations.length === 0) ||
            (activeSection === 'objects' && objects.length === 0) ||
            (activeSection === 'lore' && lore.length === 0)) && (
              <div className="compendium-empty-state">
                <div className="compendium-empty-state__icon">
                  {activeSection === 'characters' && <Users size={36} />}
                  {activeSection === 'locations' && <MapPin size={36} />}
                  {activeSection === 'objects' && <Package size={36} />}
                  {activeSection === 'lore' && <BookOpen size={36} />}
                </div>
                <p className="compendium-empty-state__title">
                  {activeSection === 'characters' && t('vacio.personajes')}
                  {activeSection === 'locations' && t('vacio.localizaciones')}
                  {activeSection === 'objects' && t('vacio.objetos')}
                  {activeSection === 'lore' && t('vacio.lore')}
                </p>
                <p className="compendium-empty-state__sub">{t('vacio.subtitulo')}</p>
                <button className="btn btn-primary" onClick={handleAdd}>
                  <Plus size={14} />
                  {t('vacio.boton')}
                </button>
              </div>
          )}
        </div>
      </div>
      
      {/* Right Slide Panel for Edit/Create */}
      <CompendiumPanel 
        isOpen={isPanelOpen}
        type={activeSection} 
        item={editingItem} 
        characters={characters}
        locations={locations}
        objects={objects}
        lore={lore}
        activeNovel={activeNovel}
        onClose={() => setIsPanelOpen(false)} 
        onSave={handleSavePanel} 
      />

      {/* MPC Overlay Flotante */}
      {isMpcOverlayOpen && createPortal(
        <div 
          className={`compendium-mpc-overlay${isMpcOverlayClosing ? ' compendium-mpc-overlay--closing' : ''}`} 
          onClick={handleCloseMpcOverlay}
          style={{ background: 'transparent', backdropFilter: 'none', pointerEvents: 'none' }}
        >
          <div 
            className={`compendium-mpc-overlay__panel${isMpcOverlayClosing ? ' compendium-mpc-overlay__panel--closing' : ''}`} 
            onClick={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'auto' }}
          >
            <div className="compendium-mpc-overlay__header">
              <div className="compendium-mpc-overlay__title">
                <Sparkles size={18} className="compendium-mpc-overlay__icon" />
                <span>{t('compendium:mpc.titulo')}</span>
                {mpcStatus === 'analyzing' && (
                  <Loader2 size={14} className="spin" />
                )}
              </div>
              <button className="btn btn-ghost btn-icon" onClick={handleCloseMpcOverlay}>
                <X size={18} />
              </button>
            </div>
            
            <div className="compendium-mpc-overlay__body">
              {mpcProposals.length === 0 ? (
                <div className="compendium-mpc-overlay__empty">
                  {mpcStatus === 'analyzing' ? (
                    <>
                      <Loader2 size={32} className="spin" style={{ color: 'var(--accent)' }} />
                      <p>{t('ai:oraculo.consultando')}</p>
                    </>
                  ) : (
                    <>
                      <Sparkles size={32} style={{ opacity: 0.3, color: '#9b72cf' }} />
                      <p>
                        {t('compendium:mpc.empty_desc_1')}
                        <br /><br />
                        <span style={{ color: 'var(--gold)', opacity: 0.7, fontStyle: 'italic' }}>
                          {t('compendium:mpc.empty_desc_2')}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="compendium-mpc-overlay__subtitle">
                    {mpcProposals.length === 1 
                      ? t('compendium:mpc.subtitulo', { count: 1 })
                      : t('compendium:mpc.subtitulo_plural', { count: mpcProposals.length })
                    }
                  </div>
                  <div className="compendium-mpc-overlay__cards">
                    {mpcProposals.map(proposal => (
                      <ProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        onAccept={handleMpcAccept}
                        onEdit={handleMpcEdit}
                        onDismiss={handleMpcDismiss}
                        onDismissPermanently={handleMpcDismissPermanently}
                        isAccepting={acceptingMpcId === proposal.id}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {mpcProposals.length > 1 && (
              <div className="compendium-mpc-overlay__footer">
                <button className="btn btn-ghost" onClick={clearMpcProposals}>
                  <Trash2 size={13} />
                  {t('compendium:mpc.ignorar_todas')}
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={async () => {
                    for (const proposal of [...mpcProposals]) {
                      await handleMpcAccept(proposal);
                    }
                  }}
                >
                  <CheckCircle2 size={13} />
                  {t('compendium:mpc.aceptar_todas')}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

    </div>
  )
}
