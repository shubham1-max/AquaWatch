import React from 'react';
import './IncidentModal.css';
import { X, CheckCircle, Share2, AlertTriangle, ShieldCheck, Navigation, ThumbsUp, CloudRain, PlusCircle, Camera, RotateCcw, AlertCircle, Check } from 'lucide-react';
import bangaloreWards from '../data/bangalore-wards.json';
import { getWardDetailsForIncident } from '../utils/wardData';
import { incidentAPI } from '../services/api';
import CivicContactSheet from './CivicContactSheet';

const API_BASE_URL = (import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== '')
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.PROD ? '' : 'http://localhost:5000');

function IncidentModal({ incident, onClose, onUpdate, onOpenReportForm }) {
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [imgLoadError, setImgLoadError] = React.useState(false);
  const [copyFeedback, setCopyFeedback] = React.useState(false);
  const [activeContactSheet, setActiveContactSheet] = React.useState(null);
  
  // Real-time confirmation tracking
  const [confirmationsCount, setConfirmationsCount] = React.useState(incident?.confirmationsCount || 0);
  const [hasConfirmed, setHasConfirmed] = React.useState(false);
  const [isConfirming, setIsConfirming] = React.useState(false);

  // Situation photo verification update states
  const [showStatusUpdateSheet, setShowStatusUpdateSheet] = React.useState(false);
  const [targetStatus, setTargetStatus] = React.useState('resolved'); // 'in_progress' or 'resolved'
  const [statusPhoto, setStatusPhoto] = React.useState(null);
  const [statusPhotoPreview, setStatusPhotoPreview] = React.useState(null);
  const [resolutionNote, setResolutionNote] = React.useState('');
  const [photoError, setPhotoError] = React.useState(null);
  const fileInputRef = React.useRef(null);

  if (!incident) return null;

  const isWardOverview = incident.isWardOverview === true || !incident._id || String(incident._id).startsWith('ward-');

  const openStatusUpdateFlow = (status) => {
    setTargetStatus(status);
    setStatusPhoto(null);
    setStatusPhotoPreview(null);
    setResolutionNote('');
    setPhotoError(null);
    setShowStatusUpdateSheet(true);
  };

  const handleVerify = () => {
    openStatusUpdateFlow('resolved');
  };

  const handleMarkInProgress = () => {
    openStatusUpdateFlow('in_progress');
  };

  const handleMarkUnderReview = async () => {
    if (!incident._id || isWardOverview) return;
    const hasAdminKey = !!localStorage.getItem('admin_api_key');
    if (!hasAdminKey) {
      alert('⚠️ Only municipal officials can set status to "Under Review". Citizens can verify and update to "In Progress" or "Resolved" by providing photo proof of the situation.');
      return;
    }
    setIsUpdating(true);
    try {
      await onUpdate(incident._id, { status: 'under_review' });
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Image size must be less than 10MB.');
      return;
    }

    setPhotoError(null);
    setStatusPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setStatusPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitStatusUpdate = async (e) => {
    if (e) e.preventDefault();
    if (!incident._id || isWardOverview) return;

    if (!statusPhoto) {
      setPhotoError('A photo of the current situation is strictly required.');
      return;
    }

    setIsUpdating(true);
    setPhotoError(null);
    try {
      const formData = new FormData();
      formData.append('photo', statusPhoto);
      formData.append('status', targetStatus);
      if (resolutionNote.trim()) {
        formData.append('resolutionNote', resolutionNote.trim());
      }

      await onUpdate(incident._id, formData);
      setShowStatusUpdateSheet(false);
      if (targetStatus === 'resolved') {
        setTimeout(() => onClose(), 800);
      }
    } catch (error) {
      console.error('Failed to submit situation update:', error);
      setPhotoError(error.response?.data?.message || 'Failed to submit update. Please check photo and try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmSaw = async () => {
    if (hasConfirmed || isConfirming || !incident._id || isWardOverview) return;
    setIsConfirming(true);
    try {
      await incidentAPI.confirm(incident._id);
      setConfirmationsCount(prev => prev + 1);
      setHasConfirmed(true);
      if (onUpdate) {
        onUpdate(incident._id, { confirmationsCount: confirmationsCount + 1 });
      }
    } catch (err) {
      console.error('Failed to record confirmation:', err);
      // Graceful local feedback
      setConfirmationsCount(prev => prev + 1);
      setHasConfirmed(true);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleShareIncident = () => {
    const url = window.location.href;
    const fallbackCopy = (text) => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2500);
      } catch (e) {
        alert('Shareable link: ' + text);
      }
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url)
        .then(() => {
          setCopyFeedback(true);
          setTimeout(() => setCopyFeedback(false), 2500);
        })
        .catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
  };

  // Resolve image URL safely
  const candidateImg = incident.evidenceUrl || incident.imageUrl || incident.photo || incident.incidents?.[0]?.evidenceUrl || incident.incidents?.[0]?.imageUrl;
  const rawImg = typeof candidateImg === 'string' ? candidateImg : null;
  const hasPhoto = !!rawImg && !imgLoadError;
  const photoUrl = rawImg
    ? (rawImg.startsWith('http') || rawImg.startsWith('data:') ? rawImg : `${API_BASE_URL}${rawImg}`)
    : null;

  // Real database dates and elapsed time calculation
  const hasValidDate = incident.createdAt || incident.observedAt;
  const validDate = hasValidDate && !isNaN(new Date(hasValidDate).getTime()) ? new Date(hasValidDate) : null;
  const daysAgo = validDate ? Math.max(0, Math.floor((Date.now() - validDate.getTime()) / (1000 * 60 * 60 * 24))) : 0;
  const descStr = typeof incident.description === 'string' ? incident.description : '';

  const isCritical = incident.severity === 'high';
  const isResolved = incident.status === 'resolved';
  const isUnderReview = incident.status === 'under_review';
  const isInProgress = incident.status === 'in_progress';

  // Dynamic ward and official lookup from real Bengaluru data
  const wardInfo = getWardDetailsForIncident(incident, bangaloreWards) || {};

  // Extract coordinates for navigation safely
  const lat = (incident.location?.coordinates && typeof incident.location.coordinates[1] === 'number') 
    ? incident.location.coordinates[1] 
    : (typeof incident.latitude === 'number' ? incident.latitude : 12.9716);
  const lng = (incident.location?.coordinates && typeof incident.location.coordinates[0] === 'number')
    ? incident.location.coordinates[0]
    : (typeof incident.longitude === 'number' ? incident.longitude : 77.5946);

  // Dynamic NammaNeeru runoff estimate: Runoff (L) = rainfall (25mm) * area (500m²) * coefficient
  const runoffCoefficients = {
    waterlogging: 0.85,
    blocked_drain: 0.80,
    overflow: 0.90,
    visible_leak: 0.50
  };
  const issueKey = typeof incident.issueType === 'string' ? incident.issueType : 'waterlogging';
  const coefficient = runoffCoefficients[issueKey] || 0.8;
  const estimatedRunoffLitres = isWardOverview ? 0 : Math.round(25 * 450 * coefficient);

  const formattedIssueType = typeof incident.issueType === 'string' 
    ? incident.issueType.replace('_', ' ').toUpperCase() 
    : (isWardOverview ? 'CLEAR' : 'WATERLOGGING');

  return (
    <div className="incident-modal-overlay" onClick={onClose}>
      <div className="incident-modal slide-in-right" onClick={(e) => e.stopPropagation()}>
        {/* Top Drag Handle */}
        <div className="modal-drag-handle"></div>

        {/* Top Header */}
        <div className="modal-header-top">
          <div className="status-indicators">
            {isWardOverview ? (
              <>
                <span className="status-dot" style={{ color: '#16a34a' }}>●</span>
                <span className="status-text-severity">WARD ACCOUNTABILITY</span>
                <span className="status-separator">•</span>
                <span 
                  className="status-badge-pill"
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    background: '#f0fdf4',
                    color: '#16a34a',
                    border: '1.5px solid #86efac'
                  }}
                >
                  CLEAR (0 REPORTS)
                </span>
              </>
            ) : (
              <>
                <span 
                  className={`status-dot ${isCritical ? 'critical' : ''}`}
                  style={{
                    color: isUnderReview ? '#ea580c' :
                           isInProgress ? '#ca8a04' :
                           isResolved ? '#16a34a' :
                           isCritical ? '#e11d48' : '#0ea5e9'
                  }}
                >●</span>
                <span className={`status-text-severity ${isCritical ? 'critical' : ''}`}>
                  {isCritical ? 'CRITICAL' : incident.severity?.toUpperCase() || 'MEDIUM'}
                </span>
                <span className="status-separator">•</span>
                
                {/* Status Badge with distinctive Orange for under_review */}
                <span 
                  className={`status-badge-pill ${incident.status || 'reported'}`}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    background: isUnderReview ? '#fff7ed' :
                                isInProgress ? '#fefce8' :
                                isResolved ? '#f0fdf4' : '#fef2f2',
                    color: isUnderReview ? '#ea580c' :
                           isInProgress ? '#ca8a04' :
                           isResolved ? '#16a34a' : '#ef4444',
                    border: `1.5px solid ${
                      isUnderReview ? '#ea580c' :
                      isInProgress ? '#facc15' :
                      isResolved ? '#86efac' : '#fca5a5'
                    }`
                  }}
                >
                  {isUnderReview ? 'UNDER REVIEW' :
                   isInProgress ? 'IN PROGRESS' :
                   isResolved ? 'RESOLVED' : 'REPORTED'}
                </span>
              </>
            )}
          </div>

          <div className="header-actions">
            <button 
              className="header-icon-btn" 
              title="Share incident link" 
              onClick={handleShareIncident}
              style={{ position: 'relative' }}
            >
              <Share2 size={18} />
              {copyFeedback && (
                <span style={{
                  position: 'absolute',
                  top: '-24px',
                  right: '0',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap'
                }}>
                  Copied!
                </span>
              )}
            </button>
            <button className="header-icon-btn close-btn" onClick={onClose} title="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="modal-scroll-content">
          {/* Incident Evidence Photo Container OR Verified Civic Overview Card */}
          {isWardOverview ? (
            <div className="modal-no-photo-card ward-overview-card" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
              <div className="no-photo-icon-wrap" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <ShieldCheck size={28} color="#16a34a" />
              </div>
              <div className="no-photo-info">
                <div className="no-photo-badge" style={{ color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}>
                  GOVERNANCE & CIVIC OVERVIEW
                </div>
                <div className="no-photo-title" style={{ color: '#0f172a' }}>No Active Waterlogging Reports</div>
                <div className="no-photo-sub">
                  Ward #{wardInfo?.wardId || 'BBMP'} currently has 0 active citizen incident reports. Official civic contacts & escalation directory below.
                </div>
              </div>
              {onOpenReportForm && (
                <button 
                  className="saw-this-btn inline-btn" 
                  onClick={() => {
                    onClose();
                    onOpenReportForm(wardInfo);
                  }}
                  style={{ color: '#0284c7', borderColor: '#bae6fd' }}
                >
                  <PlusCircle size={13} style={{ marginRight: '6px' }} />
                  Report in Ward
                </button>
              )}
            </div>
          ) : hasPhoto ? (
            <div className="modal-image-container">
              <img 
                src={photoUrl} 
                alt="Incident evidence" 
                className="modal-image"
                onError={() => setImgLoadError(true)}
              />
              <button 
                className="saw-this-btn" 
                onClick={handleConfirmSaw}
                disabled={hasConfirmed || isConfirming}
              >
                <ThumbsUp size={13} style={{ marginRight: '6px' }} />
                {hasConfirmed ? `Confirmed (${confirmationsCount})` : `I saw this too (${confirmationsCount})`}
              </button>
            </div>
          ) : (
            <div className="modal-no-photo-card">
              <div className="no-photo-icon-wrap">
                <CloudRain size={26} color="#0284c7" />
              </div>
              <div className="no-photo-info">
                <div className="no-photo-badge">CITIZEN FIELD REPORT</div>
                <div className="no-photo-title">GPS Verified {formattedIssueType}</div>
                <div className="no-photo-sub">Exact coordinates verified · No photo attached by reporter</div>
              </div>
              <button 
                className="saw-this-btn inline-btn" 
                onClick={handleConfirmSaw}
                disabled={hasConfirmed || isConfirming}
              >
                <ThumbsUp size={13} style={{ marginRight: '6px' }} />
                {hasConfirmed ? `Confirmed (${confirmationsCount})` : `I saw this too (${confirmationsCount})`}
              </button>
            </div>
          )}

          {/* Anonymous Security Badge */}
          <div className="anonymous-badge">
            <ShieldCheck size={16} color="#16a34a" />
            <span>All reports are anonymous</span>
          </div>

          {/* Location & Landmark Header */}
          <div className="location-detail-block">
            <h2 className="location-area-title">{wardInfo?.wardName || incident.ward || 'Bengaluru Ward'}</h2>
            <p className="location-landmark-text">
              {descStr || `Ward #${wardInfo?.wardId || 'BBMP'} · ${wardInfo?.zone || 'Bengaluru'} Zone, Bengaluru`}
            </p>
            <a 
              href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
              target="_blank" 
              rel="noreferrer" 
              className="directions-link"
            >
              <Navigation size={13} />
              Get directions
            </a>
          </div>

          {/* Three-Column Stats Row */}
          <div className="stats-metric-row">
            {isWardOverview ? (
              <>
                <div className="stat-metric-col">
                  <span className="metric-val">{incident.totalReports || 0}</span>
                  <span className="metric-lbl">Total Reports</span>
                </div>
                <div className="stat-metric-divider"></div>
                <div className="stat-metric-col">
                  <span className="metric-val">{incident.unresolvedReports || 0}</span>
                  <span className="metric-lbl">Active Unresolved</span>
                </div>
                <div className="stat-metric-divider"></div>
                <div className="stat-metric-col">
                  <span className="metric-val-type" style={{ color: '#16a34a' }}>CLEAR</span>
                  <span className="metric-lbl">Ward Status</span>
                </div>
              </>
            ) : (
              <>
                <div className="stat-metric-col">
                  <span className="metric-val">{confirmationsCount}</span>
                  <span className="metric-lbl">Confirmations</span>
                </div>
                <div className="stat-metric-divider"></div>
                <div className="stat-metric-col">
                  <span className="metric-val">{daysAgo === 0 ? 'Today' : `${daysAgo}d`}</span>
                  <span className="metric-lbl">Report Age</span>
                </div>
                <div className="stat-metric-divider"></div>
                <div className="stat-metric-col">
                  <span className="metric-val-type">{formattedIssueType}</span>
                  <span className="metric-lbl">Issue Type</span>
                </div>
              </>
            )}
          </div>

          {/* Accountability Section */}
          <div className="accountability-header-row">
            <div className="modal-kicker">ACCOUNTABILITY</div>
            <div className="accountability-hint">Tap any card for official contacts</div>
          </div>

          {/* Dynamic Ward Root Box */}
          <div className="ward-root-box">
            <span className="ward-root-sub">Your Ward</span>
            <span className="ward-root-name">{wardInfo?.zone || 'Bengaluru'} #{wardInfo?.wardId || 'BBMP'}</span>
          </div>

          {/* Fork Split */}
          <div className="fork-tree-container">
            <svg className="fork-svg-lines" viewBox="0 0 320 40" preserveAspectRatio="none">
              <path d="M 160 0 C 160 20, 80 15, 80 40" stroke="#cbd5e1" strokeWidth="2" fill="none" />
              <path d="M 160 0 C 160 20, 240 15, 240 40" stroke="#cbd5e1" strokeWidth="2" fill="none" />
            </svg>

            <div className="fork-nodes-row">
              {/* Left Branch: Agency */}
              <div 
                className="fork-branch agency-branch clickable-civic-node"
                onClick={() => setActiveContactSheet(wardInfo?.agencyProfile)}
                role="button"
                tabIndex={0}
                title="Tap for official BWSSB / BSWML contact options"
              >
                <div className="branch-icon-wrap">
                  <img src="/org_bswml.png" alt="BWSSB" className="branch-icon-img" onError={(e) => e.target.style.display = 'none'} />
                </div>
                <div className="branch-title">BWSSB / BSWML</div>
                <div className="branch-sub">Reports to GBA</div>
              </div>

              {/* Right Branch: Corporator */}
              <div 
                className="fork-branch corporator-branch clickable-civic-node"
                onClick={() => setActiveContactSheet(wardInfo?.corporatorProfile)}
                role="button"
                tabIndex={0}
                title="Tap for Corporator details & escalation"
              >
                <div className="branch-icon-wrap warn-icon">
                  <AlertTriangle size={22} color="#f59e0b" />
                </div>
                <div className="branch-title corporator-title">Corporator</div>
                <div className="branch-sub vacant-sub">Vacant since 2020</div>
              </div>
            </div>
          </div>

          {/* Vertical Hierarchy Chain under Agency */}
          <div className="vertical-chain-container">
            <div className="chain-vertical-line"></div>

            {/* Commissioner */}
            <div 
              className="chain-node clickable-civic-node"
              onClick={() => setActiveContactSheet(wardInfo?.commissionerProfile)}
              role="button"
              tabIndex={0}
              title="Tap for Commissioner contact options"
            >
              <div className="chain-pill comm-pill">COMM</div>
              <div className="chain-text">
                <div className="chain-title">Commissioner</div>
                <div className="chain-desc">GBA / Corporation head · Top of chain</div>
              </div>
            </div>

            {/* Additional Commissioner */}
            <div 
              className="chain-node clickable-civic-node"
              onClick={() => setActiveContactSheet(wardInfo?.acProfile)}
              role="button"
              tabIndex={0}
              title="Tap for Zonal Joint Commissioner contact options"
            >
              <div className="chain-pill ac-pill">AC</div>
              <div className="chain-text">
                <div className="chain-title">Additional Commissioner</div>
                <div className="chain-desc">{wardInfo?.zone || 'Zonal'}-level oversight</div>
              </div>
            </div>

            {/* Asst. Executive Engineer */}
            <div 
              className="chain-node clickable-civic-node"
              onClick={() => setActiveContactSheet(wardInfo?.aeeProfile)}
              role="button"
              tabIndex={0}
              title="Tap for AEE Engineering contact options"
            >
              <div className="chain-pill aee-pill">AEE</div>
              <div className="chain-text">
                <div className="chain-title">Asst. Executive Engineer</div>
                <div className="chain-desc">{wardInfo?.assemblyName || 'Ward'} Engineering oversight</div>
              </div>
            </div>

            {/* Junior Health Inspector (JHI) */}
            <div 
              className="chain-node clickable-civic-node"
              onClick={() => setActiveContactSheet(wardInfo?.jhiProfile)}
              role="button"
              tabIndex={0}
              title="Tap for Junior Health Inspector contact options"
            >
              <div className="chain-pill jhi-pill">JHI</div>
              <div className="chain-text">
                <div className="chain-title">Junior Health Inspector</div>
                <div className="chain-desc">Frontline ward officer (JHI)</div>
              </div>
            </div>
          </div>

          {/* Dotted Divider */}
          <div className="dotted-separator"></div>

          {/* Elected Representatives */}
          <div className="elected-reps-section">
            <div className="reps-kicker">ELECTED REPRESENTATIVES FOR THIS WARD</div>
            <div className="reps-grid">
              {/* MLA */}
              <div 
                className="rep-card clickable-civic-node"
                onClick={() => setActiveContactSheet(wardInfo?.mlaProfile)}
                role="button"
                tabIndex={0}
                title="Tap for MLA contact options"
              >
                <div className="rep-avatar-wrap">
                  <img 
                    src={wardInfo?.mla?.photo || '/rep_rizwan.png'} 
                    alt={wardInfo?.mla?.name || 'MLA'} 
                    className="rep-avatar-img"
                    onError={(e) => {
                      e.target.src = '/rep_rizwan.png';
                    }}
                  />
                </div>
                <div className="rep-info">
                  <div className="rep-name">{wardInfo?.mla?.name || 'Local MLA'}</div>
                  <div className="rep-designation">
                    <span className={`party-${(wardInfo?.mla?.party || 'INC').toLowerCase()}`}>{wardInfo?.mla?.party || 'INC'}</span> · MLA
                  </div>
                  <div className="rep-constituency">{wardInfo?.mla?.constituency || wardInfo?.assemblyName || 'Constituency'}</div>
                </div>
              </div>

              {/* MP */}
              <div 
                className="rep-card clickable-civic-node"
                onClick={() => setActiveContactSheet(wardInfo?.mpProfile)}
                role="button"
                tabIndex={0}
                title="Tap for MP contact options"
              >
                <div className="rep-avatar-wrap">
                  <img 
                    src={wardInfo?.mp?.photo || '/rep_pc_mohan.png'} 
                    alt={wardInfo?.mp?.name || 'MP'} 
                    className="rep-avatar-img"
                    onError={(e) => {
                      e.target.src = '/rep_pc_mohan.png';
                    }}
                  />
                </div>
                <div className="rep-info">
                  <div className="rep-name">{wardInfo?.mp?.name || 'P. C. Mohan'}</div>
                  <div className="rep-designation">
                    <span className={`party-${(wardInfo?.mp?.party || 'BJP').toLowerCase()}`}>{wardInfo?.mp?.party || 'BJP'}</span> · MP
                  </div>
                  <div className="rep-constituency">{wardInfo?.mp?.constituency || 'Bangalore'}</div>
                </div>
              </div>
            </div>
            <div className="reps-tap-helper">Tap any card for contact options</div>
          </div>

          {/* NammaNeeru Water Intelligence Card */}
          <div className="nammaneeru-intel-card">
            <div className="intel-header">
              <CloudRain size={16} color="#0284c7" />
              <span className="intel-title">NammaNeeru Water Intelligence</span>
            </div>
            <div className="intel-body">
              <div className="intel-stat">
                <span className="intel-label">Candidate Runoff Capture</span>
                <span className="intel-value">
                  {isWardOverview ? '0 Litres (Clear)' : `~${estimatedRunoffLitres.toLocaleString()} Litres`}
                </span>
              </div>
              <p className="intel-recommendation">
                {isWardOverview ? (
                  <><strong>Ward Recommendation:</strong> No active stormwater flooding detected in this ward. Routine civic maintenance of secondary storm drains recommended.</>
                ) : (
                  <><strong>Recommended Intervention:</strong> Desilt primary storm drain & construct a localized percolation pit along road shoulder to mitigate recurrence.</>
                )}
              </p>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="report-meta-summary">
            {isWardOverview ? (
              `Ward #${wardInfo?.wardId || 'BBMP'} · 0 active reports · Civic directory active`
            ) : (
              `Reported ${daysAgo === 0 ? 'today' : `${daysAgo}d ago`} · Confirmed by ${confirmationsCount} citizens · Status: ${(incident.status || 'reported').replace('_', ' ').toUpperCase()}`
            )}
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="modal-bottom-actions">
          {isWardOverview ? (
            <button
              className="report-in-ward-btn"
              onClick={() => {
                onClose();
                if (onOpenReportForm) onOpenReportForm(wardInfo);
              }}
              style={{
                width: '100%',
                padding: '13px 18px',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)'
              }}
            >
              <PlusCircle size={18} />
              Report Waterlogging in this Ward
            </button>
          ) : (
            <div className="admin-status-bar" style={{ display: 'flex', gap: '8px', width: '100%' }}>
              {/* Orange Mark Under Review Button */}
              {!isResolved && !isUnderReview && (
                <button
                  className="status-action-btn under-review-btn"
                  onClick={handleMarkUnderReview}
                  disabled={isUpdating}
                  style={{
                    flex: 1,
                    padding: '12px 10px',
                    border: '1.5px solid #ea580c',
                    background: '#fff7ed',
                    color: '#ea580c',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                    opacity: isUpdating ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ea580c' }}></span>
                  Under Review
                </button>
              )}

              {/* In Progress Button */}
              {!isResolved && !isInProgress && (
                <button
                  className="status-action-btn in-progress-btn"
                  onClick={handleMarkInProgress}
                  disabled={isUpdating}
                  title="Upload proof photo to mark as In Progress"
                  style={{
                    flex: 1,
                    padding: '12px 10px',
                    border: '1.5px solid #ca8a04',
                    background: '#fefce8',
                    color: '#a16207',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                    opacity: isUpdating ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Camera size={14} color="#a16207" />
                  In Progress
                </button>
              )}

              {/* Verify Cleanup (Resolved) */}
              <button
                className="verify-cleanup-btn"
                onClick={handleVerify}
                disabled={isUpdating || isResolved}
                title="Upload proof photo to verify cleanup and mark as Resolved"
                style={{
                  flex: 1.2,
                  padding: '12px 12px',
                  opacity: isResolved ? 0.6 : 1,
                  cursor: isResolved ? 'not-allowed' : (isUpdating ? 'not-allowed' : 'pointer'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: isResolved ? '#15803d' : '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13px'
                }}
              >
                <Camera size={14} color="#ffffff" />
                {isResolved ? 'Resolved' : (isUpdating ? 'Updating...' : 'Verify Cleanup')}
              </button>
            </div>
          )}
        </div>

        {/* Situation Photo Verification Update Sheet */}
        {showStatusUpdateSheet && (
          <div className="status-update-sheet">
            <div className="update-sheet-header">
              <div className="update-sheet-title-group">
                <div className="update-sheet-badge">
                  <Camera size={13} />
                  <span>SITUATION VERIFICATION</span>
                </div>
                <h3 className="update-sheet-title">Update Issue Status</h3>
              </div>
              <button 
                className="sheet-close-btn"
                onClick={() => {
                  setShowStatusUpdateSheet(false);
                  setStatusPhoto(null);
                  setStatusPhotoPreview(null);
                  setPhotoError(null);
                }}
                disabled={isUpdating}
                title="Cancel"
              >
                <X size={18} />
              </button>
            </div>

            <div className="update-sheet-body">
              <div className="update-sheet-notice">
                <p>
                  Uploading a new photo of the situation is <strong>strictly required</strong> to analyze whether work is in progress or resolved.
                </p>
              </div>

              <div className="update-status-selector">
                <label className="update-field-label">Current Ground Situation:</label>
                <div className="status-toggle-options">
                  <button
                    type="button"
                    className={`status-toggle-card in-progress ${targetStatus === 'in_progress' ? 'active' : ''}`}
                    onClick={() => setTargetStatus('in_progress')}
                    disabled={isUpdating}
                  >
                    <div className="toggle-indicator"></div>
                    <div className="toggle-info">
                      <span className="toggle-name">In Progress</span>
                      <span className="toggle-desc">Crews active, suction or repair underway</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`status-toggle-card resolved ${targetStatus === 'resolved' ? 'active' : ''}`}
                    onClick={() => setTargetStatus('resolved')}
                    disabled={isUpdating}
                  >
                    <div className="toggle-indicator"></div>
                    <div className="toggle-info">
                      <span className="toggle-name">Resolved</span>
                      <span className="toggle-desc">Flood drained, debris cleared, dry street</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="update-photo-upload-section">
                <label className="update-field-label">
                  Situation Photo Proof <span className="required-star">* (Required)</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handlePhotoChange}
                />

                {!statusPhotoPreview ? (
                  <div
                    className={`update-photo-dropzone ${photoError ? 'has-error' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="dropzone-icon-circle">
                      <Camera size={24} />
                    </div>
                    <span className="dropzone-main-text">Take Photo or Upload Image</span>
                    <span className="dropzone-sub-text">Tap to attach photo proof of current condition</span>
                  </div>
                ) : (
                  <div className="update-photo-preview-card">
                    <img src={statusPhotoPreview} alt="Situation proof preview" className="update-preview-img" />
                    <div className="preview-overlay-info">
                      <span className="preview-status-pill">
                        <Check size={12} /> Photo Attached
                      </span>
                      <button
                        type="button"
                        className="change-photo-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUpdating}
                      >
                        <RotateCcw size={13} /> Change Photo
                      </button>
                    </div>
                  </div>
                )}

                {photoError && (
                  <div className="update-sheet-error">
                    <AlertCircle size={14} />
                    <span>{photoError}</span>
                  </div>
                )}
              </div>

              <div className="update-note-section">
                <label className="update-field-label">Situation Notes (Optional)</label>
                <textarea
                  className="update-note-textarea"
                  rows={2}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder={targetStatus === 'resolved' 
                    ? "e.g., Storm drain unblocked by BBMP, road completely dry and clear."
                    : "e.g., BBMP suction tanker on site draining the waterlogging."}
                  maxLength={300}
                  disabled={isUpdating}
                />
              </div>
            </div>

            <div className="update-sheet-actions">
              <button
                type="button"
                className="sheet-cancel-btn"
                onClick={() => {
                  setShowStatusUpdateSheet(false);
                  setStatusPhoto(null);
                  setStatusPhotoPreview(null);
                  setPhotoError(null);
                }}
                disabled={isUpdating}
              >
                Cancel
              </button>

              <button
                type="button"
                className={`sheet-submit-btn ${targetStatus === 'resolved' ? 'resolved' : 'in-progress'}`}
                onClick={handleSubmitStatusUpdate}
                disabled={isUpdating || !statusPhoto}
              >
                {isUpdating ? (
                  <>
                    <span className="submit-spinner"></span>
                    <span>Uploading & Updating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    <span>
                      {targetStatus === 'resolved' ? 'Verify & Mark Resolved' : 'Verify & Mark In Progress'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Civic Contact Action Sheet Popup Modal */}
        {activeContactSheet && (
          <CivicContactSheet 
            profile={activeContactSheet} 
            onClose={() => setActiveContactSheet(null)} 
          />
        )}
      </div>
    </div>
  );
}

export default IncidentModal;
