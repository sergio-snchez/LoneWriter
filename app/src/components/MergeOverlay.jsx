import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { 
  Combine, X, CheckCircle2, Loader2, ChevronRight 
} from 'lucide-react';
import { useNovel, useAI, useModal } from '../context';
import './MergeOverlay.css';

export default function MergeOverlay() {
  const { t } = useTranslation('compendium');
  const { provider, apiKey, currentModel, localBaseUrl, logAIUsage } = useAI();
  const { openModal } = useModal();
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
      openModal('alert', { message: t('unificar.sin_ia') });
      return;
    }
    try {
      const aiConfig = { provider, apiKey, model: currentModel, localBaseUrl };
      await globalHandleMergeSelection(entities, mergeSection, aiConfig, logAIUsage);
    } catch (err) {
      openModal('alert', { message: t('unificar.error_fusion', { error: err.message }) });
    }
  };

  const handleConfirmMerge = async (finalData = null) => {
    try {
      await confirmMerge(mergeSection, finalData);
    } catch (err) {
      openModal('alert', { message: t('unificar.error_confirmar', { error: err.message }) });
    }
  };

  const handleSkipMerge = () => {
    // In global context, we don't have a simple skip, but we can just clear result
    // To implement "Skip", we'd need more logic. For now, let's just allow clearing.
  };

  return createPortal(
    <div 
      className={`compendium-mpc-overlay merge-overlay${isMergeOverlayClosing ? ' compendium-mpc-overlay--closing' : ''}${isMerging ? ' merge-overlay--merging' : ''}`} 
      onClick={() => {
        if (!isMerging) closeMergeOverlay();
      }}
    >
      <div 
        className={`compendium-mpc-overlay__panel ${isMergeOverlayClosing ? ' compendium-mpc-overlay__panel--closing' : ''}`} 
        onClick={(e) => e.stopPropagation()}
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
              <CheckCircle2 size={32} className="merge-overlay__success-icon" />
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
    <div className="merge-result">
      <div className="merge-result__label">
        {t('unificar.fusion_preview')}
      </div>
      
      <div className="merge-result__candidates">
        <label 
          className={`merge-candidate${selectedName === candidate.name1 ? ' merge-candidate--selected' : ''}`}
        >
          <input 
            type="radio" 
            name="selectedName" 
            checked={selectedName === candidate.name1}
            onChange={() => handleNameSelect(candidate.name1)}
            className="merge-candidate__radio"
          />
          <div className="merge-candidate__name">{candidate.name1}</div>
          <div className="merge-candidate__preview">
            "{getPreviewText(candidate.entity1)}"
          </div>
        </label>
        
        <label 
          className={`merge-candidate${selectedName === candidate.name2 ? ' merge-candidate--selected' : ''}`}
        >
          <input 
            type="radio" 
            name="selectedName" 
            checked={selectedName === candidate.name2}
            onChange={() => handleNameSelect(candidate.name2)}
            className="merge-candidate__radio"
          />
          <div className="merge-candidate__name">{candidate.name2}</div>
          <div className="merge-candidate__preview">
            "{getPreviewText(candidate.entity2)}"
          </div>
        </label>
      </div>

      <div className="merge-result__preview">
        <div className="merge-result__preview-name">{selectedName}</div>
        <p className="merge-result__preview-content">
          {finalData.description || finalData.summary}
        </p>
        
        {finalData.traits && finalData.traits.length > 0 && (
          <div className="merge-result__traits">
            {finalData.traits.map(t => (
              <span key={t} className="merge-result__trait">{t}</span>
            ))}
          </div>
        ) || finalData.tags && finalData.tags.length > 0 && (
          <div className="merge-result__traits">
            {finalData.tags.map(t => (
              <span key={t} className="merge-result__trait">{t}</span>
            ))}
          </div>
        )}
      </div>

      <div className="merge-result__actions">
        <button className="btn btn-ghost merge-result__btn-skip" onClick={onSkip}>{t('unificar.saltar')}</button>
        <button className="btn btn-primary merge-result__btn-confirm" onClick={() => onConfirm(finalData)}>
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
    <div className="merge-candidates-view">
      <div className="merge-candidates-view__header">
        <span className="merge-candidates-view__label">
          {t('unificar.grupo')}
        </span>
        <div className="merge-candidates-view__badge">
          {group.size} {t('unificar.elementos')}
        </div>
      </div>
      
      <div className="merge-candidates-view__list">
        {group.entities.map((entity) => {
          const isSelected = selectedIds.includes(entity.id);
          const isMergingEntity = mergingEntitiesIds.includes(entity.id);
          return (
            <div 
              key={entity.id}
              onClick={() => toggleEntity(entity.id)}
              className={`merge-entity${isSelected ? ' merge-entity--selected' : ''}${isMerging ? ' merge-entity--disabled' : ''}${isMergingEntity ? ' merge-entity--merging' : ''}`}
            >
              <div className={`merge-entity__checkbox${isSelected ? ' merge-entity__checkbox--selected' : ''}`}>
                {isSelected && <CheckCircle2 size={12} strokeWidth={3} />}
              </div>
              <div className="merge-entity__info">
                <div className="merge-entity__name">
                  {entity.name || entity.title}
                </div>
                <div className={`merge-entity__desc${isMergingEntity ? ' merge-entity__desc--merging' : ''}`}>
                  {isMergingEntity 
                    ? t('unificar.fusionando_cargando') 
                    : `"${getPreviewText(entity)}"`
                  }
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="merge-candidates-view__btn-wrap">
        <button 
          className="btn btn-primary merge-candidates-view__merge-btn" 
          onClick={() => onMerge(selectedEntities)}
          disabled={selectedIds.length < 2 || isMerging}
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
      
      <div className="merge-candidates-view__nav">
        <button 
          className="btn btn-ghost" 
          disabled={selectedIdx === 0}
          onClick={() => setSelectedIdx(i => i - 1)}
        >
          <ChevronRight size={14} className="merge-nav__btn-prev" />
        </button>
        <span className="merge-candidates-view__page">
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
