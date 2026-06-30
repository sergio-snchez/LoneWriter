import { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { useNovel, useThemeContext } from '../context';
import { Clock, AlertCircle, Box, Square, Share2 } from 'lucide-react';
import { StorylineChart } from '../components';
import NexusGraph from './nexus/NexusGraph';
import './Nexus.css';

const ENTITY_COLORS = {
  characters: '#00ff88',
  locations: '#00aaff',
  objects: '#ffcc00',
  lore: '#ff4444'
};

export default function Nexus({ onNavigate }) {
  const { t } = useTranslation(['app', 'compendium']);
  const { activeNovel, acts, characters, locations, objects, lore, nexusLinks, setActiveScene, setExpandedIds } = useNovel();
  const { theme } = useThemeContext();

  const themeCtx = useMemo(() => {
    const isLight = theme === 'light' || theme === 'sepia';
    return {
      isLight,
      textMain: isLight ? '#1a1a1f' : '#ffffff',
      textMuted: isLight ? 'rgba(26, 26, 31, 0.75)' : 'rgba(255, 255, 255, 0.35)',
      linkPrimary: isLight ? 'rgba(26, 26, 31, 0.55)' : 'rgba(255, 255, 255, 0.45)',
      bgGraph: isLight ? 'rgba(0, 0, 0, 0.22)' : 'rgba(0, 0, 0, 0)'
    };
  }, [theme]);

  // Resize handling
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [activeView, setActiveView] = useState(() => {
    return localStorage.getItem('lw_nexus_active_view') || 'timeline';
  });
  const [renderError, setRenderError] = useState(null);
  const [graphMode, setGraphMode] = useState(() => {
    return localStorage.getItem('lw_nexus_graph_mode') || '3D';
  });

  const clickTracker = useRef({ time: 0, id: null });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [activeView]);

  const graphData = useMemo(() => {
    const nodes = [];
    const links = [];
    const addNode = (item, group, defaultColor) => {
      nodes.push({
        id: `${group}_${item.id}`,
        rawId: item.id,
        name: item.name || item.title,
        group,
        color: defaultColor,
        val: group === 'characters' ? 2 : 1,
        raw: item
      });
    };
    characters.forEach(c => addNode(c, 'characters', ENTITY_COLORS.characters));
    locations.forEach(l => addNode(l, 'locations', ENTITY_COLORS.locations));
    objects.forEach(o => addNode(o, 'objects', ENTITY_COLORS.objects));
    lore.forEach(l => addNode(l, 'lore', ENTITY_COLORS.lore));

    characters.forEach(c => {
      if (c.relations && Array.isArray(c.relations)) {
        c.relations.forEach(rel => {
          const targetChar = characters.find(tc => tc.name === rel.name);
          if (targetChar) links.push({ source: `characters_${c.id}`, target: `characters_${targetChar.id}`, label: rel.type || t('nexus.rel_relacion'), color: 'rgba(255,255,255,0.2)' });
        });
      }
    });
    locations.forEach(loc => {
      if (loc.associatedCharacters && Array.isArray(loc.associatedCharacters)) {
        loc.associatedCharacters.forEach(charName => {
          const targetChar = characters.find(tc => tc.name === charName);
          if (targetChar) links.push({ source: `locations_${loc.id}`, target: `characters_${targetChar.id}`, label: t('nexus.rel_asociado'), color: 'rgba(92, 185, 138, 0.4)' });
        });
      }
    });
    objects.forEach(obj => {
      if (obj.currentOwner && obj.currentOwner.trim() !== '') {
        const targetChar = characters.find(tc => tc.name === obj.currentOwner);
        if (targetChar) links.push({ source: `objects_${obj.id}`, target: `characters_${targetChar.id}`, label: t('nexus.rel_portador'), color: 'rgba(212, 168, 83, 0.4)' });
      }
    });
    locations.forEach(loc => {
      if (loc.associatedObjects && Array.isArray(loc.associatedObjects)) {
        loc.associatedObjects.forEach(objName => {
          const targetObj = objects.find(to => to.name === objName);
          if (targetObj) links.push({ source: `locations_${loc.id}`, target: `objects_${targetObj.id}`, label: t('nexus.rel_contiene'), color: 'rgba(92, 185, 138, 0.4)' });
        });
      }
    });
    lore.forEach(l => {
      if (l.associatedCharacters && Array.isArray(l.associatedCharacters)) {
        l.associatedCharacters.forEach(charName => {
          const targetChar = characters.find(tc => tc.name === charName);
          if (targetChar) links.push({ source: `lore_${l.id}`, target: `characters_${targetChar.id}`, label: t('nexus.rel_menciona'), color: 'rgba(155, 114, 207, 0.4)' });
        });
      }
      if (l.associatedLocations && Array.isArray(l.associatedLocations)) {
        l.associatedLocations.forEach(locName => {
          const targetLoc = locations.find(tc => tc.name === locName);
          if (targetLoc) links.push({ source: `lore_${l.id}`, target: `locations_${targetLoc.id}`, label: t('nexus.rel_menciona'), color: 'rgba(155, 114, 207, 0.4)' });
        });
      }
      if (l.associatedObjects && Array.isArray(l.associatedObjects)) {
        l.associatedObjects.forEach(objName => {
          const targetObj = objects.find(tc => tc.name === objName);
          if (targetObj) links.push({ source: `lore_${l.id}`, target: `objects_${targetObj.id}`, label: t('nexus.rel_menciona'), color: 'rgba(155, 114, 207, 0.4)' });
        });
      }
    });

    const uniqueLinksMap = new Map();
    links.forEach(l => {
      const nodesArr = [l.source, l.target].sort();
      const key = `${nodesArr[0]}_${nodesArr[1]}`;
      if (!uniqueLinksMap.has(key)) uniqueLinksMap.set(key, l);
    });
    const dedupedLinks = Array.from(uniqueLinksMap.values());

    const counts = {};
    dedupedLinks.forEach(l => {
      counts[l.source] = (counts[l.source] || 0) + 1;
      counts[l.target] = (counts[l.target] || 0) + 1;
    });
    nodes.forEach(n => { n.degree = counts[n.id] || 0; n.isImportant = n.degree > 2; });

    const biLinks = [];
    dedupedLinks.forEach(l => {
      const s = nodes.find(n => n.id === l.source);
      const t = nodes.find(n => n.id === l.target);
      if (s && t) {
        biLinks.push({ ...l, id: `${l.source}_${l.target}_fwd`, emitColor: s.color, emitSpeed: Math.min(0.0075, (0.0015 + (s.degree * 0.00075)) * (0.4 + Math.random() * 1.2)), pulseOffset: Math.random() * 10, isPrimary: true });
        biLinks.push({ ...l, id: `${l.source}_${l.target}_rev`, source: l.target, target: l.source, emitColor: t.color, emitSpeed: Math.min(0.0075, (0.0015 + (t.degree * 0.00075)) * (0.4 + Math.random() * 1.2)), pulseOffset: Math.random() * 10, isPrimary: false });
      }
    });

    return { nodes, links: biLinks };
  }, [characters, locations, objects, lore, nexusLinks]);

  if (!activeNovel) return null;

  if (renderError) {
    return (
      <div className="nexus-view nexus-view--error">
        <div className="nexus-error-card glass-panel">
          <AlertCircle size={48} className="text-danger" />
          <h2>{t('nexus.crash_title', 'Error en Nexus')}</h2>
          <p>{t('nexus.crash_message', 'Se ha producido un error al cargar la visualización.')}</p>
          <pre>{renderError}</pre>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            {t('nexus.reload', 'Recargar')}
          </button>
        </div>
      </div>
    );
  }

  const handleNodeClick = (node) => {
    const now = Date.now();
    if (clickTracker.current.id === node.id && now - clickTracker.current.time < 350) {
      onNavigate('compendium');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('navigate-to-compendium-item', { detail: { id: node.rawId, group: node.group } }));
      }, 100);
    }
    clickTracker.current = { time: now, id: node.id };
  };

  const handleSceneNavigate = (sceneId) => {
    for (const act of acts) {
      for (const chapter of act.chapters || []) {
        const scene = (chapter.scenes || []).find(s => s.id === sceneId);
        if (scene) {
          setExpandedIds(prev => new Set([...prev, `act-${act.id}`, `ch-${chapter.id}`]));
          setActiveScene(scene);
          onNavigate('editor');
          return;
        }
      }
    }
  };

  return (
    <div className="nexus-view fade-in">
      <header className="nexus-header">
        <div className="nexus-header__main">
          <h1 className="nexus-title">{t('nexus.title')}</h1>
          <p className="nexus-subtitle">{t('nexus.subtitle')}</p>
        </div>
        <div className="nexus-header__actions">
          {activeView === 'graph' && (
            <button 
              className={`btn btn-ghost nexus-lock-btn ${graphMode === '3D' ? 'active' : ''}`}
              onClick={() => {
                const next = graphMode === '3D' ? '2D' : '3D';
                setGraphMode(next);
                localStorage.setItem('lw_nexus_graph_mode', next);
              }}
              title={graphMode === '3D' ? t('nexus.view_2d') : t('nexus.view_3d')}
            >
              {graphMode === '3D' ? <Box size={16} /> : <Square size={16} />}
              <span className="btn-label">
                {graphMode === '3D' ? t('nexus.view_3d') : t('nexus.view_2d')}
              </span>
            </button>
          )}

          <div className="nexus-view-selector">
            <button 
              className={`nexus-view-btn ${activeView === 'graph' ? 'active' : ''}`}
              onClick={() => {
                setActiveView('graph');
                localStorage.setItem('lw_nexus_active_view', 'graph');
              }}
            >
              <div className="nexus-view-btn-icon"><Share2 size={16} /></div>
              <span>{t('nexus.view_graph', 'Grafo')}</span>
            </button>
            <button 
              className={`nexus-view-btn ${activeView === 'timeline' ? 'active' : ''}`}
              onClick={() => {
                setActiveView('timeline');
                localStorage.setItem('lw_nexus_active_view', 'timeline');
              }}
            >
              <div className="nexus-view-btn-icon"><Clock size={16} /></div>
              <span>{t('nexus.view_timeline', 'Línea de Tiempo')}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="nexus-content">
        {activeView === 'timeline' ? (
          <div className="glass-panel nexus-main-container" ref={containerRef}>
            <StorylineChart 
              acts={acts} 
              characters={characters}
              onNavigate={handleSceneNavigate} 
              dimensions={dimensions} 
              themeCtx={themeCtx} 
            />
          </div>
        ) : (
          <NexusGraph
            graphData={graphData}
            dimensions={dimensions}
            themeCtx={themeCtx}
            currentTheme={theme}
            graphMode={graphMode}
            setGraphMode={setGraphMode}
            t={t}
            containerRef={containerRef}
            onNodeClick={handleNodeClick}
          />
        )}
      </div>
    </div>
  );
}
Nexus.propTypes = {
  onNavigate: PropTypes.func,
};
