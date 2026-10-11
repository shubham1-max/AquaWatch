import React from 'react';
import { X, Clock, MapPin, CheckCircle, ChevronRight, AlertCircle, PlusCircle } from 'lucide-react';
import './MyReportsModal.css';

const API_BASE_URL = (import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== '')
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.PROD ? '' : 'http://localhost:5000');

function MyReportsModal({ isOpen, onClose, myIncidents = [], onSelectIncident, onOpenReportForm }) {
  if (!isOpen) return null;

  const resolveImageUrl = (img) => {
    if (!img || typeof img !== 'string') return null;
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    return `${API_BASE_URL}${img}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'under_review':
        return <span className="my-status-pill under-review">Under Review</span>;
      case 'in_progress':
        return <span className="my-status-pill in-progress">In Progress</span>;
      case 'resolved':
        return <span className="my-status-pill resolved">Resolved</span>;
      default:
        return <span className="my-status-pill reported">Reported</span>;
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    const diffHours = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="my-reports-overlay fade-in" onClick={onClose}>
      <div className="my-reports-modal slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="my-reports-drag-handle"></div>

        <div className="my-reports-header">
          <div className="my-reports-title-wrap">
            <h2>My Reported Issues</h2>
            <span className="my-reports-count-tag">{myIncidents.length}</span>
          </div>
          <button className="my-reports-close-btn" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="my-reports-body">
          {myIncidents.length === 0 ? (
            <div className="my-reports-empty">
              <div className="empty-circle-icon">
                <AlertCircle size={32} color="#0284c7" />
              </div>
              <h3>No Reports From This Device Yet</h3>
              <p>
                When you report waterlogging or overflow issues across Bengaluru, you can track BBMP investigation and cleanup progress here.
              </p>
              <button 
                className="my-reports-submit-cta"
                onClick={() => {
                  onClose();
                  if (onOpenReportForm) onOpenReportForm();
                }}
              >
                <PlusCircle size={16} />
                <span>Report an Issue Now</span>
              </button>
            </div>
          ) : (
            <div className="my-reports-list">
              {myIncidents.map((incident) => {
                const photoSrc = resolveImageUrl(incident.evidenceUrl || incident.imageUrl);
                return (
                  <div 
                    key={incident._id} 
                    className="my-report-card"
                    onClick={() => {
                      onClose();
                      if (onSelectIncident) onSelectIncident(incident);
                    }}
                  >
                    <div className="my-report-thumb-col">
                      {photoSrc ? (
                        <img 
                          src={photoSrc} 
                          alt="Report evidence" 
                          className="my-report-thumb-img"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="my-report-thumb-placeholder">
                          <MapPin size={20} color="#0284c7" />
                        </div>
                      )}
                    </div>

                    <div className="my-report-info-col">
                      <div className="my-report-top-line">
                        <span className="my-report-type">
                          {(incident.issueType || 'waterlogging').replace('_', ' ').toUpperCase()}
                        </span>
                        {getStatusBadge(incident.status)}
                      </div>

                      <div className="my-report-ward-name">
                        {incident.ward || incident.wardName || 'Bengaluru Location'}
                      </div>

                      {incident.description && (
                        <div className="my-report-desc">
                          {incident.description}
                        </div>
                      )}

                      <div className="my-report-time-line">
                        <Clock size={12} />
                        <span>Reported {formatRelativeTime(incident.createdAt || incident.observedAt)}</span>
                      </div>
                    </div>

                    <div className="my-report-arrow-col">
                      <ChevronRight size={18} color="#94a3b8" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyReportsModal;
