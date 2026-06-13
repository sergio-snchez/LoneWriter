import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Users, MapPin, Package, BookOpen,
  Search, Plus,
  Zap, Sparkles, Loader2, CheckCircle2, Combine
} from 'lucide-react'
import { useNovel, useAI, useModal } from '../context'
import { extractKeywords, TABLE_CONFIG } from '../services'
import { Tooltip } from '../components'
import { CompendiumFilters, matchesFilters, CompendiumMpcOverlay, CompendiumPanel, CharacterCard, LocationCard, ObjectCard, LoreCard, useCompendiumMerge, useCompendiumSave } from './compendium/index'
import './Compendium.css'
import './compendium/CompendiumMobile.css'

export default function CompendiumView() {
  const { t } = useTranslation('compendium')
  const { characters, locations, objects, lore, addCompendiumEntry, updateCompendiumEntry, deleteCompendiumEntry, activeNovel } = useNovel()
  const {
    mpcProposals, dismissMpcProposal, isMpcEnabled, setIsMpcEnabled,
    mpcStatus,
    acceptMpcProposal, dismissMpcProposalPermanently, clearMpcProposals,
    provider, apiKey, currentModel, localBaseUrl, logAIUsage
  } = useAI()
  const { openModal } = useModal()
  const [activeSection, setActiveSection] = useState('characters')
  const [query, setQuery] = useState('')

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [isMpcOverlayOpen, setIsMpcOverlayOpen] = useState(false);
  const [isMpcOverlayClosing, setIsMpcOverlayClosing] = useState(false);

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

  const SECTIONS = useMemo(() => [
    { id: 'characters', label: t('tabs.personajes'), icon: Users, count: characters.length },
    { id: 'locations',  label: t('tabs.localizaciones'), icon: MapPin, count: locations.length },
    { id: 'objects',    label: t('tabs.objetos'), icon: Package, count: objects.length },
    { id: 'lore',       label: t('tabs.lore'), icon: BookOpen, count: lore.length },
  ], [t, characters.length, locations.length, objects.length, lore.length])

  const handleEdit = useCallback((item) => {
    setEditingItem(item);
    setIsPanelOpen(true);
  }, []);

  const handleDelete = useCallback(async (id) => {
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
  }, [activeSection, characters, locations, objects, lore, openModal, t, deleteCompendiumEntry, editingItem]);

  const handleAdd = useCallback(() => {
    setEditingItem(null);
    setIsPanelOpen(true);
  }, []);

  const getTableForSection = (section) => {
    const map = {
      characters: 'characters',
      locations: 'locations',
      objects: 'objects',
      lore: 'lore'
    };
    return map[section] || section;
  };

  const handleToggleIgnore = useCallback(async (item) => {
    const table = getTableForSection(activeSection);
    const newValue = item.ignoredForOracle === 1 ? 0 : 1;
    await updateCompendiumEntry(table, item.id, { ignoredForOracle: newValue });
  }, [activeSection, updateCompendiumEntry]);

  const { handleScanMerge, handleMergeSelection, handleConfirmMerge, handleSkipMerge } = useCompendiumMerge({
    openModal,
    activeSection,
    scanForMergeDuplicates,
    globalHandleMergeSelection,
    confirmMerge,
    setSelectedMerge,
    setMergeResult,
    provider,
    apiKey,
    currentModel,
    localBaseUrl,
    logAIUsage,
    t,
  })

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

  const { handleSavePanel } = useCompendiumSave({
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
    onClosePanel: () => setIsPanelOpen(false),
  })

  const matchesQuery = useCallback((item) => {
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
  }, [query, activeSection]);

  const filteredCharacters = useMemo(
    () => characters.filter(matchesQuery).filter(i => matchesFilters(i, activeFilters, activeSection)),
    [characters, matchesQuery, activeFilters, activeSection]
  );
  const filteredLocations = useMemo(
    () => locations.filter(matchesQuery).filter(i => matchesFilters(i, activeFilters, activeSection)),
    [locations, matchesQuery, activeFilters, activeSection]
  );
  const filteredObjects = useMemo(
    () => objects.filter(matchesQuery).filter(i => matchesFilters(i, activeFilters, activeSection)),
    [objects, matchesQuery, activeFilters, activeSection]
  );
  const filteredLore = useMemo(
    () => lore.filter(matchesQuery).filter(i => matchesFilters(i, activeFilters, activeSection)),
    [lore, matchesQuery, activeFilters, activeSection]
  );

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
            <Zap size={10} className={`mpc-toggle-icon ${!isMpcEnabled ? 'mpc-toggle-icon--disabled' : ''}`} />
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
          <div className="search-bar">
            <Search size={14} color="var(--text-muted)" />
            <input
              placeholder={t('toolbar.buscar', { section: SECTIONS.find(s=>s.id===activeSection)?.label.toLowerCase() })}
              value={query}
              onChange={e => setQuery(e.target.value)}
              id="compendium-search-input"
            />
          </div>
          <CompendiumFilters
            isFilterOpen={isFilterOpen}
            activeFilters={activeFilters}
            activeSection={activeSection}
            characters={characters}
            locations={locations}
            objects={objects}
            lore={lore}
            onToggle={() => setIsFilterOpen(!isFilterOpen)}
            onSetActiveFilters={setActiveFilters}
          />
          
          <Tooltip content={t('unificar.boton_tooltip')}>
            <button 
              className={`btn ${isMerging || mergeResult ? 'btn-primary' : 'btn-ghost'} comp-merge-btn`}
              onClick={() => {
                if (isMerging || mergeResult) setShowMergeOverlay(true);
                else handleScanMerge();
              }}
              disabled={isScanningMerge || (characters.length + locations.length + objects.length + lore.length < 2 && !isMerging && !mergeResult)}
              id="compendium-merge-btn"
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
          {activeSection === 'characters' && filteredCharacters
            .map(c => <CharacterCard key={c.id} char={c} onEdit={handleEdit} onDelete={handleDelete} onToggleIgnore={handleToggleIgnore} />)}

          {activeSection === 'locations' && filteredLocations
            .map(l => <LocationCard key={l.id} loc={l} onEdit={handleEdit} onDelete={handleDelete} onToggleIgnore={handleToggleIgnore} />)}

          {activeSection === 'objects' && filteredObjects
            .map(o => <ObjectCard key={o.id} obj={o} onEdit={handleEdit} onDelete={handleDelete} onToggleIgnore={handleToggleIgnore} />)}

          {activeSection === 'lore' && filteredLore
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

      <CompendiumMpcOverlay
        isOpen={isMpcOverlayOpen}
        isClosing={isMpcOverlayClosing}
        proposals={mpcProposals}
        mpcStatus={mpcStatus}
        acceptingMpcId={acceptingMpcId}
        onClose={handleCloseMpcOverlay}
        onAccept={handleMpcAccept}
        onEdit={handleMpcEdit}
        onDismiss={handleMpcDismiss}
        onDismissPermanently={handleMpcDismissPermanently}
        onClearAll={clearMpcProposals}
      />

    </div>
  )
}
