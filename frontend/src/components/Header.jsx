import React, { useState, useEffect } from 'react';
import { Droplet, Key, Share2, Bookmark, ChevronDown } from 'lucide-react';
import './Header.css';

function Header({ 
  mainView = 'map', 
  setMainView, 
  stats, 
  severityFilter = 'All Severity', 
  setSeverityFilter,
  statusFilter = 'All Status',
  setStatusFilter,
  onOpenMyReports,
  myReportsCount = 0
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    
    // Try Web Share API (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AquaWatch',
          text: 'Citizen-powered waterlogging intelligence platform',
          url: url
        });
        return;
      } catch (err) {
        // User dismissed or share not supported, fall through
      }
    }

    // Try modern Clipboard API (secure contexts)
    let copiedSuccess = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(url);
        copiedSuccess = true;
      } catch (e) {
        copiedSuccess = false;
      }
    }

    // Universal fallback for non-secure HTTP / Elastic Beanstalk
    if (!copiedSuccess) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        copiedSuccess = true;
      } catch (err) {
        window.prompt('Copy this AquaWatch link:', url);
        return;
      }
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="header-wrapper">
      {/* Top Header Row */}
      <header className="header-top-bar">
        <div className="header-brand">
          <div className="logo-container">
            <Droplet className="logo-icon" size={20} color="#ffffff" />
          </div>
          <div className="brand-text">
            <h1 className="header-title">AquaWatch</h1>
            <p className="header-subtitle">Bengaluru Waterlogging Intelligence</p>
          </div>
        </div>

        <div className="header-actions">
          <button 
            className={`circle-action-btn ${copied ? 'active' : ''}`}
            onClick={handleShare}
            title={copied ? "Link Copied!" : "Share portal"}
          >
            <Share2 size={16} />
          </button>
          {copied && (
            <span style={{
              position: 'absolute',
              top: '48px',
              right: '60px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              fontSize: '11px',
              padding: '4px 8px',
              borderRadius: '6px',
              zIndex: 9999,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              whiteSpace: 'nowrap'
            }}>
              Link Copied!
            </span>
          )}

          <button 
            className="circle-action-btn" 
            onClick={onOpenMyReports}
            title={myReportsCount > 0 ? `My Reported Issues (${myReportsCount})` : "My Reported Issues"}
            style={{ position: 'relative' }}
          >
            <Bookmark size={16} />
            {myReportsCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 800,
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}>
                {myReportsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Sub Header Filter Bar (Matching Reference Image 4) */}
      <div className="header-sub-bar">
        <div className="sub-bar-filters-left">
          <div className="filter-select-wrapper">
            <select 
              className="filter-pill-select" 
              value={severityFilter} 
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="All Severity">All Severity</option>
              <option value="high">High Severity</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <ChevronDown size={14} className="filter-select-chevron" />
          </div>

          <div className="filter-select-wrapper">
            <select 
              className="filter-pill-select" 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All Status">All Status</option>
              <option value="my_reports">My Reported Issues {myReportsCount > 0 ? `(${myReportsCount})` : ''}</option>
              <option value="reported">Open / Reported</option>
              <option value="under_review">Under Review</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <ChevronDown size={14} className="filter-select-chevron" />
          </div>
        </div>

        <div className="sub-bar-toggle-right">
          <div className="view-toggle-pill">
            <button 
              className={`toggle-btn ${mainView === 'map' ? 'active' : ''}`}
              onClick={() => setMainView('map')}
            >
              Map
            </button>
            <button 
              className={`toggle-btn ${mainView === 'list' ? 'active' : ''}`}
              onClick={() => setMainView('list')}
            >
              List
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;
