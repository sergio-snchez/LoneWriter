import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { 
  Combine, X, CheckCircle2, Loader2, ChevronRight 
} from 'lucide-react';
import { useNovel } from '../context/NovelContext';
import { useAI } from '../context/AIContext';

export function MergeOverlay() {
  const { t } = useTranslation('compendium');
  const { provider, apiKey, currentModel, localBaseUrl, logAIUsage } = useAI();
  const {
    mergeGroups,
    selectedMerge,
    mergeResult,
    isMerging,
    mergingEntitiesIds,
    selectedMergeIdx, setSelectedMergeIdx,
    showMergeOverlay,
    isMergeOverlayClosing,
    mergeSection,
    handleMergeSelection: globalHandleMergeSelection,
    confirmMerge,
    closeMergeOverlay,
    skipMerge
  } = useNovel();

  if (!showMergeOverlay) return null;

  const handleMergeSelection = async (entities) => {
    if (!apiKey && provider !== 'local') {
      alert(t('unificar.sin_ia'));
      return;
    }
    // Safety check: if apiKey is missing but provider is not local, it might still be loading
    if (provider !== 'local' && !apiKey) {
       alert(t('unificar.error_provider'));
       return;
    }
    try {
      const aiConfig = { provider, apiKey, model: currentModel, localBaseUrl };
      await globalHandleMergeSelection(entities, mergeSection, aiConfig, logAIUsage);
    } catch (err) {
      alert(t('unificar.error_fusion', { error: err.message }));
    }
  };

  const handleConfirmMerge = async (finalData = null) => {
    try {
      await confirmMerge(mergeSection, finalData);
    } catch (err) {
      alert(t('unificar.error_confirmar', { error: err.message }));
    }
  };

  const handleSkipMerge = () => {
    // In global context, we don't have a simple skip, but we can just clear result
    // To implement "Skip", we'd need more logic. For now, let's just allow clearing.
  };

  return createPortal(
    <div 
      className={`compendium-mpc-overlay ${isMergeOverlayClosing ? 'compendium-mpc-overlay--closing' : ''}`} 
      onClick={() => {
        if (!isMerging) closeMergeOverlay();
      }}
      style={{ 
        background: 'rgba(0, 0, 0, 0.5)', 
        backdropFilter: 'blur(2px)', 
        pointerEvents: 'auto', 
        zIndex: 9999,
        cursor: isMerging ? 'wait' : 'default'
      }}
    >
      <div 
        className={`compendium-mpc-overlay__panel ${isMergeOverlayClosing ? ' compendium-mpc-overlay__panel--closing' : ''}`} 
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto', cursor: 'default' }}
      >
        <div className="compendium-mpc-overlay__header">
          <div className="compendium-mpc-overlay__title">
            <Combine size={18} className="compendium-mpc-overlay__icon" />
            <span>{t('unificar.titulo')}</span>
          </div>
          {!isMerging && (
            <button className="btn btn-ghost btn-icon" onClick={closeMergeOverlay}>
              <X size={18} />
            </button>
          )}
        </div>
        
        <div className="compendium-mpc-overlay__body">
          {mergeGroups.length === 0 ? (
            <div className="compendium-mpc-overlay__empty">
              <CheckCircle2 size={32} style={{ color: '#5cb98a' }} />
              <p>{t('unificar.sin_candidatos')}</p>
            </div>
          ) : selectedMerge && mergeResult ? (
            <MergeResultView 
              candidate={selectedMerge} 
              result={mergeResult}
              onConfirm={handleConfirmMerge}
              onSkip={skipMerge}
              activeSection={mergeSection}
            />
          ) : (
            <MergeCandidatesView 
              groups={mergeGroups} 
              selectedIdx={selectedMergeIdx} 
              setSelectedIdx={setSelectedMergeIdx}
              onMerge={handleMergeSelection}
              isMerging={isMerging}
              mergingEntitiesIds={mergingEntitiesIds}
            />
          )
          }
        </div>
      </div>
    </div>,
    document.body
  );
}

