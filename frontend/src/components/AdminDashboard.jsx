import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  LogOut, 
  ArrowLeft, 
  Search, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Filter,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { incidentAPI } from '../services/api';
import './AdminDashboard.css';

const API_BASE_URL = (import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== '')
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.PROD ? '' : 'http://localhost:5000');

function AdminDashboard({ incidents = [], onRefresh, onBackToMap, onLogout }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Status Counts
  const counts = useMemo(() => {
    return {
      total: incidents.length,
      reported: incidents.filter(i => (i.status || 'reported') === 'reported').length,
      under_review: incidents.filter(i => i.status === 'under_review').length,
      in_progress: incidents.filter(i => i.status === 'in_progress').length,
      resolved: incidents.filter(i => i.status === 'resolved').length
    };
  }, [incidents]);

  // Filtered List
  const filteredList = useMemo(() => {
    return incidents.filter(i => {
      const matchStatus = statusFilter === 'all' || (i.status || 'reported') === statusFilter;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q || 
        (i.ward && i.ward.toLowerCase().includes(q)) ||
        (i.description && i.description.toLowerCase().includes(q)) ||
        (i.issueType && i.issueType.toLowerCase().includes(q)) ||
        (i._id && i._id.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [incidents, statusFilter, searchTerm]);

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      await incidentAPI.update(id, { status: newStatus });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update incident status. Ensure your admin key is valid.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this report? This action cannot be undone.')) {
      return;
    }
    setUpdatingId(id);
    try {
      await incidentAPI.delete(id);
      alert('Report deleted successfully.');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to delete incident:', err);
      alert('Failed to delete incident. Ensure your admin key is valid.');
    } finally {
      setUpdatingId(null);
    }
  };

  const resolveImageUrl = (img) => {
    if (!img || typeof img !== 'string') return null;
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    return `${API_BASE_URL}${img}`;
  };

  return (
    <div className="admin-dashboard-wrapper fade-in">
      {/* Top Admin Nav */}
      <header className="admin-nav-bar">
        <div className="admin-nav-left">
          <button className="back-map-btn" onClick={onBackToMap} title="Return to Public Map">
            <ArrowLeft size={18} />
            <span>Map View</span>
          </button>
          <div className="admin-badge-tag">
            <ShieldCheck size={16} color="#16a34a" />
            <span>BBMP Admin Operations</span>
          </div>
        </div>

        <div className="admin-nav-right">
          <button className="refresh-btn" onClick={onRefresh} title="Refresh data">
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          <button className="logout-btn" onClick={onLogout} title="Sign out of admin mode">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Admin KPI Ribbon */}
      <div className="admin-kpi-ribbon">
        <div 
          className={`kpi-card ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <span className="kpi-num">{counts.total}</span>
          <span className="kpi-title">Total Reports</span>
        </div>
        <div 
          className={`kpi-card reported-kpi ${statusFilter === 'reported' ? 'active' : ''}`}
          onClick={() => setStatusFilter('reported')}
        >
          <span className="kpi-num text-blue">{counts.reported}</span>
          <span className="kpi-title">Reported</span>
        </div>
        <div 
          className={`kpi-card under-review-kpi ${statusFilter === 'under_review' ? 'active' : ''}`}
          onClick={() => setStatusFilter('under_review')}
        >
          <span className="kpi-num text-orange">{counts.under_review}</span>
          <span className="kpi-title">Under Review</span>
        </div>
        <div 
          className={`kpi-card in-progress-kpi ${statusFilter === 'in_progress' ? 'active' : ''}`}
          onClick={() => setStatusFilter('in_progress')}
        >
          <span className="kpi-num text-yellow">{counts.in_progress}</span>
          <span className="kpi-title">In Progress</span>
        </div>
        <div 
          className={`kpi-card resolved-kpi ${statusFilter === 'resolved' ? 'active' : ''}`}
          onClick={() => setStatusFilter('resolved')}
        >
          <span className="kpi-num text-green">{counts.resolved}</span>
          <span className="kpi-title">Resolved</span>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by ward, description, or issue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-btn" onClick={() => setSearchTerm('')}>✕</button>
          )}
        </div>

        <div className="admin-filter-tabs">
          <button 
            className={`tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
          <button 
            className={`tab-btn ${statusFilter === 'reported' ? 'active' : ''}`}
            onClick={() => setStatusFilter('reported')}
          >
            Reported
          </button>
          <button 
            className={`tab-btn ${statusFilter === 'under_review' ? 'active' : ''}`}
            onClick={() => setStatusFilter('under_review')}
          >
            Under Review
          </button>
          <button 
            className={`tab-btn ${statusFilter === 'in_progress' ? 'active' : ''}`}
            onClick={() => setStatusFilter('in_progress')}
          >
            In Progress
          </button>
          <button 
            className={`tab-btn ${statusFilter === 'resolved' ? 'active' : ''}`}
            onClick={() => setStatusFilter('resolved')}
          >
            Resolved
          </button>
        </div>
      </div>

      {/* Reports Table / Card List */}
      <div className="admin-table-container">
        {filteredList.length === 0 ? (
          <div className="admin-empty-state">
            <Clock size={40} color="#94a3b8" />
            <p>No reports match the selected criteria</p>
          </div>
        ) : (
          <div className="admin-reports-grid">
            {filteredList.map((incident) => {
              const imgUrl = resolveImageUrl(incident.evidenceUrl || incident.imageUrl);
              const status = incident.status || 'reported';
              const isUpdating = updatingId === incident._id;
              const dateStr = incident.createdAt 
                ? new Date(incident.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })
                : 'Recent';

              return (
                <div key={incident._id} className={`admin-report-card status-border-${status}`}>
                  {/* Photo Thumbnail */}
                  <div className="card-media-col">
                    {imgUrl ? (
                      <div 
                        className="thumb-wrapper" 
                        onClick={() => setPreviewImage(imgUrl)}
                        title="Click to view full photo"
                      >
                        <img 
                          src={imgUrl} 
                          alt="Citizen upload" 
                          className="report-thumb-img"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.classList.add('no-img');
                          }}
                        />
                        <span className="expand-overlay"><ImageIcon size={14} /></span>
                      </div>
                    ) : (
                      <div className="thumb-placeholder">
                        <ImageIcon size={22} color="#94a3b8" />
                        <span>No Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Incident Info */}
                  <div className="card-info-col">
                    <div className="card-header-row">
                      <div className="card-ward-title">
                        {incident.ward || 'Bengaluru Ward'}
                        {incident.wardId ? ` (#${incident.wardId})` : ''}
                      </div>
                      <span className={`severity-badge ${incident.severity || 'medium'}`}>
                        {(incident.severity || 'medium').toUpperCase()}
                      </span>
                    </div>

                    <div className="card-issue-type">
                      {(incident.issueType || 'waterlogging').replace('_', ' ').toUpperCase()}
                    </div>

                    <p className="card-desc">
                      {incident.description || 'Citizen reported water accumulation at this location.'}
                    </p>

                    <div className="card-meta-row">
                      <span>🕒 {dateStr}</span>
                      {incident.location?.coordinates && (
                        <span>
                          📍 {incident.location.coordinates[1]?.toFixed(4)}, {incident.location.coordinates[0]?.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Status Control */}
                  <div className="card-actions-col">
                    <label className="status-select-label">Change Status:</label>
                    <select
                      className={`admin-status-dropdown ${status}`}
                      value={status}
                      disabled={isUpdating}
                      onChange={(e) => handleStatusChange(incident._id, e.target.value)}
                    >
                      <option value="reported">Reported</option>
                      <option value="under_review">Under Review (Orange)</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>

                    <div className="card-bottom-btns">
                      <button 
                        className="delete-report-btn"
                        disabled={isUpdating}
                        onClick={() => handleDelete(incident._id)}
                        title="Delete report"
                      >
                        <Trash2 size={15} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox for Photo Inspection */}
      {previewImage && (
        <div className="lightbox-overlay fade-in" onClick={() => setPreviewImage(null)}>
          <div className="lightbox-content slide-up" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close-btn" onClick={() => setPreviewImage(null)}>
              <X size={20} />
            </button>
            <img src={previewImage} alt="Full evidence" className="lightbox-img" />
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
