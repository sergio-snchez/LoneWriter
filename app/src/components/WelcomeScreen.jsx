import PropTypes from 'prop-types'
import {
  BookOpen, ChevronDown, Plus, PenLine, Heart
} from 'lucide-react'
import { useTranslation, Trans } from 'react-i18next'
import { LanguageSelector, TypingEffect } from './'
import { APP_VERSION } from '../utils'
import { useThemeContext } from '../context'
import './WelcomeScreen.css'

export default function WelcomeScreen({
  allNovels, switchNovel, onCreateProject,
  onShowAllProjects, typingComplete, setTypingComplete,
}) {
  const { theme, setTheme } = useThemeContext()
  const { t, i18n } = useTranslation('app')

  const recentNovels = allNovels.slice(0, 5)

  return (
    <div className="welcome-screen">
      <div className="welcome-screen__container">
        <header className="welcome-screen__hero">
          <div className="welcome-screen__icon">
            <PenLine size={48} />
          </div>
          <h1 className="welcome-screen__title">{t('bienvenida.titulo')}</h1>
          <p className="welcome-screen__subtitle">
            <TypingEffect
              key={`welcome-typing-${i18n?.language || 'es'}`}
              text={'   ' + t('bienvenida.subtitulo')}
              speed={40}
              delay={800}
              onComplete={() => setTypingComplete(true)}
            />
          </p>
          <button
            className="btn btn-primary welcome-screen__btn"
            onClick={onCreateProject}
          >
            <Plus size={16} />
            {t('bienvenida.boton_nueva')}
          </button>
        </header>

        {allNovels.length > 0 && (
          <section className="welcome-screen__recent">
            <div className="recent-header">
              <h2 className="recent-title">{t('bienvenida.continuar')}</h2>
              <span className="recent-count">{t('bienvenida.proyectos_total', { count: allNovels.length })}</span>
            </div>
            <div className="recent-grid">
              {recentNovels.map(n => {
                const pct = Math.round(((n.wordCount || 0) / (n.targetWords || 100000)) * 100);
                const lastDate = new Date(n.lastEdited || 0).toLocaleDateString(undefined, {
                  day: 'numeric', month: 'short', year: 'numeric'
                });

                return (
                  <div key={n.id} className="project-card" onClick={() => switchNovel(n.id)}>
                    <div className="project-card__header">
                      <BookOpen size={20} className="project-card__icon" />
                      <div className="project-card__meta">
                        <h3 className="project-card__title">{n.title}</h3>
                        <span className="project-card__date">{t('bienvenida.editado_el', { date: lastDate })}</span>
                      </div>
                    </div>
                    <div className="project-card__stats">
                      <div className="project-card__stat">
                        <span className="stat-value">{n.wordCount?.toLocaleString() || 0}</span>
                        <span className="stat-label">{t('bienvenida.palabras')}</span>
                      </div>
                      <div className="project-card__stat">
                        <span className="stat-value">{pct}%</span>
                        <span className="stat-label">{t('bienvenida.completado')}</span>
                      </div>
                    </div>
                    <div className="project-card__progress">
                      <div className="progress-bg">
                        <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}

              {allNovels.length > 5 && (
                <div className="project-card project-card--more" onClick={onShowAllProjects}>
                  <div className="more-content">
                    <span>{t('bienvenida.ver_todos')}</span>
                    <ChevronDown size={14} />
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {allNovels.length === 0 && (
          <section className="welcome-screen__setup">
            <div className="setup-header">
              <h2 className="setup-title">{t('bienvenida.configurar_titulo')}</h2>
              <p className="setup-subtitle">{t('bienvenida.configurar_subtitulo_line1')}</p>
              <p className="setup-subtitle-italic">{t('bienvenida.configurar_subtitulo_line2')}</p>
            </div>
            <div className="setup-options">
              <div className="setup-option">
                <span className="setup-option__label">{t('general.idioma')}</span>
                <div className={`welcome-fade-in ${!typingComplete ? 'welcome-fade-in--dimmed' : ''}`}>
                  <LanguageSelector />
                </div>
              </div>
              <div className="setup-divider" />
              <div className="setup-option">
                <div className={`theme-toggle-modern welcome-fade-in ${!typingComplete ? 'welcome-fade-in--dimmed' : ''}`}>
                  <button
                    className={`theme-btn-modern ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => typingComplete && setTheme('light')}
                  >
                    <div className="theme-preview theme-preview--light" />
                    <span>{t('general.tema_claro')}</span>
                  </button>
                  <button
                    className={`theme-btn-modern ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => typingComplete && setTheme('dark')}
                  >
                    <div className="theme-preview theme-preview--dark" />
                    <span>{t('general.tema_oscuro')}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <footer className="welcome-screen__footer">
          <p className="welcome-screen__version">
            {`LoneWriter v${APP_VERSION}`}
          </p>
          <p className="welcome-screen__credits">
            <Trans i18nKey="bienvenida.creditos" ns="app" components={[<strong />]} />
          </p>
          <div className="welcome-screen__support">
            <a
              href="https://buymeacoffee.com/sergio.snchez"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
            >
              <Heart size={14} />
              {t('bienvenida.apoyar')}
            </a>
          </div>
        </footer>
      </div>
    </div>
  )
}

WelcomeScreen.propTypes = {
  allNovels: PropTypes.array.isRequired,
  switchNovel: PropTypes.func.isRequired,
  onCreateProject: PropTypes.func.isRequired,
  onShowAllProjects: PropTypes.func.isRequired,
  typingComplete: PropTypes.bool.isRequired,
  setTypingComplete: PropTypes.func.isRequired,
}
