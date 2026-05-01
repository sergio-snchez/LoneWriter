import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNovel } from '../context/NovelContext';
import ForceGraph3D from 'react-force-graph-3d';
import { DataSet, Timeline } from 'vis-timeline/standalone';
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
  useEffect(() => {
    const handleNavigate = (e) => {
      const { sceneId } = e.detail;
      if (!sceneId) return;

      // Find scene in acts to ensure we have the full object
      const allS = acts.flatMap(a => (a.chapters || []).flatMap(c => c.scenes || []));
      const targetScene = allS.find(s => s.id === sceneId);
      
      if (targetScene) {
        // Expand parents
        let actId = null;
        let chId = null;
        for (const act of acts) {
          for (const ch of act.chapters || []) {
            if (ch.scenes?.some(s => s.id === sceneId)) {
              actId = act.id;
              chId = ch.id;
              break;
            }
          }
          if (actId) break;
        }

        if (actId && chId) {
          setExpandedIds(prev => new Set([...prev, `act-${actId}`, `ch-${chId}`]));
        }
        
        setActiveScene(targetScene);
      }
    };

    window.addEventListener('navigate-to-scene', handleNavigate);
    return () => window.removeEventListener('navigate-to-scene', handleNavigate);
  }, [acts, setActiveScene, setExpandedIds]);

  const timelineRef = useRef(null);
  const timelineContainerRef = useRef(null);

  // Resize handling
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', updateDimensions);
    updateDimensions();

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Format scenes for timeline
  const timelineData = useMemo(() => {
    const items = [];
    
    // Flat list of all scenes from acts
    acts.forEach(act => {
      act.chapters?.forEach(ch => {
        ch.scenes?.forEach(sc => {
          if (sc.inGameDate) {
            let dateVal = sc.inGameDate;
            // Handle simple year entry (e.g., "0004" or "2024")
            if (/^\d{1,4}$/.test(dateVal)) {
              dateVal = `${dateVal.padStart(4, '0')}-01-01`;
            }
            items.push({
              id: sc.id,
              content: `<div class="timeline-item-inner">
                <span class="timeline-item-title">${sc.title}</span>
                <span class="timeline-item-meta">${ch.title}</span>
                ${sc.synopsis ? `<span class="timeline-item-excerpt">${sc.synopsis}</span>` : ''}
              </div>`,
              start: dateVal,
              type: 'box',
              className: 'nexus-timeline-item'
            });
          }
        });
      });
    });

    return items;
  }, [acts]);

  // The actual DataSet for vis-timeline
  // The actual DataSet for vis-timeline
  const timelineDataSet = useMemo(() => new DataSet(timelineData), [timelineData]);

  // Initialize Timeline
  useEffect(() => {
    if (!timelineContainerRef.current || timelineData.length === 0) {
      if (timelineRef.current) {
        timelineRef.current.destroy();
        timelineRef.current = null;
      }
      return;
    }

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
        item: 10,
        axis: 5
      }
    };

    try {
      if (timelineRef.current) {
        timelineRef.current.destroy();
        timelineRef.current = null;
      }

      timelineRef.current = new Timeline(timelineContainerRef.current, timelineDataSet, options);

      timelineRef.current.on('select', (properties) => {
        if (properties.items && properties.items.length > 0) {
          const sceneId = properties.items[0];
          if (onNavigate) onNavigate('editor');
          window.dispatchEvent(new CustomEvent('navigate-to-scene', { 
            detail: { sceneId: parseInt(sceneId) } 
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
  }, [timelineDataSet, onNavigate, timelineData.length]);

  const graphData = useMemo(() => {
    const nodes = [];
    const links = [];

    // Helper to add nodes
    const addNode = (item, group, defaultColor) => {
      nodes.push({
        id: `${group}_${item.id}`,
        name: item.name || item.title,
        group,
        color: defaultColor, // ALWAYS use the global color for the group
        val: group === 'characters' ? 2 : 1, // Characters slightly larger
        raw: item
      });
    };

    // 1. Add all entities as nodes
    characters.forEach(c => addNode(c, 'characters', ENTITY_COLORS.characters));
    locations.forEach(l => addNode(l, 'locations', ENTITY_COLORS.locations));
    objects.forEach(o => addNode(o, 'objects', ENTITY_COLORS.objects));
    lore.forEach(l => addNode(l, 'lore', ENTITY_COLORS.lore));

    // 2. Auto-generate links from existing compendium relationships
    
    // 2a. Character <-> Character (from relations)
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

    // 2b. Location <-> Character (from associatedCharacters)
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

    // 2c. Object <-> Character (from currentOwner)
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

    // 2d. Location <-> Object (from associatedObjects)
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

    // 2e. Lore <-> Any
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

    // 3. Add custom manual links from nexusLinks table
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
        <h1 className="nexus-title">{t('nexus.title')}</h1>
        <p className="nexus-subtitle">{t('nexus.subtitle')}</p>
      </header>

      <div className="nexus-content">
        
        {/* TIMELINE COMPONENT (Top) */}
        <div className="glass-panel nexus-timeline-container">
          {timelineData.length === 0 ? (
            <div className="nexus-placeholder-text">
              <p>{t('nexus.timeline_empty')}</p>
            </div>
          ) : (
            <div ref={timelineContainerRef} className="vis-timeline-wrapper"></div>
          )}
        </div>

        {/* 3D GRAPH COMPONENT (Bottom) */}
        <div className="glass-panel nexus-graph-container" ref={containerRef}>
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
              backgroundColor="rgba(0,0,0,0)" // Transparent to show mesh background
              showNavInfo={false}
              onNodeClick={node => {
                // Focus on node
                const distance = 100;
                const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
                if (graphRef.current) {
                  graphRef.current.cameraPosition(
                    { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
                    node, // lookAt ({ x, y, z })
                    2000  // ms transition duration
                  );
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
