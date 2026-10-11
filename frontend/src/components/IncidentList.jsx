import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, Droplets } from 'lucide-react';
import bangaloreWards from '../data/bangalore-wards.json';
import { getWardGroups } from '../utils/wardData';
import './IncidentList.css';

function IncidentList({ incidents, onUpdate, loading, onLoadMore, hasNextPage, onSelect }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Group incidents into Bengaluru wards using real GeoJSON data
  const wardGroups = useMemo(() => {
    return getWardGroups(incidents, bangaloreWards);
  }, [incidents]);

  // Filter wards in real-time based on the search query
  const filteredWards = useMemo(() => {
    if (!searchQuery.trim()) return wardGroups;
    const q = searchQuery.toLowerCase().trim();
    return wardGroups.filter(w => 
      (w.searchTerms && w.searchTerms.includes(q)) ||
      w.wardName.toLowerCase().includes(q) ||
      w.zoneTag.toLowerCase().includes(q) ||
      w.mlaName.toLowerCase().includes(q) ||
      (w.cleanAssembly && w.cleanAssembly.toLowerCase().includes(q))
    );
  }, [wardGroups, searchQuery]);

  const handleRowClick = (ward) => {
    if (!onSelect) return;
    
    // Check if there is an actual incident reported in this ward
    const matchingIncident = ward.incidents?.find(i => i.evidenceUrl || i.imageUrl) || ward.incidents?.[0];

    if (matchingIncident) {
      // Real incident exists in this ward
      onSelect({
        ...matchingIncident,
        isWardOverview: false,
        wardId: ward.wardId,
        wardName: ward.wardName,
        zone: ward.zone,
        zoneTag: ward.zoneTag,
        totalReports: ward.totalReports,
        unresolvedReports: ward.unresolvedReports,
        mlaName: ward.mlaName,
        mlaParty: ward.mlaParty,
        mlaPhoto: ward.mlaPhoto,
        mpName: ward.mpName,
        mpParty: ward.mpParty,
        mpPhoto: ward.mpPhoto
      });
    } else {
      // 0 reports in this ward: Clean Ward Accountability Overview
      onSelect({
        _id: null,
        isWardOverview: true,
        ward: ward.wardName,
        wardName: ward.wardName,
        wardId: ward.wardId,
        zone: ward.zone,
        zoneTag: ward.zoneTag,
        totalReports: 0,
        unresolvedReports: 0,
        status: 'clear',
        severity: 'none',
        description: '',
        issueType: null,
        createdAt: null,
        evidenceUrl: null,
        incidents: [],
        mlaName: ward.mlaName,
        mlaParty: ward.mlaParty,
        mlaPhoto: ward.mlaPhoto,
        mpName: ward.mpName,
        mpParty: ward.mpParty,
        mpPhoto: ward.mpPhoto
      });
    }
  };

  return (
    <div className="incident-list-container">
      {/* Search Bar matching Image 4 */}
      <div className="list-search-section">
        <div className="list-search-box">
          <Search size={18} className="list-search-icon" />
          <input
            type="text"
            className="list-search-input"
            placeholder="Search your ward"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="search-clear-btn" 
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Ward Rows matching Image 4 */}
      <div className="ward-scroll-list">
        {filteredWards.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Droplets size={40} color="#94a3b8" />
            <p style={{ marginTop: '12px', fontWeight: 600, color: '#475569' }}>No wards found for "{searchQuery}"</p>
            <button 
              style={{ marginTop: '12px', padding: '8px 18px', borderRadius: '20px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setSearchQuery('')}
            >
              View All Wards
            </button>
          </div>
        ) : (
          filteredWards.map((ward) => (
            <div 
              key={ward.wardId} 
              className="ward-item-row"
              onClick={() => handleRowClick(ward)}
            >
              <div className="ward-badge-col">
                <span className="ward-count-pill">{ward.totalReports}</span>
              </div>

              <div className="ward-content-col">
                <div className="ward-title-line">
                  <span className="ward-name-bold">{ward.wardName}</span>
                  <span className="ward-zone-gray">{ward.zoneTag}</span>
                </div>
                <div className="ward-subtitle-line">
                  {ward.unresolvedReports} unresolved · {ward.mlaName}
                </div>
              </div>

              <div className="ward-chevron-col">
                <ChevronRight size={18} color="#94a3b8" />
              </div>
            </div>
          ))
        )}

        {hasNextPage && (
          <div style={{ padding: '16px 24px', textAlign: 'center' }}>
            <button 
              className="load-more-btn" 
              onClick={onLoadMore}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load More Reports'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default IncidentList;
