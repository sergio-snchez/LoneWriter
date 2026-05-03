import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './CustomDatePicker.css';

export function CustomDatePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState(new Date());
  const [yearInput, setYearInput] = useState('');
  const containerRef = useRef(null);
  const { t, i18n } = useTranslation('editor');

  // Parse initial value
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setCurrentView(new Date(parts[0], parts[1] - 1, parts[2]));
      } else if (parts.length === 1) {
        setCurrentView(new Date(parts[0], 0, 1));
      }
    } else {
      setCurrentView(new Date());
    }
  }, [value, isOpen]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const daysInMonth = new Date(currentView.getFullYear(), currentView.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentView.getFullYear(), currentView.getMonth(), 1).getDay();
  // Adjust so Monday is column 0
  const startDay = firstDay === 0 ? 6 : firstDay - 1;

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setCurrentView(new Date(currentView.getFullYear(), currentView.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setCurrentView(new Date(currentView.getFullYear(), currentView.getMonth() + 1, 1));
  };

  const handleDayClick = (day) => {
    const y = currentView.getFullYear().toString().padStart(4, '0');
    const m = (currentView.getMonth() + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const handleYearSubmit = (e) => {
    e.preventDefault();
    if (yearInput.trim()) {
      onChange(yearInput.trim());
      setIsOpen(false);
      setYearInput('');
    }
  };

  // ── Locale-aware display helpers (no hardcoded strings) ──────────────────────

  const locale = i18n.language || 'en';

  const displayFormat = () => {
    if (!value) return t('fecha_placeholder', 'YYYY-MM-DD');
    const parts = value.split('-');
    if (parts.length === 1) return parts[0]; // Just year
    if (parts.length === 3) {
      const [y, m, d] = parts;
      // Format using Intl for locale-aware display
      try {
        const date = new Date(Number(y), Number(m) - 1, Number(d));
        return new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
      } catch {
        return value;
      }
    }
    return value;
  };

  // Month names from Intl — no hardcoded arrays
  const mNames = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2000, i, 1))
  );

  // Day header abbreviations from Intl, Monday-first
  const daysHeader = Array.from({ length: 7 }, (_, i) => {
    // i=0 → Monday (day 1 in JS is Monday using 2018-01-01 as anchor, which was a Monday)
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2018, 0, 1 + i));
  });

  const selectedParts = value ? value.split('-') : [];
  const selectedY = selectedParts[0] || null;
  const selectedM = selectedParts[1] ? parseInt(selectedParts[1]) : null;
  const selectedD = selectedParts[2] ? parseInt(selectedParts[2]) : null;

  return (
    <div className="custom-datepicker-container" ref={containerRef}>
      <div
        className="custom-datepicker-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <CalendarIcon size={12} />
        <span className="custom-datepicker-display">{displayFormat()}</span>
      </div>

      {isOpen && (
        <div className="custom-datepicker-popup">
          <div className="cdp-header">
            <button className="cdp-nav-btn" onClick={handlePrevMonth}><ChevronLeft size={16} /></button>
            <div className="cdp-current-month">
              {mNames[currentView.getMonth()]} {currentView.getFullYear()}
            </div>
            <button className="cdp-nav-btn" onClick={handleNextMonth}><ChevronRight size={16} /></button>
          </div>

          <div className="cdp-grid">
            {daysHeader.map(d => <div key={d} className="cdp-day-name">{d}</div>)}
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} className="cdp-day-empty" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected =
                selectedY == currentView.getFullYear() &&
                selectedM == currentView.getMonth() + 1 &&
                selectedD == day;

              return (
                <div
                  key={day}
                  className={`cdp-day ${isSelected ? 'cdp-day-selected' : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  {day}
                </div>
              );
            })}
          </div>

          <div className="cdp-footer">
            <form onSubmit={handleYearSubmit} className="cdp-year-form">
              <input
                type="text"
                placeholder={t('fecha_solo_año', 'Year only?')}
                value={yearInput}
                onChange={e => setYearInput(e.target.value)}
                className="cdp-year-input"
              />
              <button type="submit" className="cdp-btn-small">{t('fecha_ok', 'OK')}</button>
            </form>
            <button className="cdp-btn-clear" onClick={handleClear}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
