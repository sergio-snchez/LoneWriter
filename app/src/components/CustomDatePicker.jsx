import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import './CustomDatePicker.css';

export function CustomDatePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState(new Date());
  const [yearInput, setYearInput] = useState('');
  const containerRef = useRef(null);
  const { t } = useTranslation('editor');

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
  // Adjust so Monday is 0
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

  const displayFormat = () => {
    if (!value) return i18n.language.startsWith('en') ? 'YYYY/MM/DD' : 'DD/MM/AAAA';
    const parts = value.split('-');
    if (parts.length === 1) return parts[0]; // Just year
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return i18n.language.startsWith('en') ? `${y}/${m}/${d}` : `${d}/${m}/${y}`;
    }
    return value;
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const mNames = i18n.language.startsWith('en') ? monthNamesEn : monthNames;
  const daysHeader = i18n.language.startsWith('en') ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] : ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  const selectedY = value ? value.split('-')[0] : null;
  const selectedM = value ? value.split('-')[1] : null;
  const selectedD = value ? value.split('-')[2] : null;

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
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} className="cdp-day-empty"></div>)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected = selectedY == currentView.getFullYear() && 
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
                placeholder={i18n.language.startsWith('en') ? "Only year?" : "¿Solo año?"}
                value={yearInput}
                onChange={e => setYearInput(e.target.value)}
                className="cdp-year-input"
              />
              <button type="submit" className="cdp-btn-small">OK</button>
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
