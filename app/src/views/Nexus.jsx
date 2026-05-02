import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNovel } from '../context/NovelContext';
import ForceGraph3D from 'react-force-graph-3d';
import { DataSet, Timeline } from 'vis-timeline/standalone';
import { Lock, Unlock, Share2, Clock } from 'lucide-react';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import './Nexus.css';

const ENTITY_COLORS = {
  characters: '#5cb98a', // Green
  locations: '#6b9fd4',  // Blue
  objects: '#d4a853',    // Yellow
  lore: '#d45353'        // Red
};

export default function Nexus({ onNavigate }) {
  const { t } = useTranslation(['app', 'compendium']);
  const { activeNovel, acts, characters, locations, objects, lore, nexusLinks, setActiveScene, setExpandedIds } = useNovel();
  const graphRef = useRef();
  
  // Navigation from timeline listener
  // Global navigation is now managed in NovelContext


  const timelineRef = useRef(null);
  const timelineContainerRef = useRef(null);

  // Resize handling
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [activeView, setActiveView] = useState(() => {
    return localStorage.getItem('lw_nexus_active_view') || 'graph';
  });
  const [lockZoom, setLockZoom] = useState(() => {
    return localStorage.getItem('lw_nexus_lock_zoom') === 'true';
  });

  // Resize handling for the 3D graph container
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
  }, [activeView]); // Re-observe when view changes

  // Format scenes for timeline
  const timelineData = useMemo(() => {
    const items = [];
    
    // Flat list of all scenes from acts
    acts.forEach(act => {
      act.chapters?.forEach(ch => {
        ch.scenes?.forEach(sc => {
          if (sc.inGameDate) {
            let dateVal = sc.inGameDate;
            if (/^\d{1,4}$/.test(dateVal)) {
              dateVal = `${dateVal.padStart(4, '0')}-01-01`;
            }

            items.push({
              id: sc.id,
              content: `<div class="timeline-item-inner">${sc.synopsis || t('nexus.no_synopsis')}</div>`,
              start: dateVal,
              type: 'box',
              className: 'nexus-timeline-item'
            });
          }
        });
      });
    });

    return items;
  }, [acts, t]);

  // Use a ref for the DataSet to maintain a single reactive instance
  const timelineDataSetRef = useRef(new DataSet());

  // Update DataSet whenever timelineData changes
  useEffect(() => {
    timelineDataSetRef.current.clear();
    if (timelineData.length > 0) {
      timelineDataSetRef.current.add(timelineData);
      
      // Handle auto-fit or restoration
      if (timelineRef.current) {
        if (!lockZoom) {
          // Default behavior: auto-fit all items
          timelineRef.current.fit();
        } else {
          // Locked behavior: try to restore saved range
          const savedRange = localStorage.getItem('lw_nexus_timeline_range');
          if (savedRange) {
            try {
              const { start, end } = JSON.parse(savedRange);
              if (start && end) {
                timelineRef.current.setWindow(start, end, { animation: false });
              }
            } catch (err) {}
          }
        }
        // Force a redraw to handle visibility changes after navigation
        timelineRef.current.redraw();
      }
    }
  }, [timelineData, lockZoom]);

  // Initialize Timeline (only once)
  useEffect(() => {
    if (!timelineContainerRef.current) return;

    const options = {
      width: '100%',
      height: '100%',
      zoomMin: 1000 * 60 * 60 * 24, // One day
      zoomMax: 1000 * 60 * 60 * 24 * 365 * 100, // 100 years
      stack: true,
      showCurrentTime: false,
      orientation: 'top',
      editable: false,
      margin: {
        item: 15,
        axis: 10
      },
      timeAxis: { scale: 'day', step: 1 }
    };

    try {
      if (!timelineRef.current) {
        timelineRef.current = new Timeline(timelineContainerRef.current, timelineDataSetRef.current, options);
      } else {
        timelineRef.current.setOptions(options);
      }

      // Aggressive redraw sequence for stable rendering
      const forceRedraw = () => {
        if (timelineRef.current) {
          timelineRef.current.redraw();
          window.dispatchEvent(new Event('resize'));
        }
      };

      forceRedraw();
      setTimeout(forceRedraw, 100);
      setTimeout(forceRedraw, 500);

      // Restore saved range if locked and available
      if (lockZoom) {
        const savedRange = localStorage.getItem('lw_nexus_timeline_range');
        if (savedRange) {
          try {
            const { start, end } = JSON.parse(savedRange);
            if (start && end) {
              setTimeout(() => {
                if (timelineRef.current) {
                  timelineRef.current.setWindow(start, end, { animation: false });
                }
              }, 150);
            }
          } catch (err) {}
        }
      } else {
        setTimeout(() => {
          if (timelineRef.current) timelineRef.current.fit();
        }, 150);
      }

      timelineRef.current.on('select', (properties) => {
        if (properties.items && properties.items.length > 0) {
          const sceneId = properties.items[0];
          if (onNavigate) onNavigate('editor');
          window.dispatchEvent(new CustomEvent('navigate-to-scene', { 
            detail: { sceneId: sceneId }
          }));
        }
      });

      timelineRef.current.on('rangechanged', (properties) => {
        if (properties.byUser) {
          localStorage.setItem('lw_nexus_timeline_range', JSON.stringify({
            start: properties.start,
            end: properties.end
          }));
        }
      });
    } catch (err) {
      console.error("Timeline initialization error:", err);
    }

    return () => {
      if (timelineRef.current) {
        timelineRef.current.destroy();
        timelineRef.current = null;
      }
    };
  }, [activeView, onNavigate]); // Re-init when view changes to ensure container ref is valid

  const graphData = useMemo(() => {
    const nodes = [];
    const links = [];

    const addNode = (item, group, defaultColor) => {
      nodes.push({
        id: `${group}_${item.id}`,
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
          if (targetChar) {
            links.push({
              source: `characters_${c.id}`,
              target: `characters_${targetChar.id}`,
              label: rel.type || 'Relación',
              color: 'rgba(255,255,255,0.2)'
            });
          }
        });
      }
    });

    locations.forEach(loc => {
      if (loc.associatedCharacters && Array.isArray(loc.associatedCharacters)) {
        loc.associatedCharacters.forEach(charName => {
          const targetChar = characters.find(tc => tc.name === charName);
          if (targetChar) {
            links.push({
              source: `locations_${loc.id}`,
              target: `characters_${targetChar.id}`,
              label: 'Asociado',
              color: 'rgba(92, 185, 138, 0.4)'
            });
          }
        });
      }
    });

    objects.forEach(obj => {
      if (obj.currentOwner && obj.currentOwner !== 'Desconocido' && obj.currentOwner !== 'Desconocido / Ninguno' && obj.currentOwner !== 'Unknown / None') {
        const targetChar = characters.find(tc => tc.name === obj.currentOwner);
        if (targetChar) {
          links.push({
            source: `objects_${obj.id}`,
            target: `characters_${targetChar.id}`,
            label: 'Portador',
            color: 'rgba(212, 168, 83, 0.4)'
          });
        }
      }
    });

    locations.forEach(loc => {
      if (loc.associatedObjects && Array.isArray(loc.associatedObjects)) {
        loc.associatedObjects.forEach(objName => {
          const targetObj = objects.find(to => to.name === objName);
          if (targetObj) {
            links.push({
              source: `locations_${loc.id}`,
              target: `objects_${targetObj.id}`,
              label: 'Contiene',
              color: 'rgba(92, 185, 138, 0.4)'
            });
          }
        });
      }
    });

    lore.forEach(l => {
      if (l.associatedCharacters && Array.isArray(l.associatedCharacters)) {
        l.associatedCharacters.forEach(charName => {
          const targetChar = characters.find(tc => tc.name === charName);
          if (targetChar) {
            links.push({
              source: `lore_${l.id}`,
              target: `characters_${targetChar.id}`,
              label: 'Menciona',
              color: 'rgba(155, 114, 207, 0.4)'
            });
          }
        });
      }
      if (l.associatedLocations && Array.isArray(l.associatedLocations)) {
        l.associatedLocations.forEach(locName => {
          const targetLoc = locations.find(tc => tc.name === locName);
          if (targetLoc) {
            links.push({
              source: `lore_${l.id}`,
              target: `locations_${targetLoc.id}`,
              label: 'Menciona',
              color: 'rgba(155, 114, 207, 0.4)'
            });
          }
        });
      }
      if (l.associatedObjects && Array.isArray(l.associatedObjects)) {
        l.associatedObjects.forEach(objName => {
          const targetObj = objects.find(tc => tc.name === objName);
          if (targetObj) {
            links.push({
              source: `lore_${l.id}`,
              target: `objects_${targetObj.id}`,
              label: 'Menciona',
              color: 'rgba(155, 114, 207, 0.4)'
            });
          }
        });
      }
    });

    nexusLinks.forEach(link => {
      links.push({
        source: link.sourceId,
        target: link.targetId,
        label: link.label || '',
        color: 'rgba(255,255,255,0.4)',
        isManual: true
      });
    });

    return { nodes, links };
  }, [characters, locations, objects, lore, nexusLinks]);

  if (!activeNovel) return null;

  return (
    <div className="nexus-view fade-in">
      <header className="nexus-header">
        <div className="nexus-header__main">
          <h1 className="nexus-title">{t('nexus.title')}</h1>
          <p className="nexus-subtitle">{t('nexus.subtitle')}</p>
        </div>
        <div className="nexus-header__actions">
          {activeView === 'timeline' && (
            <button 
              className={`btn btn-ghost nexus-lock-btn ${lockZoom ? 'active' : ''}`}
              onClick={() => {
                const next = !lockZoom;
                setLockZoom(next);
                localStorage.setItem('lw_nexus_lock_zoom', next);
                if (next && timelineRef.current) {
                  const range = timelineRef.current.getWindow();
                  localStorage.setItem('lw_nexus_timeline_range', JSON.stringify({
                    start: range.start,
                    end: range.end
                  }));
                }
              }}
              title={lockZoom ? t('nexus.unlock_zoom') : t('nexus.lock_zoom')}
            >
              {lockZoom ? <Lock size={16} /> : <Unlock size={16} />}
              <span className="btn-label">{lockZoom ? t('nexus.locked') : t('nexus.unlocked')}</span>
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
              <span>{t('nexus.view_graph', 'Grafo 3D')}</span>
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
          <div className="glass-panel nexus-main-container">
            <div 
              ref={timelineContainerRef} 
              className="vis-timeline-wrapper"
              style={{ display: timelineData.length === 0 ? 'none' : 'block' }}
            ></div>
            {timelineData.length === 0 && (
              <div className="nexus-placeholder-text">
                <p>{t('nexus.timeline_empty')}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-panel nexus-main-container" ref={containerRef}>
            {graphData.nodes.length === 0 ? (
              <div className="nexus-placeholder-text">
                <p>{t('nexus.empty_graph')}</p>
              </div>
            ) : (
              <ForceGraph3D
                ref={graphRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeLabel="name"
                nodeColor="color"
                nodeVal="val"
                linkColor="color"
                linkWidth={link => link.isManual ? 1.5 : 0.5}
                backgroundColor="rgba(0,0,0,0)"
                showNavInfo={false}
                onNodeClick={node => {
                  const distance = 100;
                  const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
                  if (graphRef.current) {
                    graphRef.current.cameraPosition(
                      { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                      node,
                      2000
                    );
                  }
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
