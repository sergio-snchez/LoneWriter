import { BookOpen, BookMarked, FolderOpen, PenLine, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNovel } from '../context/NovelContext'
import { Tooltip } from './Tooltip'
import './Sidebar.css'

const NAV = [
  {
    id: 'editor',
    label: 'Estructura narrativa',
    sublabel: 'Actos, capítulos y escenas',
    icon: BookOpen,
  },
  {
    id: 'compendium',
    label: 'Compendio',
    sublabel: 'Personajes, lore y mundo',
    icon: BookMarked,
  },
  {
    id: 'resources',
    label: 'Archivos de referencia',
    sublabel: 'Base de conocimiento',
    icon: FolderOpen,
  },
]

export default function Sidebar({ active, onNavigate, collapsed, onToggle }) {
  const { activeNovel } = useNovel();

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
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Novel info chip - Only visible if there is an active novel with a title */}
      {!collapsed && activeNovel && activeNovel.title && (
        <div className="sidebar__novel-chip">
          <span className="sidebar__novel-label">Novela activa</span>
          <span className="sidebar__novel-title truncate">{activeNovel.title}</span>
        </div>
      )}

      {/* Nav items */}
      <nav className="sidebar__nav">
        {NAV.map(({ id, label, sublabel, icon: Icon }) => (
          <Tooltip key={id} content={collapsed ? label : ''} position="right">
            <button
              id={`nav-${id}`}
              className={`sidebar__nav-item ${active === id ? 'sidebar__nav-item--active' : ''}`}
              onClick={() => onNavigate(id)}
              aria-current={active === id ? 'page' : undefined}
            >
              <span className="sidebar__nav-icon">
                <Icon size={18} />
              </span>
              {!collapsed && (
                <span className="sidebar__nav-labels">
                  <span className="sidebar__nav-label">{label}</span>
                  <span className="sidebar__nav-sublabel">{sublabel}</span>
                </span>
              )}
              {active === id && <span className="sidebar__nav-indicator" />}
            </button>
          </Tooltip>
        ))}
      </nav>

      {/* Bottom spacer / version */}
      {!collapsed && (
        <div className="sidebar__footer">
          <span className="sidebar__version">LoneWriter v1.3-oraculo · Sergio Sánchez</span>
        </div>
      )}
    </aside>
  )
}
