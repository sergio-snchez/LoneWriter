import { BookOpen, BookMarked, FolderOpen, PenLine, ChevronLeft, ChevronRight, Network } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNovel } from '../context/NovelContext'
import { Tooltip } from './Tooltip'
import { APP_VERSION } from '../utils/version'
import './Sidebar.css'

export default function Sidebar({ active, onNavigate, collapsed, onToggle }) {
  const { t } = useTranslation('common')
  const { activeNovel } = useNovel()

  const NAV = [
    {
      id: 'editor',
      label: t('sidebar.nav.editor_label'),
      sublabel: t('sidebar.nav.editor_sublabel'),
      icon: BookOpen,
    },
    {
      id: 'compendium',
      label: t('sidebar.nav.compendium_label'),
      sublabel: t('sidebar.nav.compendium_sublabel'),
      icon: BookMarked,
    },
    {
      id: 'nexus',
      label: t('sidebar.nav.nexus_label'),
      sublabel: t('sidebar.nav.nexus_sublabel'),
      icon: Network,
    },
    {
      id: 'resources',
      label: t('sidebar.nav.resources_label'),
      sublabel: t('sidebar.nav.resources_sublabel'),
      icon: FolderOpen,
    },
  ]

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      {/* Logo / Title */}
      <div className="sidebar__header">
        <div className="sidebar__logo">
          <PenLine size={20} className="sidebar__logo-icon" />
          {!collapsed && <span className="sidebar__logo-text">LoneWriter</span>}
        </div>
        <button
          className="sidebar__toggle"
          onClick={onToggle}
          id="sidebar-toggle-btn"
          aria-label={collapsed ? t('sidebar.expandir') : t('sidebar.colapsar')}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Novel info chip - Only visible if there is an active novel with a title */}
      {!collapsed && activeNovel && activeNovel.title && (
        <div className="sidebar__novel-chip">
          <span className="sidebar__novel-label">{t('sidebar.novela_activa')}</span>
          <span className="sidebar__novel-title truncate">{activeNovel.title}</span>
        </div>
      )}

      {/* Nav items */}
      <nav className="sidebar__nav">
        {NAV.map(({ id, label, sublabel, icon: Icon }) => (
          <button
            key={id}
            id={`nav-${id}`}
            className={`sidebar__nav-item ${active === id ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => onNavigate(id)}
            aria-current={active === id ? 'page' : undefined}
          >
            <span className="sidebar__nav-icon">
              <Icon size={20} />
            </span>
            {!collapsed && (
              <span className="sidebar__nav-labels">
                <span className="sidebar__nav-label">{label}</span>
                <span className="sidebar__nav-sublabel">{sublabel}</span>
              </span>
            )}
            {active === id && <span className="sidebar__nav-indicator" />}
          </button>
        ))}
      </nav>

      {/* Bottom spacer / version */}
      {!collapsed && (
        <div className="sidebar__footer">
          <span className="sidebar__version">LoneWriter v{APP_VERSION}</span>
        </div>
      )}
    </aside>
  )
}
