import React, { useMemo, useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import './StorylineChart.css';

// Curated premium palette for character tracks
const PREMIUM_PALETTE = [
  '#EAB308', // Gold
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Emerald
  '#8B5CF6', // Violet
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#EC4899', // Pink
];

// Hash string to color for consistent POV colors
const stringToColor = (str) => {
  if (!str) return '#555555';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PREMIUM_PALETTE[Math.abs(hash) % PREMIUM_PALETTE.length];
};

// Module-level cache to persist zoom when component unmounts during view switching
let cachedCamera = null;

export default function StorylineChart({ acts, characters, onNavigate, dimensions, themeCtx }) {
  StorylineChart.propTypes = {
    acts: PropTypes.array.isRequired,
    characters: PropTypes.array,
    onNavigate: PropTypes.func,
    dimensions: PropTypes.shape({
      width: PropTypes.number,
      height: PropTypes.number,
    }).isRequired,
    themeCtx: PropTypes.shape({
      textMain: PropTypes.string,
      textMuted: PropTypes.string,
      isLight: PropTypes.bool,
      bgGraph: PropTypes.string,
    }).isRequired,
  };

  const { t } = useTranslation(['app']);
  const graphRef = useRef();
  
  const graphData = useMemo(() => {
    const nodes = [];
    const links = [];
    const X_SPACING = 300;
    const Y_SPACING = 150;
    
    // 1. Flatten all scenes in chronological order
    const allScenes = acts.flatMap(act => act.chapters?.flatMap(ch => ch.scenes || []) || []);
    
    // 2. Identify unique POVs
    const povSet = new Set(allScenes.map(s => s.pov).filter(Boolean));
    const povs = Array.from(povSet);
    povs.sort(); // Sort alphabetically for consistent lanes
    
    // Add "Unassigned" lane if there are scenes without POV
    if (allScenes.some(s => !s.pov)) {
      povs.push('Unassigned');
    }

    // 3. Create Lane Axis Nodes (Labels on the left)
    povs.forEach((pov, index) => {
      nodes.push({
        id: `lane_${pov}`,
        isLaneLabel: true,
        label: pov === 'Unassigned' ? t('editor.sin_pov', 'No POV') : pov,
        pov: pov,
        fx: -350, // Moved further left to account for pill width
        fy: index * Y_SPACING,
        color: stringToColor(pov)
      });
    });

    // 4. Create Scene Nodes & Timeline Axis Markers
    // Pass 1: Inherit dates for empty fields to maintain continuity
    let lastDate = "0";
    allScenes.forEach(sc => {
      if (sc.inGameDate && sc.inGameDate.trim() !== '') {
        lastDate = sc.inGameDate.trim();
      }
      sc.effectiveDate = lastDate;
    });

    // Pass 2: Extract and sort unique dates chronologically
    const uniqueDates = Array.from(new Set(allScenes.map(sc => sc.effectiveDate)));
    
    // Smart sort: Extract first valid number (including negatives) to sort mathematically. 
    // Fall back to alphabetical if numbers are identical or missing.
    const parseDateValue = (str) => {
      const match = str.match(/-?\d+(\.\d+)?/);
      return match ? parseFloat(match[0]) : 0;
    };
    
    uniqueDates.sort((a, b) => {
      const numA = parseDateValue(a);
      const numB = parseDateValue(b);
      if (numA !== numB) {
        return numA - numB;
      }
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Create Chronological Axis Markers
    uniqueDates.forEach((date, idx) => {
      nodes.push({
        id: `date_marker_${idx}`,
        isAxisMarker: true,
        label: date,
        fx: idx * X_SPACING,
        fy: -120,
        isMinor: false
      });
    });

    // Pass 3: Place Scene Nodes
    const povDateCounts = {}; // Track overlapping scenes for the same POV on the same date

    allScenes.forEach(sc => {
      const pov = sc.pov || 'Unassigned';
      const povIndex = povs.indexOf(pov);
      
      const xIndex = uniqueDates.indexOf(sc.effectiveDate);
      
      // Prevent perfect overlapping if a character has multiple scenes at the exact same chronological moment
      const overlapKey = `${pov}_${xIndex}`;
      const offsetCount = povDateCounts[overlapKey] || 0;
      povDateCounts[overlapKey] = offsetCount + 1;
      
      const xOffset = offsetCount * 0.35; // Shift slightly right

      nodes.push({
        id: sc.id,
        isScene: true,
        title: sc.title,
        synopsis: sc.synopsis,
        pov: pov,
        fx: (xIndex + xOffset) * X_SPACING, // Chronological position
        fy: povIndex * Y_SPACING,    // Lane vertical position
        color: stringToColor(pov)
      });
    });

    // 5. Calculate Character Journeys (The Subway Lines)
    // For each character that has a lane, trace their path through all scenes
    const linkCounts = {}; // Track multiple links between same nodes for curvature

    povs.forEach(pov => {
      // Find all scenes where this character appears (POV or mentioned in synopsis)
      const charScenes = allScenes.filter(sc => {
        if (sc.pov === pov) return true;
        
        // Basic NLP: Check if character name is in synopsis
        if (sc.synopsis) {
          // Escape regex characters in POV name
          const safePov = pov.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${safePov}\\b`, 'i');
          if (regex.test(sc.synopsis)) return true;
        }
        return false;
      });

      // Sort by chronological sequence to ensure tracks flow cleanly left-to-right.
      // If dates are identical, fallback to narrative order (allScenes.indexOf).
      const sortedScenes = charScenes.sort((a, b) => {
        const dateDiff = uniqueDates.indexOf(a.effectiveDate) - uniqueDates.indexOf(b.effectiveDate);
        if (dateDiff === 0) {
          return allScenes.indexOf(a) - allScenes.indexOf(b);
        }
        return dateDiff;
      });

      // Connect their journey
      for (let i = 0; i < sortedScenes.length - 1; i++) {
        const sourceId = sortedScenes[i].id;
        const targetId = sortedScenes[i + 1].id;
        
        // Ensure consistent key for counting
        const key = [sourceId, targetId].sort().join('_');
        linkCounts[key] = (linkCounts[key] || 0) + 1;
        const curvature = linkCounts[key] > 1 ? (linkCounts[key] - 1) * 0.2 : 0;

        links.push({
          source: sourceId,
          target: targetId,
          color: stringToColor(pov),
          curvature: curvature,
          isAxisLink: false
        });
      }
      
      // Connect lane label to their very first appearance
      if (sortedScenes.length > 0) {
        links.push({
          source: `lane_${pov}`,
          target: sortedScenes[0].id,
          color: stringToColor(pov),
          isAxisLink: true,
          isLaneBackground: true,
          curvature: 0
        });
      }
    });

    return { nodes, links };
  }, [acts, characters, t]);

  // Center the graph on initial load or restore previous zoom
  useEffect(() => {
    if (graphRef.current) {
      // 2. Restore camera or center
      setTimeout(() => {
        if (cachedCamera) {
          // Restore user's previous zoom and pan
          graphRef.current.centerAt(cachedCamera.x, cachedCamera.y, 0);
          graphRef.current.zoom(cachedCamera.k, 0);
        } else {
          // Increased padding to ensure right-side nodes aren't cut off
          graphRef.current.zoomToFit(400, 150);
        }
      }, 100);
    }
  }, [graphData, dimensions]);

  const paintNode = (node, ctx, globalScale) => {
    const safeScale = Math.max(globalScale, 0.6);
    const transform = ctx.getTransform();

    if (node.isAxisMarker) {
      // Calculate Sticky Y for the top axis (Sticks to 60px from the top of the screen)
      const screenY = 60;
      const stickyY = Math.max(node.y, (screenY - transform.f) / transform.a);

      // Draw structural marker (Act/Chapter / Date)
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      
      const isAct = !node.isMinor;
      const fontSize = (isAct ? 14 : 12) / safeScale;
      ctx.font = `${isAct ? 'bold' : 'normal'} ${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = themeCtx.textMain; 
      
      // Draw text at stickyY
      ctx.fillText(node.label, node.x, stickyY - 15 / safeScale);
      
      // Draw dot at stickyY
      ctx.beginPath();
      ctx.arc(node.x, stickyY, 3 / safeScale, 0, 2 * Math.PI, false);
      ctx.fillStyle = themeCtx.textMain;
      ctx.fill();

      // Dashed vertical drop line from stickyY downwards
      ctx.beginPath();
      ctx.moveTo(node.x, stickyY);
      ctx.lineTo(node.x, 2000);
      ctx.setLineDash([5 / safeScale, 5 / safeScale]);
      ctx.lineWidth = 1 / safeScale;
      ctx.strokeStyle = themeCtx.isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)';
      ctx.stroke();
      ctx.setLineDash([]);
      
      return;
    }

    if (node.isLaneLabel) {
      // Calculate Sticky X for the left axis (Sticks to 20px from the left of the screen)
      const screenX = 20;
      const stickyX = Math.max(node.x, (screenX - transform.e) / transform.a);

      // Draw POV lane label inside a hollow pill for perfect readability
      ctx.font = `bold ${14 / safeScale}px Inter, sans-serif`;
      const textWidth = ctx.measureText(node.label).width;
      const paddingX = 14 / safeScale;
      const paddingY = 6 / safeScale;
      const pillWidth = textWidth + paddingX * 2;
      const pillHeight = 14 / safeScale + paddingY * 2;
      
      ctx.beginPath();
      ctx.roundRect(stickyX, node.y - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
      ctx.fillStyle = themeCtx.isLight ? '#ffffff' : '#1a1a1f';
      ctx.fill();
      ctx.lineWidth = 2 / safeScale;
      ctx.strokeStyle = node.color;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = themeCtx.textMain; 
      ctx.fillText(node.label, stickyX + pillWidth / 2, node.y);
      return;
    }

    if (node.isScene) {
      // Node circle (Subway Station)
      const r = 8 / Math.sqrt(safeScale); // Slightly smaller radius
      
      // Draw border for the station
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
      ctx.fillStyle = themeCtx.isLight ? '#ffffff' : '#1a1a1f';
      ctx.fill();
      ctx.lineWidth = 3 / Math.sqrt(safeScale);
      ctx.strokeStyle = node.color;
      ctx.stroke();

      // Title Text
      const fontSize = 13 / safeScale;
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = themeCtx.textMain;
      ctx.fillText(node.title, node.x, node.y - r - 12 / safeScale);
      
      // Draw synopsis box if zoomed in enough (Semantic Zoom is still enabled, but we trigger it earlier)
      if (globalScale > 0.65) {
        const boxWidth = 220 / safeScale;
        const boxHeight = 60 / safeScale;
        const boxX = node.x - boxWidth / 2;
        const boxY = node.y + r + 8;
        const cornerRadius = 6 / safeScale;

        // Box background
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, cornerRadius);
        ctx.fillStyle = themeCtx.isLight ? 'rgba(255, 255, 255, 0.8)' : 'rgba(30, 30, 35, 0.8)';
        ctx.fill();
        ctx.lineWidth = 1 / safeScale;
        ctx.strokeStyle = node.color;
        ctx.stroke();

        // Box text
        ctx.font = `${11 / safeScale}px Inter, sans-serif`;
        ctx.fillStyle = themeCtx.textMuted;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const syn = node.synopsis || t('nexus.no_synopsis', 'No synopsis');
        // Simple word wrap
        const words = syn.split(' ');
        let line = '';
        let currentY = boxY + 8 / safeScale;
        const maxWidth = boxWidth - 16 / safeScale;
        const lineHeight = 14 / safeScale;
        
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + ' ';
          const metrics = ctx.measureText(testLine);
          
          if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line, boxX + 8 / safeScale, currentY);
            line = words[i] + ' ';
            currentY += lineHeight;
            if (currentY > boxY + boxHeight - lineHeight) {
              ctx.fillText(line + '...', boxX + 8 / safeScale, currentY);
              break;
            }
          } else {
            line = testLine;
          }
        }
        if (currentY <= boxY + boxHeight - lineHeight) {
          ctx.fillText(line, boxX + 8 / safeScale, currentY);
        }
      }
    }
  };

  const paintLink = (link, ctx, globalScale) => {
    if (!link.source || !link.target || typeof link.source.x !== 'number' || typeof link.target.x !== 'number') return;
    const safeScale = Math.max(globalScale, 0.6);
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    
    if (link.isLaneBackground) {
      // Draw an infinite horizontal rail for the character lane
      ctx.lineTo(10000, link.source.y);
      ctx.lineWidth = link.isAxisLink ? 1 / safeScale : 4 / safeScale;
      ctx.strokeStyle = link.isAxisLink ? (themeCtx.isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)') : link.color;
      ctx.stroke();
    } else {
      // Draw curved lines (bezier) to avoid sharp peaks between nodes
      const dx = link.target.x - link.source.x;
      const offset = (link.curvature || 0) * 50 / safeScale; // Offset for overlapping tracks
      
      const cp1x = link.source.x + dx / 2;
      const cp1y = link.source.y - offset;
      const cp2x = link.source.x + dx / 2;
      const cp2y = link.target.y - offset;
      
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, link.target.x, link.target.y);
      
      // Draw thinner, subtler lines for the subway tracks
      ctx.lineWidth = link.isAxisLink ? 1 / safeScale : 4 / safeScale;
      ctx.strokeStyle = link.isAxisLink ? (themeCtx.isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)') : link.color;
      ctx.stroke();

      // Custom Particle Drawing along the Bezier curve
      if (!link.isAxisLink) {
        // We use Date.now() to animate the particle along the path
        const duration = 4000; // 4 seconds to cross the link
        
        // Give each link a pseudo-random offset so particles don't all move in sync
        const idStr = (link.source.id || 'a').toString() + (link.target.id || 'b').toString();
        let hash = 0;
        for (let i = 0; i < idStr.length; i++) {
          hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        const timeOffset = Math.abs(hash) % duration;
        
        // Calculate t from 0 to 1
        const t = ((Date.now() + timeOffset) % duration) / duration;
        
        // Bezier formula for cubic curve
        const invT = 1 - t;
        const px = invT*invT*invT * link.source.x + 
                   3 * invT*invT * t * cp1x + 
                   3 * invT * t*t * cp2x + 
                   t*t*t * link.target.x;
        const py = invT*invT*invT * link.source.y + 
                   3 * invT*invT * t * cp1y + 
                   3 * invT * t*t * cp2y + 
                   t*t*t * link.target.y;

        // Draw particle
        ctx.beginPath();
        ctx.arc(px, py, 2 / safeScale, 0, 2 * Math.PI, false);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        // Draw particle glow
        ctx.beginPath();
        ctx.arc(px, py, 4.5 / safeScale, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
      }
    }
  };

  return (
    <div className="storyline-container" style={{ width: dimensions.width, height: dimensions.height }}>
      {graphData.nodes.length === 0 ? (
        <div className="nexus-placeholder-text">
          <p>{t('nexus.timeline_empty', 'No scenes found.')}</p>
        </div>
      ) : (
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          minZoom={0.4}
          maxZoom={3.0}
          onZoom={(camera) => { cachedCamera = camera; }}
          nodeCanvasObject={paintNode}
          linkCanvasObject={paintLink}
          linkCurvature="curvature"
          nodeRelSize={8}
          // Added visual particles flowing through the timeline
          linkDirectionalParticles={link => link.isAxisLink || link.isLaneBackground ? 0 : 1}
          linkDirectionalParticleWidth={3}
          linkDirectionalParticleSpeed={0.003}
          // Make native particles transparent since we draw them manually along the bezier curve
          linkDirectionalParticleColor={link => 'transparent'}
          enableNodeDrag={false}
          backgroundColor={themeCtx.bgGraph}
          onNodeClick={(node) => {
            if (node.isScene && onNavigate) {
              onNavigate(node.id);
            }
          }}
        />
      )}
    </div>
  );
}
