import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNovel } from '../context/NovelContext';
import ForceGraph3D from 'react-force-graph-3d';
import ForceGraph2D from 'react-force-graph-2d';
import { DataSet, Timeline } from 'vis-timeline/standalone';
import { Lock, Unlock, Share2, Clock, Box, Square, AlertCircle } from 'lucide-react';
import * as THREE from 'three';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import './Nexus.css';

const ENTITY_COLORS = {
  characters: '#00ff88', // Vibrant Green/Neon
  locations: '#00aaff',  // Vibrant Blue/Cyan
  objects: '#ffcc00',    // Vibrant Gold/Yellow
  lore: '#ff4444'        // Vibrant Red/Coral
};

const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string') return '255, 255, 255';
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
    '255, 255, 255';
};

export default function Nexus({ onNavigate }) {
  const { t, i18n } = useTranslation(['app', 'compendium']);
  const { activeNovel, acts, characters, locations, objects, lore, nexusLinks, setActiveScene, setExpandedIds } = useNovel();
  const graphRef = useRef();
  
  // Theme tracking for dynamic graph styling
  const [currentTheme, setCurrentTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          setCurrentTheme(document.documentElement.getAttribute('data-theme') || 'dark');
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const themeCtx = useMemo(() => {
    const isLight = currentTheme === 'light' || currentTheme === 'sepia';
    return {
      isLight,
      textMain: isLight ? '#1a1a1f' : '#ffffff',
      textMuted: isLight ? 'rgba(26, 26, 31, 0.65)' : 'rgba(255, 255, 255, 0.35)',
      linkPrimary: isLight ? 'rgba(26, 26, 31, 0.25)' : 'rgba(255, 255, 255, 0.45)'
    };
  }, [currentTheme]);
  
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
  const [renderError, setRenderError] = useState(null);
  const [graphMode, setGraphMode] = useState(() => {
    return localStorage.getItem('lw_nexus_graph_mode') || '3D';
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

  // Persistent dataset for timeline to avoid re-renders
  const timelineDataSetRef = useRef(null);
  if (!timelineDataSetRef.current && DataSet) {
    timelineDataSetRef.current = new DataSet();
  }

  // Update DataSet whenever timelineData changes
  useEffect(() => {
    if (!timelineDataSetRef.current) return;
    try {
      timelineDataSetRef.current.clear();
      if (timelineData.length > 0) {
        timelineDataSetRef.current.add(timelineData);
      }
      
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
    } catch (err) {
      console.error('[Nexus] Error updating timeline dataset:', err);
      setRenderError(err.message);
    }
  }, [timelineData, lockZoom]);

  // Initialize Timeline (only once)
  useEffect(() => {
    if (activeView !== 'timeline' || !timelineContainerRef.current) return;

    try {
      const options = {
        stack: true,
        selectable: true,
        showCurrentTime: true,
        zoomMin: 1000 * 60 * 60 * 24 * 2, // 2 days minimum zoom
        zoomMax: 1000 * 60 * 60 * 24 * 365 * 1000, // 1000 years
        editable: false,
        margin: { item: 10, axis: 5 },
        orientation: 'top',
        timeAxis: { scale: 'day', step: 1 },
        template: (item) => item.content,
        format: {
          minorLabels: {
            millisecond: 'D MMM',
            second: 'D MMM',
            minute: 'D MMM',
            hour: 'D MMM',
            weekday: 'ddd D MMM',
            day: 'D MMM',
            month: 'MMM YYYY',
            year: 'YYYY'
          },
          majorLabels: {
            millisecond: 'YYYY',
            second: 'YYYY',
            minute: 'YYYY',
            hour: 'YYYY',
            weekday: 'MMMM YYYY',
            day: 'MMMM YYYY',
            month: 'YYYY',
            year: ''
          }
        },
        // Localization
        locale: i18n.language,
        locales: {
          [i18n.language]: {
            current: t('nexus.current') || 'Actual',
            time: t('nexus.time') || 'Tiempo',
          }
        }
      };

      if (!timelineRef.current) {
        timelineRef.current = new Timeline(timelineContainerRef.current, timelineDataSetRef.current, options);
      } else {
        timelineRef.current.setOptions(options);
      }

      // Restore zoom if available
      const savedRange = localStorage.getItem('lw_nexus_timeline_range');
      if (savedRange && !lockZoom) {
        try {
          const { start, end } = JSON.parse(savedRange);
          timelineRef.current.setWindow(start, end, { animation: false });
        } catch (e) {
          console.warn('Could not restore timeline range', e);
        }
      }

      // Cleanup old listeners to prevent duplicates
      timelineRef.current.off('select');
      timelineRef.current.off('rangechanged');

      timelineRef.current.on('select', (properties) => {
        if (properties.items && properties.items.length > 0) {
          const itemId = String(properties.items[0]);
          const sceneId = itemId.replace('scene-', '');
          
          window.dispatchEvent(new CustomEvent('navigate-to-scene', { detail: { sceneId } }));
          onNavigate('editor');
        }
      });

      timelineRef.current.on('rangechanged', (properties) => {
        if (!lockZoom) {
          localStorage.setItem('lw_nexus_timeline_range', JSON.stringify({
            start: properties.start,
            end: properties.end
          }));
        }
      });

    } catch (err) {
      console.error('[Nexus] Error initializing timeline:', err);
      setRenderError(err.message);
    }

    return () => {
      if (timelineRef.current) {
        try {
          timelineRef.current.destroy();
          timelineRef.current = null;
        } catch (e) {
          console.warn('Error destroying timeline', e);
        }
      }
    };
  }, [activeView, onNavigate, i18n.language, t, lockZoom]);

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

    // 1. Generate unique links only (deduplicate)
    const uniqueLinksMap = new Map();
    links.forEach(l => {
      // Create a sorted key to be direction-agnostic for deduplication
      const nodesArr = [l.source, l.target].sort();
      const key = `${nodesArr[0]}_${nodesArr[1]}`;
      
      if (!uniqueLinksMap.has(key)) {
        uniqueLinksMap.set(key, l);
      }
    });
    const dedupedLinks = Array.from(uniqueLinksMap.values());

    // 2. Calculate degree based on unique neighbors
    const counts = {};
    dedupedLinks.forEach(l => {
      counts[l.source] = (counts[l.source] || 0) + 1;
      counts[l.target] = (counts[l.target] || 0) + 1;
    });

    nodes.forEach(n => {
      n.degree = counts[n.id] || 0;
      n.isImportant = n.degree > 2;
    });

    // 3. Create BI-DIRECTIONAL links for particles (A->B and B->A)
    const biLinks = [];
    dedupedLinks.forEach(l => {
      const s = nodes.find(n => n.id === l.source);
      const t = nodes.find(n => n.id === l.target);

      if (s && t) {
        // Link A -> B
        biLinks.push({
          ...l,
          id: `${l.source}_${l.target}_fwd`,
          emitColor: s.color,
          // Half speed and high randomness to desync particles organically
          emitSpeed: Math.min(0.0075, (0.0015 + (s.degree * 0.00075)) * (0.4 + Math.random() * 1.2)),
          pulseOffset: Math.random() * 10,
          isPrimary: true
        });
        // Link B -> A
        biLinks.push({
          ...l,
          id: `${l.source}_${l.target}_rev`,
          source: l.target,
          target: l.source,
          emitColor: t.color,
          emitSpeed: Math.min(0.0075, (0.0015 + (t.degree * 0.00075)) * (0.4 + Math.random() * 1.2)),
          pulseOffset: Math.random() * 10,
          isPrimary: false
        });
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
          <h2>{t('nexus.crash_title') || 'Error en Nexus'}</h2>
          <p>{t('nexus.crash_message') || 'Se ha producido un error al cargar la visualización.'}</p>
          <pre>{renderError}</pre>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            {t('nexus.reload') || 'Recargar Aplicación'}
          </button>
        </div>
      </div>
    );
  }

  const clickTracker = useRef({ time: 0, id: null });

  const handleNodeClick = (node) => {
    const now = Date.now();
    if (clickTracker.current.id === node.id && now - clickTracker.current.time < 350) {
      // Double click
      onNavigate('compendium');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('navigate-to-compendium-item', { detail: { id: node.rawId, group: node.group } }));
      }, 100);
    } else {
      // Single click
      if (graphMode === '3D' && graphRef.current) {
        const distance = 100;
        const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
        graphRef.current.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
          node,
          1500
        );
      } else if (graphMode === '2D' && graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 1000);
        graphRef.current.zoom(2, 1000);
      }
    }
    clickTracker.current = { time: now, id: node.id };
  };

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
              className={`btn btn-ghost nexus-lock-btn ${!lockZoom ? 'active' : ''}`}
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
              title={lockZoom ? t('nexus.lock_zoom') : t('nexus.unlock_zoom')}
            >
              {lockZoom ? <Unlock size={16} /> : <Lock size={16} />}
              <span className="btn-label">{lockZoom ? t('nexus.unlocked') : t('nexus.locked')}</span>
            </button>
          )}

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
            ) : graphMode === '3D' ? (
              <ForceGraph3D
                key={`3d-${currentTheme}`}
                ref={graphRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeLabel={node => `
                  <div class="nexus-tooltip">
                    <div class="nexus-tooltip-title">${node.name}</div>
                    <div class="nexus-tooltip-sub">${t(`compendium:tabs.${node.group}`)}</div>
                    <div class="nexus-tooltip-meta">${node.degree} ${t('nexus.connections')}</div>
                  </div>
                `}
                nodeThreeObject={node => {
                  const group = new THREE.Group();

                  // 1. Core Sphere (Standardized radius corresponding to 2D's base radius)
                  const sphere = new THREE.Mesh(
                    new THREE.SphereGeometry(2.8),
                    new THREE.MeshLambertMaterial({ 
                      color: node.color,
                      transparent: true,
                      opacity: 1.0
                    })
                  );
                  group.add(sphere);

                  // 2. Halo (Subtle radiance matching 2D 'destination-over' exact gradient)
                  if (node.isImportant) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 128;
                    canvas.height = 128;
                    const ctx = canvas.getContext('2d');
                    
                    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
                    const rgb = hexToRgb(node.color);
                    gradient.addColorStop(0, `rgba(${rgb}, 0.25)`);
                    gradient.addColorStop(1, `rgba(${rgb}, 0)`);
                    
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, 128, 128);

                    const texture = new THREE.CanvasTexture(canvas);
                    const glowMaterial = new THREE.SpriteMaterial({ 
                      map: texture, 
                      transparent: true,
                      depthWrite: false, // Ensures it renders behind the node itself visually
                      opacity: 1.0 // Alpha handled by gradient
                    });
                    const glowSprite = new THREE.Sprite(glowMaterial);
                    
                    // Match the 3.5 multiplier from 2D
                    const glowSize = 2.8 * 3.5 * 2; 
                    glowSprite.scale.set(glowSize, glowSize, 1);
                    group.add(glowSprite);
                  }

                  // 3. Label
                  const canvas = document.createElement('canvas');
                  const context = canvas.getContext('2d');
                  const fontSize = node.isImportant ? 24 : 15;
                  context.font = `${node.isImportant ? 'bold' : 'normal'} ${fontSize}px Inter, sans-serif`;
                  const textWidth = context.measureText(node.name).width;

                  canvas.width = textWidth + 20;
                  canvas.height = fontSize + 10;

                  context.fillStyle = node.isImportant ? themeCtx.textMain : themeCtx.textMuted;
                  context.font = `${node.isImportant ? 'bold' : 'normal'} ${fontSize}px Inter, sans-serif`;
                  context.textAlign = 'center';
                  context.textBaseline = 'middle';
                  context.fillText(node.name, canvas.width / 2, canvas.height / 2);

                  const texture = new THREE.CanvasTexture(canvas);
                  const spriteMaterial = new THREE.SpriteMaterial({ 
                    map: texture, 
                    transparent: true,
                    opacity: 1.0 // handled by canvas fillStyle now, but ensure visibility
                  });
                  const sprite = new THREE.Sprite(spriteMaterial);
                  sprite.position.set(0, node.isImportant ? 8 : 5, 0);
                  sprite.scale.set(canvas.width / 10, canvas.height / 10, 1);
                  group.add(sprite);

                  return group;
                }}
                nodeThreeObjectExtend={false}
                linkColor={link => link.isPrimary ? themeCtx.linkPrimary : 'rgba(0,0,0,0)'}
                linkWidth={link => link.isPrimary ? (link.isManual ? 1.5 : 0.8) : 0}
                linkDirectionalParticles={1}
                linkDirectionalParticleWidth={0.65} // Proportionally matches 1.4 in 2D
                linkDirectionalParticleSpeed={link => link.emitSpeed}
                linkDirectionalParticleColor={link => link.emitColor}
                backgroundColor="rgba(0,0,0,0)"
                showNavInfo={false}
                enableNodeDrag={true}
                onNodeClick={handleNodeClick}
              />
            ) : (
              <ForceGraph2D
                key={`2d-${currentTheme}`}
                ref={graphRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeLabel={node => `
                  <div class="nexus-tooltip">
                    <div class="nexus-tooltip-title">${node.name}</div>
                    <div class="nexus-tooltip-sub">${t(`compendium:tabs.${node.group}`)}</div>
                    <div class="nexus-tooltip-meta">${node.degree} ${t('nexus.connections')}</div>
                  </div>
                `}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  if (!node || typeof node.x !== 'number' || typeof node.y !== 'number') return;
                  if (!isFinite(node.x) || !isFinite(node.y)) return;
                  
                  const label = node.name;
                  const safeScale = globalScale || 1;
                  // Standardized radius for all nodes in 2D
                  const radius = 6 / safeScale;

                  const fontSize = (node.isImportant ? 14 : 11) / safeScale;
                  ctx.font = `${node.isImportant ? 'bold' : 'normal'} ${fontSize}px Inter, sans-serif`;
                  
                  // 1. Core Circle (already calculated radius)
                  
                  // 2. Halo (Subtle radiance) - Use 'destination-over' to render BEHIND lines and nodes
                  if (node.isImportant && isFinite(radius)) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, radius * 3.5, 0, 2 * Math.PI, false);
                    const grad = ctx.createRadialGradient(node.x, node.y, radius, node.x, node.y, radius * 3.5);
                    const rgb = hexToRgb(node.color);
                    grad.addColorStop(0, `rgba(${rgb}, 0.25)`);
                    grad.addColorStop(1, `rgba(${rgb}, 0)`);
                    ctx.fillStyle = grad;
                    ctx.fill();
                    ctx.restore();
                  }

                  // 3. Main Node
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                  ctx.fillStyle = node.color;
                  ctx.fill();
                  
                  // 4. Label
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  // Use theme-aware colors for nodes
                  ctx.fillStyle = node.isImportant ? themeCtx.textMain : themeCtx.textMuted;
                  ctx.fillText(label, node.x, node.y + radius + fontSize);
                }}
                nodeCanvasObjectMode={() => 'replace'}
                linkColor={link => link.isPrimary ? themeCtx.linkPrimary : 'rgba(0,0,0,0)'}
                linkWidth={link => link.isPrimary ? (link.isManual ? 1.5 : 0.8) : 0}
                linkDirectionalParticles={1}
                linkDirectionalParticleWidth={1.4}
                linkDirectionalParticleSpeed={link => link.emitSpeed}
                linkDirectionalParticleColor={link => {
                  const rgb = hexToRgb(link.emitColor);
                  const pulse = 0.6 + Math.sin(Date.now() / 450 + (link.pulseOffset || 0)) * 0.4;
                  return `rgba(${rgb}, ${pulse})`;
                }}
                backgroundColor="rgba(0,0,0,0)"
                showNavInfo={false}
                onNodeClick={handleNodeClick}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
