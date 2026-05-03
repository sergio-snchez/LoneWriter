import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Cpu, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import './RagToast.css';

const SEEN_KEY = 'lw_rag_model_ready';

export default function RagToast() {
  const { t } = useTranslation('common');
  const [state, setState] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  const [progress, setProgress] = useState(null);
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef(null);

  useEffect(() => {
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

  return (
    <div className={`rag-toast rag-toast--${state}`}>
      {/* Header row */}
      <div className="rag-toast__header">
        <div className={`rag-toast__icon-box rag-toast__icon-box--${state}`}>
          {state === 'ready'
            ? <CheckCircle2 size={16} />
            : state === 'error'
            ? <AlertTriangle size={16} />
            : <Cpu size={16} />}
        </div>
        <div className="rag-toast__text">
          <div className="rag-toast__title">
            {state === 'ready'
              ? t('rag.listo_titulo')
              : state === 'error'
              ? t('rag.error_titulo')
              : t('rag.descargando_titulo')}
          </div>
          <div className="rag-toast__subtitle">
            {state === 'ready'
              ? t('rag.listo_subtitulo')
              : state === 'error'
              ? t('rag.error_subtitulo')
              : t('rag.descargando_subtitulo')}
          </div>
        </div>
        <button className="rag-toast__close" onClick={() => setVisible(false)}>
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      {state === 'loading' && (
        <div className="rag-toast__progress-wrap">
          <div className="rag-toast__progress-track">
            <div
              className={`rag-toast__progress-bar ${pct == null ? 'rag-toast__progress-bar--shimmer' : ''}`}
              style={{ width: pct != null ? `${pct}%` : '40%' }}
            />
          </div>
          {pct != null && (
            <div className="rag-toast__progress-label">{pct}%</div>
          )}
        </div>
      )}
    </div>
  );
}
