import { useState, useEffect, useRef } from 'react';
import { Cpu, CheckCircle2, X, AlertTriangle } from 'lucide-react';

const SEEN_KEY = 'lw_rag_model_ready';

export default function RagToast() {
  const [state, setState] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  const [progress, setProgress] = useState(null); // e.g. { progress: 0.42, file: '...' }
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    // If model was already cached in a previous session, skip entirely
    if (localStorage.getItem(SEEN_KEY)) return;

    const handleLoading = (e) => {
      setProgress(e.detail);
      setState('loading');
      setVisible(true);
    };

    const handleProgress = (e) => {
      setProgress(e.detail);
    };

    const handleReady = () => {
      setState('ready');
      localStorage.setItem(SEEN_KEY, 'true');
      // Auto-dismiss after 4s
      hideTimerRef.current = setTimeout(() => setVisible(false), 4000);
    };

    const handleError = () => {
      setState('error');
      hideTimerRef.current = setTimeout(() => setVisible(false), 6000);
    };

    window.addEventListener('rag-model-loading', handleLoading);
    window.addEventListener('rag-model-progress', handleProgress);
    window.addEventListener('rag-model-ready', handleReady);
    window.addEventListener('rag-model-error', handleError);

    return () => {
      window.removeEventListener('rag-model-loading', handleLoading);
      window.removeEventListener('rag-model-progress', handleProgress);
      window.removeEventListener('rag-model-ready', handleReady);
      window.removeEventListener('rag-model-error', handleError);
      clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  const pct = progress?.progress != null ? Math.round(progress.progress * 100) : null;

  const colors = {
    loading: { border: 'rgba(139,92,246,0.5)', glow: 'rgba(139,92,246,0.15)', icon: '#a78bfa', bar: '#8b5cf6' },
    ready:   { border: 'rgba(52,211,153,0.5)', glow: 'rgba(52,211,153,0.12)', icon: '#34d399', bar: '#34d399' },
    error:   { border: 'rgba(248,113,113,0.5)', glow: 'rgba(248,113,113,0.1)', icon: '#f87171', bar: '#f87171' },
  };
  const c = colors[state] || colors.loading;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        width: '300px',
        background: 'rgba(18,18,28,0.96)',
        border: `1px solid ${c.border}`,
        borderRadius: '12px',
        padding: '14px 16px',
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${c.glow}`,
        backdropFilter: 'blur(16px)',
        animation: 'rag-toast-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{`
        @keyframes rag-toast-in {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes rag-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '8px',
          background: `${c.icon}18`,
          border: `1px solid ${c.icon}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          animation: state === 'loading' ? 'rag-pulse 2s ease-in-out infinite' : 'none',
        }}>
          {state === 'ready'
            ? <CheckCircle2 size={16} color={c.icon} />
            : state === 'error'
            ? <AlertTriangle size={16} color={c.icon} />
            : <Cpu size={16} color={c.icon} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', lineHeight: 1.3 }}>
            {state === 'ready'
              ? 'Modelo RAG listo'
              : state === 'error'
              ? 'Error al cargar modelo'
              : 'Descargando modelo local'}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(148,163,184,0.8)', marginTop: '2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {state === 'ready'
              ? 'El Oráculo ya usa contexto semántico ✨'
              : state === 'error'
              ? 'El Oráculo funcionará sin RAG'
              : 'all-MiniLM-L6-v2 · ~23MB · solo esta vez'}
          </div>
        </div>
        <button
          onClick={() => setVisible(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.6)', padding: '2px', lineHeight: 1, flexShrink: 0 }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      {state === 'loading' && (
        <div style={{ marginTop: '4px' }}>
          <div style={{
            height: '4px', borderRadius: '2px',
            background: 'rgba(255,255,255,0.06)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              borderRadius: '2px',
              background: `linear-gradient(90deg, ${c.bar}cc, ${c.bar})`,
              width: pct != null ? `${pct}%` : '100%',
              transition: 'width 0.4s ease',
              // Indeterminate shimmer when no progress info yet
              animation: pct == null ? 'rag-shimmer 1.5s ease-in-out infinite' : 'none',
            }} />
          </div>
          {pct != null && (
            <div style={{ marginTop: '4px', fontSize: '11px', color: 'rgba(148,163,184,0.6)', textAlign: 'right' }}>
              {pct}%
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes rag-shimmer {
          0%   { transform: translateX(-100%); width: 40%; }
          50%  { transform: translateX(150%); width: 40%; }
          100% { transform: translateX(150%); width: 40%; }
        }
      `}</style>
    </div>
  );
}