function MergeResultView({ candidate, result, onConfirm, onSkip, activeSection }) {
  const { t } = useTranslation('compendium');
  const nameField = activeSection === 'lore' ? 'title' : 'name';
  const [selectedName, setSelectedName] = useState(result[nameField] || candidate.name1 || candidate.name2 || '');
  const [finalData, setFinalData] = useState(result);
  
  const handleNameSelect = (name) => {
    setSelectedName(name);
    setFinalData(prev => ({ ...prev, [nameField]: name }));
  };
  
  const getPreviewText = (entity, maxLength = 60) => {
    const preview = entity.description || entity.summary || entity.traits?.join(', ') || entity.occupation || entity.role || '';
    if (preview.length <= maxLength) return preview;
    return preview.substring(0, maxLength) + '...';
  };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 11, color: '#fff', textTransform: 'uppercase', fontWeight: 600 }}>
        {t('unificar.fusion_preview')}
      </div>
      
      <div style={{ display: 'flex', gap: 8 }}>
        <label 
          style={{ 
            flex: 1, 
            padding: 10, 
            border: selectedName === candidate.name1 ? '2px solid var(--accent)' : '1px solid var(--border)', 
            borderRadius: 8, 
            background: selectedName === candidate.name1 ? 'var(--accent-dim)' : 'var(--bg-dim)',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          <input 
            type="radio" 
            name="selectedName" 
            checked={selectedName === candidate.name1}
            onChange={() => handleNameSelect(candidate.name1)}
            style={{ marginRight: 6 }}
          />
          <div style={{ fontWeight: 600, fontSize: 13 }}>{candidate.name1}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
            "{getPreviewText(candidate.entity1)}"
          </div>
        </label>
        
        <label 
          style={{ 
            flex: 1, 
            padding: 10, 
            border: selectedName === candidate.name2 ? '2px solid var(--accent)' : '1px solid var(--border)', 
            borderRadius: 8, 
            background: selectedName === candidate.name2 ? 'var(--accent-dim)' : 'var(--bg-dim)',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          <input 
            type="radio" 
            name="selectedName" 
            checked={selectedName === candidate.name2}
            onChange={() => handleNameSelect(candidate.name2)}
            style={{ marginRight: 6 }}
          />
          <div style={{ fontWeight: 600, fontSize: 13 }}>{candidate.name2}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
            "{getPreviewText(candidate.entity2)}"
          </div>
        </label>
      </div>

      <div style={{ 
        padding: 15, 
        border: '1px solid var(--border)', 
        borderRadius: 8, 
        background: 'var(--bg-card)',
        maxHeight: 250,
        overflowY: 'auto'
      }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: 'var(--accent)' }}>{selectedName}</div>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
          {finalData.description || finalData.summary}
        </p>
        
        {finalData.traits && finalData.traits.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 12 }}>
            {finalData.traits.map(t => (
              <span key={t} style={{ fontSize: 10, padding: '2px 6px', background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 4 }}>
                {t}
              </span>
            ))}
          </div>
        ) || finalData.tags && finalData.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 12 }}>
            {finalData.tags.map(t => (
              <span key={t} style={{ fontSize: 10, padding: '2px 6px', background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 4 }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button className="btn btn-ghost" onClick={onSkip} style={{ flex: 1 }}>{t('unificar.saltar')}</button>
        <button className="btn btn-primary" onClick={() => onConfirm(finalData)} style={{ flex: 2 }}>
          <CheckCircle2 size={16} />
          {t('unificar.confirmar')}
        </button>
      </div>
    </div>
  );
}

function MergeCandidatesView({ groups, selectedIdx, setSelectedIdx, onMerge, isMerging, mergingEntitiesIds }) {
  const { t } = useTranslation('compendium');
  const [selectedIds, setSelectedIds] = useState([]);
  
  const current = groups[selectedIdx];

  useEffect(() => {
    if (current?.type === 'group') {
      setSelectedIds([]);
    }
  }, [current?.entities]);

  // Clamp index if groups list shrinks
  useEffect(() => {
    if (selectedIdx >= groups.length && groups.length > 0) {
      setSelectedIdx(Math.max(0, groups.length - 1));
    }
  }, [groups.length, selectedIdx]);
  
  const getPreviewText = (entity, maxLength = 60) => {
    const preview = entity.description || entity.summary || entity.traits?.join(', ') || entity.occupation || entity.role || '';
    if (preview.length <= maxLength) return preview;
    return preview.substring(0, maxLength) + '...';
  };
  
  const toggleEntity = (id) => {
    if (isMerging) return;
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  if (!current) {
    return (
      <div className="compendium-mpc-overlay__empty">
        <p>{t('unificar.sin_candidatos')}</p>
      </div>
    );
  }
  
  const group = current;
  const selectedEntities = group.entities.filter(e => selectedIds.includes(e.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#fff', textTransform: 'uppercase', fontWeight: 600 }}>
          {t('unificar.grupo')}
        </span>
        <div style={{ 
          background: 'var(--accent)', 
          color: '#fff', 
          fontWeight: 700, 
          fontSize: 12, 
          padding: '4px 10px', 
          borderRadius: 12 
        }}>
          {group.size} {t('unificar.elementos')}
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 8,
        padding: 10, 
        border: '1px solid var(--border)', 
        borderRadius: 8, 
        background: 'rgba(0,0,0,0.1)',
        maxHeight: 320,
        overflowY: 'auto'
      }}>
        {group.entities.map((entity) => {
          const isSelected = selectedIds.includes(entity.id);
          return (
            <div 
              key={entity.id}
              onClick={() => toggleEntity(entity.id)}
              style={{ 
                padding: 12,
                borderRadius: 8,
                background: isSelected ? 'rgba(212, 168, 83, 0.15)' : 'var(--bg-dim)',
                border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                cursor: isMerging ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.2s',
                animation: mergingEntitiesIds.includes(entity.id) ? 'mpc-pulse 2s infinite' : 'none'
              }}
            >
              <div style={{ 
                width: 18, 
                height: 18, 
                borderRadius: 4, 
                border: '2px solid var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isSelected ? 'var(--accent)' : 'transparent',
                color: 'white'
              }}>
                {isSelected && <CheckCircle2 size={12} strokeWidth={3} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                  {entity.name || entity.title}
                </div>
                <div style={{ 
                  fontSize: 11, 
                  color: mergingEntitiesIds.includes(entity.id) ? '#fff' : 'var(--text-secondary)', 
                  marginTop: 4, 
                  fontStyle: 'italic',
                  lineHeight: 1.4,
                  opacity: 1
                }}>
                  {mergingEntitiesIds.includes(entity.id) 
                    ? t('unificar.fusionando_cargando') 
                    : `"${getPreviewText(entity)}"`
                  }
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '0 4px' }}>
        <button 
          className="btn btn-primary" 
          onClick={() => onMerge(selectedEntities)}
          disabled={selectedIds.length < 2 || isMerging}
          style={{ width: '100%', gap: 8, height: 44 }}
        >
          {isMerging ? (
            <>
              <Loader2 size={16} className="spin" />
              {t('unificar.fusionando_cargando')}
            </>
          ) : (
            <>
              <Combine size={16} />
              {t('unificar.fusionar_seleccion')} ({selectedIds.length})
            </>
          )}
        </button>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <button 
          className="btn btn-ghost" 
          disabled={selectedIdx === 0}
          onClick={() => setSelectedIdx(i => i - 1)}
        >
          <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {selectedIdx + 1} / {groups.length}
        </span>
        <button 
          className="btn btn-ghost" 
          disabled={selectedIdx === groups.length - 1}
          onClick={() => setSelectedIdx(i => i + 1)}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
