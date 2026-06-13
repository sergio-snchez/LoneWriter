import React, { useRef } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import ForceGraph2D from 'react-force-graph-2d'
import * as THREE from 'three'

const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string') return '255, 255, 255';
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ?
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
    '255, 255, 255';
};

export default function NexusGraph({
  graphData,
  dimensions,
  themeCtx,
  currentTheme,
  graphMode,
  setGraphMode,
  t,
  containerRef,
  onNodeClick,
}) {
  const graphRef = useRef();
  const nodeObjectCache = useRef(new Map());

  const handleNodeClick = (node) => {
    if (graphMode === '3D' && graphRef.current) {
      const distance = 100;
      const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
      graphRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
        node,
        1500
      );
    } else if (graphMode === '2D' && graphRef.current) {
      graphRef.current.zoom(4, 800);
      graphRef.current.centerAt(node.x, node.y, 800);
    }
    if (onNodeClick) onNodeClick(node);
  };

  const linkLabel = (link) => {
    if (!link.isPrimary) return '';
    const nodesArr = [link.source, link.target].sort();
    return `${nodesArr[0]} → ${nodesArr[1]}`;
  };

  return (
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
            if (nodeObjectCache.current.has(node.id)) {
              return nodeObjectCache.current.get(node.id);
            }

            const group = new THREE.Group();

            const sphere = new THREE.Mesh(
              new THREE.SphereGeometry(2.8),
              new THREE.MeshLambertMaterial({
                color: node.color,
                transparent: true,
                opacity: 1.0
              })
            );
            group.add(sphere);

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
                depthWrite: false,
                opacity: 1.0
              });
              const glowSprite = new THREE.Sprite(glowMaterial);

              const glowSize = 2.8 * 3.5 * 2;
              glowSprite.scale.set(glowSize, glowSize, 1);
              group.add(glowSprite);
            }

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
              opacity: 1.0
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.set(0, node.isImportant ? 8 : 5, 0);
            sprite.scale.set(canvas.width / 10, canvas.height / 10, 1);
            group.add(sprite);

            nodeObjectCache.current.set(node.id, group);
            return group;
          }}
          nodeThreeObjectExtend={false}
          linkColor={link => link.isPrimary ? themeCtx.linkPrimary : 'rgba(0,0,0,0)'}
          linkWidth={link => link.isPrimary ? (link.isManual ? 1.5 : 0.8) : 0}
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={0.65}
          linkDirectionalParticleSpeed={link => link.emitSpeed}
          linkDirectionalParticleColor={link => {
            const rgb = hexToRgb(link.emitColor);
            const pulse = 0.55 + Math.sin(Date.now() / 450 + (link.pulseOffset || 0)) * 0.45;
            return `rgba(${rgb}, ${pulse})`;
          }}
          backgroundColor={themeCtx.bgGraph}
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
            const radius = 6 / safeScale;

            const fontSize = (node.isImportant ? 14 : 11) / safeScale;
            ctx.font = `${node.isImportant ? 'bold' : 'normal'} ${fontSize}px Inter, sans-serif`;

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

            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.color;
            ctx.fill();

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const labelColor = node.isImportant ? themeCtx.textMain : themeCtx.textMuted;
            const labelY = node.y + radius + fontSize * 1.2;

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = node.isImportant ? themeCtx.textMain : themeCtx.textMuted;
            ctx.fillText(label, node.x, node.y + radius + fontSize * 1.2);
          }}
          nodeCanvasObjectMode={() => 'replace'}
          linkColor={link => link.isPrimary ? themeCtx.linkPrimary : 'rgba(0,0,0,0)'}
          linkWidth={link => link.isPrimary ? (link.isManual ? 1.5 : 0.8) : 0}
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={1.4}
          linkDirectionalParticleSpeed={link => link.emitSpeed}
          linkDirectionalParticleColor={link => {
            const rgb = hexToRgb(link.emitColor);
            const pulse = 0.55 + Math.sin(Date.now() / 450 + (link.pulseOffset || 0)) * 0.45;
            return `rgba(${rgb}, ${pulse})`;
          }}
          backgroundColor={themeCtx.bgGraph}
          showNavInfo={false}
          cooldownTicks={80}
          onNodeClick={handleNodeClick}
        />
      )}
    </div>
  )
}
