import React, { useState } from 'react';
import { 
  Flame, 
  MapPin, 
  CloudRain, 
  Lightbulb, 
  X, 
  Droplets, 
  Navigation, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2,
  Thermometer,
  Wind
} from 'lucide-react';
import { hotspotAPI } from '../services/api';
import bangaloreWards from '../data/bangalore-wards.json';
import { getWardDetailsForIncident } from '../utils/wardData';
import './HotspotPanel.css';

function HotspotPanel({ hotspots = [], loading = false, onLocate }) {
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);

  const fetchWeather = async (hotspot) => {
    try {
      setLoadingData(true);
      setActiveModal('weather');
      const [lon, lat] = hotspot.location.coordinates;
      const res = await hotspotAPI.getWeather(hotspot.id, lat, lon);
      setModalData({ title: 'Live Weather Intelligence', data: res.data.data, type: 'weather', hotspot });
    } catch (err) {
      console.error(err);
      alert('Could not fetch real-time weather data. Please try again.');
      setActiveModal(null);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchIntervention = async (hotspot) => {
    try {
      setLoadingData(true);
      setActiveModal('intervention');
      
      const payload = {
        rainfall: 25, // 25mm cloudburst scenario
        catchmentArea: 500, // 500 sqm typical intersection catchment
        issueType: hotspot.issueType
      };

      const res = await hotspotAPI.getRecommendation(hotspot.id, payload);
      setModalData({ title: 'Hydrological Mitigation Plan', data: res.data.data, type: 'intervention', hotspot });
    } catch (err) {
      console.error(err);
      alert('Could not calculate mitigation recommendation.');
      setActiveModal(null);
    } finally {
      setLoadingData(false);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalData(null);
  };

  if (loading) {
    return (
      <div className="hotspot-panel">
        <div className="hotspot-loading-box">
          <div className="hotspot-spinner"></div>
          <p>Analyzing waterlogging clusters & priority hotspots...</p>
        </div>
      </div>
    );
  }

  if (!hotspots || hotspots.length === 0) {
    return (
      <div className="hotspot-panel">
        <div className="hotspot-empty-box">
          <Flame size={48} color="#94a3b8" />
          <h3>No Active Priority Hotspots</h3>
          <p>Hotspots appear when multiple citizen reports cluster within a 500m radius.</p>
        </div>
      </div>
    );
  }

  // Calculate summary stats across all detected hotspots
  const totalReportsInHotspots = hotspots.reduce((acc, h) => acc + (h.incidentCount || 0), 0);
  const criticalHotspotsCount = hotspots.filter(h => (h.priorityScore || 0) >= 0.7).length;
  const totalEstimatedRunoff = hotspots.reduce((acc, h) => {
    const coeff = h.issueType === 'waterlogging' ? 0.85 : 0.80;
    return acc + Math.round(25 * 500 * coeff);
  }, 0);

  return (
    <div className="hotspot-panel fade-in">
      {/* Overview Top Header Banner */}
      <div className="hotspot-overview-header">
        <div className="overview-title-row">
          <div className="overview-icon-circle">
            <Flame size={22} color="#dc2626" />
          </div>
          <div>
            <h2 className="overview-title">Priority Water Hotspots</h2>
            <p className="overview-subtitle">
              Real-time clustering & stormwater intelligence across Bengaluru
            </p>
          </div>
        </div>

        {/* 3 Key Citywide Parameters */}
        <div className="citywide-metric-strip">
          <div className="metric-strip-card">
            <span className="strip-val">{hotspots.length}</span>
            <span className="strip-lbl">Active Hotspots</span>
          </div>
          <div className="metric-strip-card">
            <span className="strip-val critical-val">{criticalHotspotsCount}</span>
            <span className="strip-lbl">Critical Risk</span>
          </div>
          <div className="metric-strip-card">
            <span className="strip-val runoff-val">~{(totalEstimatedRunoff / 1000).toFixed(1)}k L</span>
            <span className="strip-lbl">Total Runoff</span>
          </div>
        </div>
      </div>

      {/* Hotspots Card Stream */}
      <div className="hotspot-items-list">
        {hotspots.map((hotspot, idx) => {
          const score = hotspot.priorityScore || 0;
          const scorePercent = Math.round(score * 100);
          const isCritical = score >= 0.7;
          const isElevated = score >= 0.4 && score < 0.7;
          
          // Hydrological Runoff Estimation: Runoff = Rainfall (25mm) * Area (500m²) * Coeff
          const runoffCoeff = hotspot.issueType === 'waterlogging' ? 0.85 : 0.80;
          const estimatedRunoffL = Math.round(25 * 500 * runoffCoeff);

          // Resolve Bengaluru Ward from Coordinates
          const wardInfo = getWardDetailsForIncident(
            { location: hotspot.location },
            bangaloreWards
          );

          const highCount = hotspot.severityDistribution?.high || 0;
          const medCount = hotspot.severityDistribution?.medium || 0;
          const lowCount = hotspot.severityDistribution?.low || 0;

          return (
            <div key={hotspot.id || idx} className={`hotspot-intel-card ${isCritical ? 'critical-card' : ''}`}>
              {/* Card Top: Ward & Priority Badge */}
              <div className="intel-card-top">
                <div className="intel-card-location">
                  <div className="intel-ward-name">
                    <MapPin size={16} color="#0284c7" style={{ marginRight: 6, flexShrink: 0 }} />
                    <span>{wardInfo.wardName}</span>
                  </div>
                  <div className="intel-zone-tag">
                    Ward #{wardInfo.wardId} · {wardInfo.zone} Zone ({wardInfo.assemblyName})
                  </div>
                </div>

                <div className="intel-priority-badge-box">
                  <span className={`priority-risk-pill ${isCritical ? 'risk-high' : isElevated ? 'risk-med' : 'risk-low'}`}>
                    {isCritical ? '🔴 CRITICAL RISK' : isElevated ? '🟠 WATCHLIST' : '🟢 ROUTINE'}
                  </span>
                  <span className="priority-score-num">
                    Score: <strong>{scorePercent}</strong>/100
                  </span>
                </div>
              </div>

              {/* 4 Clear Parameters Row */}
              <div className="intel-params-grid">
                <div className="intel-param-box">
                  <div className="param-label">Active Reports</div>
                  <div className="param-value text-red">{hotspot.incidentCount} Reports</div>
                  <div className="param-sub">
                    {highCount > 0 ? `${highCount} High` : ''}{highCount > 0 && medCount > 0 ? ', ' : ''}{medCount > 0 ? `${medCount} Med` : ''}
                    {highCount === 0 && medCount === 0 ? `${lowCount} Low` : ''}
                  </div>
                </div>

                <div className="intel-param-box">
                  <div className="param-label">Estimated Runoff</div>
                  <div className="param-value text-blue">~{estimatedRunoffL.toLocaleString()} L</div>
                  <div className="param-sub">At 25mm rain (500m²)</div>
                </div>

                <div className="intel-param-box">
                  <div className="param-label">Primary Issue</div>
                  <div className="param-value">
                    {(hotspot.issueType || 'waterlogging').replace('_', ' ').toUpperCase()}
                  </div>
                  <div className="param-sub">Cluster radius 500m</div>
                </div>

                <div className="intel-param-box">
                  <div className="param-label">Freshness</div>
                  <div className="param-value text-green">
                    {Math.round((hotspot.scoreBreakdown?.freshness || 0.8) * 100)}%
                  </div>
                  <div className="param-sub">Recently observed</div>
                </div>
              </div>

              {/* Actionable Civic Explanation */}
              <div className="intel-explanation-box">
                <div className="intel-exp-text">
                  <strong>Diagnostic:</strong> {hotspot.explanation || `Repeated water accumulation detected in ${wardInfo.wardName}. Immediate drain clearing and retention intervention advised.`}
                </div>
              </div>

              {/* 3 Interactive Buttons */}
              <div className="intel-actions-row">
                {onLocate && (
                  <button 
                    className="intel-btn locate-btn"
                    onClick={() => onLocate(hotspot.location.coordinates)}
                    title="View this hotspot on the interactive map"
                  >
                    <Navigation size={14} />
                    Locate on Map
                  </button>
                )}

                <button 
                  className="intel-btn weather-btn"
                  onClick={() => fetchWeather(hotspot)}
                  title="View live weather & rain metrics"
                >
                  <CloudRain size={14} />
                  Live Weather
                </button>

                <button 
                  className="intel-btn solution-btn"
                  onClick={() => fetchIntervention(hotspot)}
                  title="Calculate engineering mitigation plan"
                >
                  <Lightbulb size={14} />
                  Mitigation Plan
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pop-up Modals for Weather & Solutions */}
      {activeModal && (
        <div className="modal-overlay fade-in" onClick={closeModal}>
          <div className="modal-content glass-effect slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalData?.title || 'Hotspot Intelligence'}</h3>
              <button className="close-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              {loadingData ? (
                <div className="hotspot-loading-box">
                  <div className="hotspot-spinner"></div>
                  <p>Fetching real-time data...</p>
                </div>
              ) : modalData?.type === 'weather' ? (
                <div className="weather-details-card">
                  <div className="weather-status-header">
                    <CloudRain size={32} color="#0284c7" />
                    <div>
                      <h4>Current Conditions</h4>
                      <p>{modalData.data.current.description || 'Partly Cloudy'}</p>
                    </div>
                  </div>

                  <div className="weather-grid">
                    <div className="weather-stat-box">
                      <Thermometer size={18} color="#f97316" />
                      <span className="w-val">{modalData.data.current.temperature}°C</span>
                      <span className="w-lbl">Temperature</span>
                    </div>
                    <div className="weather-stat-box">
                      <Droplets size={18} color="#0284c7" />
                      <span className="w-val">{modalData.data.current.humidity}%</span>
                      <span className="w-lbl">Humidity</span>
                    </div>
                    <div className="weather-stat-box">
                      <CloudRain size={18} color="#2563eb" />
                      <span className="w-val">{modalData.data.current.rain} mm</span>
                      <span className="w-lbl">Current Rain</span>
                    </div>
                    <div className="weather-stat-box">
                      <Wind size={18} color="#64748b" />
                      <span className="w-val">{modalData.data.precipitation24h || 0} mm</span>
                      <span className="w-lbl">24h Rainfall</span>
                    </div>
                  </div>

                  <div className="weather-insight-note">
                    Real-time weather data provided by Open-Meteo API for coordinates [
                    {modalData.hotspot?.location?.coordinates?.[1].toFixed(4)}, {modalData.hotspot?.location?.coordinates?.[0].toFixed(4)}
                    ].
                  </div>
                </div>
              ) : modalData?.type === 'intervention' ? (
                <div className="intervention-details-card">
                  <div className="intervention-type-title">
                    <CheckCircle2 size={20} color="#16a34a" />
                    <h4>{modalData.data.recommendation?.interventionType || 'Stormwater Retention Pit'}</h4>
                  </div>
                  
                  <p className="intervention-desc">
                    {modalData.data.recommendation?.description}
                  </p>

                  <div className="intervention-savings-box">
                    <Droplets size={20} color="#0284c7" />
                    <div>
                      <div className="savings-title">Estimated Annual Rainwater Harvesting Potential</div>
                      <div className="savings-num">
                        {modalData.data.annualSavings?.annualCubicMeters?.toLocaleString()} m³ / year
                        <span className="savings-household">
                          (~{modalData.data.annualSavings?.equivalentHouseholds} households supported)
                        </span>
                      </div>
                    </div>
                  </div>

                  <h5 className="section-mini-heading">Implementation Requirements</h5>
                  <ul className="requirements-list">
                    {modalData.data.recommendation?.requirements?.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>

                  {modalData.data.recommendation?.limitations?.length > 0 && (
                    <>
                      <h5 className="section-mini-heading" style={{ color: '#b45309', marginTop: 14 }}>
                        Site Constraints & Considerations
                      </h5>
                      <ul className="limitations-list">
                        {modalData.data.recommendation?.limitations?.map((lim, i) => (
                          <li key={i}>{lim}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HotspotPanel;
