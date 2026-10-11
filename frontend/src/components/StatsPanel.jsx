import React, { useMemo } from 'react';
import { BarChart3, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import bangaloreWards from '../data/bangalore-wards.json';
import { getWardGroups } from '../utils/wardData';
import './StatsPanel.css';

function StatsPanel({ stats, incidents = [] }) {
  const getStatusCount = (status) => {
    const statusData = stats?.byStatus?.find(s => s._id === status);
    if (statusData) return statusData.count;
    // Fallback to counting from real database incidents array
    return incidents.filter(i => i.status === status).length;
  };

  const reportedCount = getStatusCount('reported');
  const resolvedCount = getStatusCount('resolved');
  const inProgressCount = getStatusCount('in_progress') + getStatusCount('under_review');
  const totalCount = stats?.total ?? (reportedCount + inProgressCount + resolvedCount);

  // Dynamically compute Ward Accountability leaderboard from real MongoDB data
  const wardLeaderboard = useMemo(() => {
    const groups = getWardGroups(incidents, bangaloreWards);

    // If backend provided pre-aggregated ward stats from database, synchronize counts
    if (stats?.leaderboard && Array.isArray(stats.leaderboard) && stats.leaderboard.length > 0) {
      const dbWardMap = new Map();
      for (const item of stats.leaderboard) {
        if (item.ward) dbWardMap.set(item.ward.toLowerCase().trim(), item);
        if (item.wardId) dbWardMap.set(item.wardId.toString(), item);
      }

      for (const group of groups) {
        const match = dbWardMap.get(group.wardName.toLowerCase().trim()) ||
                      dbWardMap.get(group.wardId.toString());
        if (match) {
          group.totalReports = Math.max(group.totalReports, match.totalReports || 0);
          group.unresolvedReports = Math.max(group.unresolvedReports, match.unresolvedReports || 0);
        }
      }

      // Re-sort with synchronized database counts
      groups.sort((a, b) => {
        if (b.unresolvedReports !== a.unresolvedReports) {
          return b.unresolvedReports - a.unresolvedReports;
        }
        if (b.totalReports !== a.totalReports) {
          return b.totalReports - a.totalReports;
        }
        return a.wardName.localeCompare(b.wardName);
      });
    }

    return groups.slice(0, 8);
  }, [incidents, stats]);

  if (!stats && incidents.length === 0) {
    return (
      <div className="stats-panel" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        Loading citywide analytics...
      </div>
    );
  }

  return (
    <div className="stats-panel fade-in">
      <div className="stats-grid">
        <div className="stat-card red">
          <div className="stat-content">
            <div className="stat-value">{reportedCount}</div>
            <div className="stat-label">Reported</div>
          </div>
          <AlertTriangle size={20} className="stat-icon" />
        </div>

        <div className="stat-card orange">
          <div className="stat-content">
            <div className="stat-value">{inProgressCount}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <Clock size={20} className="stat-icon" />
        </div>

        <div className="stat-card green">
          <div className="stat-content">
            <div className="stat-value">{resolvedCount}</div>
            <div className="stat-label">Resolved</div>
          </div>
          <CheckCircle size={20} className="stat-icon" />
        </div>

        <div className="stat-card blue">
          <div className="stat-content">
            <div className="stat-value">{totalCount}</div>
            <div className="stat-label">Total</div>
          </div>
          <BarChart3 size={20} className="stat-icon" />
        </div>
      </div>
      
      {/* Dynamic Ward Accountability Leaderboard purely from MongoDB */}
      <div className="accountability-board">
        <div style={{ marginBottom: '14px' }}>
          <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 800 }}>Ward Accountability Leaderboard</h4>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Ranked by active waterlogging and drainage reports across Bengaluru</span>
        </div>

        <div className="ward-list">
          {wardLeaderboard.map((ward, idx) => (
            <div key={ward.wardId} className="ward-item">
              <div className={`ward-rank rank-${idx + 1}`}>{idx + 1}</div>
              <div className="ward-info">
                <span className="ward-name">{ward.wardName} ({ward.zoneTag})</span>
                <span className="ward-mla">MLA: {ward.mlaName} ({ward.mlaParty})</span>
              </div>
              <span className={`ward-count ${ward.unresolvedReports > 10 ? 'high' : ward.unresolvedReports > 0 ? 'med' : 'low'}`}>
                {ward.unresolvedReports} {ward.unresolvedReports === 1 ? 'Issue' : 'Issues'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StatsPanel;
