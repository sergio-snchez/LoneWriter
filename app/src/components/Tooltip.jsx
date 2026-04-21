import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function Tooltip({ children, content, position = 'bottom' }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef(null);
  const tooltipRef = useRef(null);

  const updatePosition = () => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const tooltipHeight = tooltipRef.current?.offsetHeight || 32;
    const tooltipWidth = tooltipRef.current?.offsetWidth || 150;
    const margin = 8;
    
    let top = 0;
    let left = rect.left + rect.width / 2;
    
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    if (position === 'bottom' || (position === 'auto' && spaceBelow >= tooltipHeight + margin)) {
      top = rect.bottom + margin;
    } else {
      top = rect.top - tooltipHeight - margin;
    }
    
    let transform = 'translateX(-50%)';
    if (left - tooltipWidth / 2 < margin) {
      left = tooltipWidth / 2 + margin;
      transform = 'none';
    } else if (left + tooltipWidth / 2 > window.innerWidth - margin) {
      left = window.innerWidth - tooltipWidth / 2 - margin;
      transform = 'none';
    }
    
    setCoords({ top, left, transform });
  };

  const handleMouseEnter = () => {
    setVisible(true);
    requestAnimationFrame(updatePosition);
  };

  const handleMouseLeave = () => {
    setVisible(false);
  };

  useEffect(() => {
    if (visible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [visible]);

  useEffect(() => {
    if (visible) {
      updatePosition();
    }
  }, [visible, content]);

  if (!content) return children;

  const tooltipElement = visible && createPortal(
    <span
      ref={tooltipRef}
      className="tooltip-content"
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        transform: coords.transform,
      }}
    >
      {content}
    </span>,
    document.body
  );

  return (
    <span
      ref={wrapperRef}
      className="tooltip-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {tooltipElement}
    </span>
  );
}

export function withTooltip(Component, content) {
  return function TooltippedComponent(props) {
    return (
      <Tooltip content={content}>
        <Component {...props} />
      </Tooltip>
    );
  };
}
