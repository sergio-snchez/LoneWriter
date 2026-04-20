import React from 'react';
import './MeshBackground.css';

const MeshBackground = ({ animate = true }) => {
  return (
    <div className={`mesh-background ${animate ? 'is-animated' : ''}`}>
      <div className="mesh-blob mesh-blob--1" />
      <div className="mesh-blob mesh-blob--2" />
      <div className="mesh-blob mesh-blob--3" />
      <div className="mesh-blob mesh-blob--4" />
      <div className="mesh-blob mesh-blob--center" />
    </div>
  );
};

export default MeshBackground;
