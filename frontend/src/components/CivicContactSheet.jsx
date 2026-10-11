import React from 'react';
import { X, Mail, Phone, AlertCircle, ExternalLink } from 'lucide-react';
import './CivicContactSheet.css';

function CivicContactSheet({ profile, onClose }) {
  if (!profile) return null;

  const renderIcon = (type) => {
    switch (type) {
      case 'whatsapp':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="action-icon whatsapp-icon">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
        );
      case 'email':
        return <Mail size={18} className="action-icon" />;
      case 'phone':
        return <Phone size={18} className="action-icon" />;
      default:
        return <ExternalLink size={18} className="action-icon" />;
    }
  };

  return (
    <div className="civic-sheet-backdrop fade-in" onClick={onClose}>
      <div className="civic-sheet-card slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="civic-sheet-handle"></div>

        <div className="civic-sheet-header">
          <div className="civic-sheet-header-text">
            <span className="civic-sheet-tag">{profile.tag}</span>
            <h3 className="civic-sheet-title">{profile.title}</h3>
            <p className="civic-sheet-subtitle">{profile.subtitle}</p>
          </div>
          <button className="civic-sheet-close-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {profile.notice && (
          <div className="civic-sheet-notice">
            <AlertCircle size={16} color="#d97706" />
            <p>{profile.notice}</p>
          </div>
        )}

        <div className="civic-sheet-actions">
          {profile.actions && profile.actions.map((act, idx) => (
            <a
              key={idx}
              href={act.url}
              target={act.url.startsWith('http') ? '_blank' : '_self'}
              rel="noreferrer"
              className={`civic-action-btn ${act.type}-btn`}
            >
              {renderIcon(act.type)}
              <span>{act.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CivicContactSheet;
