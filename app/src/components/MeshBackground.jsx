import './MeshBackground.css';
import { useThemeContext } from '../context';

const MeshBackground = () => {
  const { meshEnabled } = useThemeContext();
  return (
    <div className={`mesh-background ${meshEnabled ? 'is-animated' : ''}`}>
      <div className="mesh-blob mesh-blob--1" />
      <div className="mesh-blob mesh-blob--2" />
      <div className="mesh-blob mesh-blob--3" />
      <div className="mesh-blob mesh-blob--4" />
      <div className="mesh-blob mesh-blob--center" />
    </div>
  );
};

export default MeshBackground;
