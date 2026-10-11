import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, GeoJSON } from 'react-leaflet';
import bangaloreWards from './data/bangalore-wards.json';
import { getWardDetailsForIncident } from './utils/wardData';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import './App.css';
import { incidentAPI, hotspotAPI } from './services/api';
import Header from './components/Header';
import ReportForm from './components/ReportForm';
import IncidentList from './components/IncidentList';
import IncidentModal from './components/IncidentModal';
import HotspotPanel from './components/HotspotPanel';
import StatsPanel from './components/StatsPanel';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import MyReportsModal from './components/MyReportsModal';
import ErrorBoundary from './components/ErrorBoundary';
import { Flame, BarChart3, PlusCircle } from 'lucide-react';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color, pulse = false) => {
  const pulseHtml = pulse ? `<div class="marker-pulse-ring" style="background-color: ${color};"></div>` : '';
  return L.divIcon({
    className: 'custom-marker',
    html: `${pulseHtml}<div class="custom-marker-wrapper" style="background-color: ${color};"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const createClusterCustomIcon = function (cluster) {
  return L.divIcon({
    html: `<div style="background-color: #0284c7; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"><span>${cluster.getChildCount()}</span></div>`,
    className: 'custom-marker-cluster',
    iconSize: L.point(40, 40, true),
  });
};

const severityColors = {
  low: '#7dd3fc',    // Light Blue
  medium: '#0ea5e9', // Medium Blue
  high: '#0369a1'    // Dark Blue
};

// Status colors for map markers
const statusColors = {
  reported: '#0ea5e9',      // Blue - newly reported
  under_review: '#ea580c',  // Vivid Orange - under review
  in_progress: '#eab308',   // Yellow - work in progress
  resolved: '#22c55e'       // Green - completed/resolved
};

// Function to get marker color based on status and severity
const getMarkerColor = (incident) => {
  if (incident.status === 'resolved') {
    return statusColors.resolved;
  }
  if (incident.status === 'in_progress') {
    return statusColors.in_progress;
  }
  if (incident.status === 'under_review') {
    return statusColors.under_review;
  }
  return severityColors[incident.severity] || statusColors.reported;
};

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.length === 2) {
      map.flyTo(center, zoom || 15, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Multi-tier Locate Control: browser GPS on secure context + network IP fallback on HTTP
function LocateControl({ setUserLocation, setSelectedLocation }) {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  
  const locateUser = async () => {
    setLocating(true);
    let found = false;

    // 1. Try browser GPS
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 30000
          });
        });

        if (pos && pos.coords) {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const latlng = { lat, lng };
          setUserLocation(latlng);
          if (setSelectedLocation) setSelectedLocation(latlng);
          map.flyTo([lat, lng], 16, { duration: 1.5 });
          found = true;
        }
      } catch (err) {
        // Fall through to IP fallback
      }
    }

    // 2. Network IP Geolocation Fallback (Works on non-secure HTTP origins without browser blocks)
    if (!found) {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          const lat = data.latitude;
          const lng = data.longitude;
          const latlng = { lat, lng };
          setUserLocation(latlng);
          if (setSelectedLocation) setSelectedLocation(latlng);
          map.flyTo([lat, lng], 15, { duration: 1.5 });
          found = true;
        }
      } catch (err) {
        // Fall through to default Bengaluru center
      }
    }

    // 3. Fallback to Bengaluru Central Point
    if (!found) {
      const defaultPt = { lat: 12.9716, lng: 77.5946 };
      setUserLocation(defaultPt);
      if (setSelectedLocation) setSelectedLocation(defaultPt);
      map.flyTo([12.9716, 77.5946], 15, { duration: 1.2 });
    }

    setLocating(false);
  };

  return (
    <button 
      className="locate-me-btn" 
      onClick={locateUser}
      title="Find my location & report here"
      disabled={locating}
      style={{
        position: 'absolute', 
        right: '20px', 
        bottom: '100px', 
        zIndex: 1000,
        background: 'white',
        border: 'none',
        borderRadius: '50%',
        width: '48px',
        height: '48px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
        cursor: locating ? 'wait' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#0284c7'
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: locating ? 'spin 1s linear infinite' : 'none' }}>
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
        <circle cx="12" cy="12" r="7" strokeDasharray="4 2"/>
      </svg>
    </button>
  );
}

function App() {
  const [incidents, setIncidents] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [loadingHotspots, setLoadingHotspots] = useState(false);
  const [mainView, setMainView] = useState('map'); // 'map', 'list', 'hotspots', 'stats', 'admin'
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('All Severity');
  const [statusFilter, setStatusFilter] = useState('All Status');
  
  // My Reports Tracking
  const [myReportIds, setMyReportIds] = useState(() => {
    try {
      const saved = localStorage.getItem('my_reported_incident_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showMyReportsModal, setShowMyReportsModal] = useState(false);
  
  // Admin Portal States
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [, setIsAdminAuthenticated] = useState(!!localStorage.getItem('admin_api_key'));

  // Incident Modal
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [hoveredWard, setHoveredWard] = useState(null);

  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]);
  const [mapZoom, setMapZoom] = useState(12);

  const bangaloreBounds = [
    [12.83, 77.46],
    [13.14, 77.74]
  ];

  const fetchIncidents = async (pageNum = 1, reset = false) => {
    try {
      setLoading(true);
      const response = await incidentAPI.getAll({ limit: 50, page: pageNum });
      if (reset) {
        setIncidents(response.data.data || []);
      } else {
        setIncidents(prev => [...prev, ...(response.data.data || [])]);
      }
      setHasNextPage(response.data.pagination?.hasNextPage || false);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await incidentAPI.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchHotspots = async () => {
    try {
      setLoadingHotspots(true);
      const res = await hotspotAPI.getAll({ minIncidents: 1 });
      setHotspots(res.data.data || []);
    } catch (err) {
      console.error('Error fetching hotspots:', err);
    } finally {
      setLoadingHotspots(false);
    }
  };

  useEffect(() => {
    fetchIncidents(1, true);
    fetchStats();
    fetchHotspots();
  }, []);

  // Admin Portal Detection: URL route (?admin=true, #admin, or /admin)
  useEffect(() => {
    const checkAdminUrl = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const isAdminRoute = 
        searchParams.get('admin') === 'true' || 
        window.location.hash.toLowerCase() === '#admin' ||
        window.location.pathname.toLowerCase() === '/admin';

      if (isAdminRoute) {
        if (localStorage.getItem('admin_api_key')) {
          setIsAdminAuthenticated(true);
          setMainView('admin');
        } else {
          setShowAdminLogin(true);
        }
      }
    };

    checkAdminUrl();
    window.addEventListener('popstate', checkAdminUrl);
    window.addEventListener('hashchange', checkAdminUrl);
    return () => {
      window.removeEventListener('popstate', checkAdminUrl);
      window.removeEventListener('hashchange', checkAdminUrl);
    };
  }, []);

  // Admin Portal Shortcut Hotkeys: Ctrl+Shift+A, Cmd+Shift+A, or Alt+A
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCtrlShiftA = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key?.toLowerCase() === 'a';
      const isAltA = e.altKey && e.key?.toLowerCase() === 'a';

      if (isCtrlShiftA || isAltA) {
        e.preventDefault();
        if (localStorage.getItem('admin_api_key')) {
          setIsAdminAuthenticated(true);
          setMainView('admin');
          window.history.replaceState({}, '', '/?admin=true');
        } else {
          setShowAdminLogin(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLoadMore = () => {
    if (!loading && hasNextPage) {
      fetchIncidents(page + 1);
    }
  };

  const handleLocationSelect = (latlng) => {
    if (latlng.lat < bangaloreBounds[0][0] || latlng.lat > bangaloreBounds[1][0] ||
        latlng.lng < bangaloreBounds[0][1] || latlng.lng > bangaloreBounds[1][1]) {
      alert("Please report incidents only within Bangalore city limits.");
      return;
    }
    setSelectedLocation(latlng);
    setShowReportForm(true);
  };

  const handleReportSubmit = async (reportData) => {
    try {
      const response = await incidentAPI.create(reportData);
      const created = response.data?.data;
      if (created && created._id) {
        setMyReportIds(prev => {
          const updated = [created._id, ...prev.filter(id => id !== created._id)];
          localStorage.setItem('my_reported_incident_ids', JSON.stringify(updated));
          return updated;
        });
      }
      setShowReportForm(false);
      setSelectedLocation(null);
      fetchIncidents(1, true);
      fetchStats();
      alert('✓ Incident reported successfully! You can track this report in "My Reports".');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please check input and try again.');
    }
  };

  const handleIncidentUpdate = async (id, updateData) => {
    try {
      const response = await incidentAPI.update(id, updateData);
      fetchIncidents(1, true);
      fetchStats();

      const updatedData = response.data?.data;
      if (selectedIncident && selectedIncident._id === id) {
        setSelectedIncident(prev => ({
          ...prev,
          ...(updatedData || (updateData instanceof FormData ? {} : updateData))
        }));
      }

      const statusVal = updatedData?.status || 
        (updateData instanceof FormData ? updateData.get('status') : updateData?.status);
      const statusText = statusVal ? statusVal.replace('_', ' ').toUpperCase() : 'UPDATED';
      alert(`✓ Incident marked as ${statusText} successfully!`);
      return response;
    } catch (error) {
      console.error('Error updating incident:', error);
      if (error.response?.data?.message) {
        alert(`⚠️ ${error.response.data.message}`);
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        alert('⚠️ Administrative authorization required. Please log in via Admin Portal.');
        setShowAdminLogin(true);
      } else {
        alert('⚠️ Failed to update incident. Please try again.');
      }
      fetchIncidents(1, true);
      throw error;
    }
  };

  const myIncidents = useMemo(() => {
    return incidents.filter(i => i && myReportIds.includes(i._id));
  }, [incidents, myReportIds]);

  const filteredIncidents = incidents.filter(incident => {
    if (!incident) return false;
    const matchSeverity = severityFilter === 'All Severity' || incident.severity?.toLowerCase() === severityFilter;
    const matchStatus = statusFilter === 'All Status' 
      ? true 
      : statusFilter === 'my_reports'
      ? myReportIds.includes(incident._id)
      : (incident.status || 'reported') === statusFilter;
    return matchSeverity && matchStatus;
  });

  // Guard coordinates to prevent Leaflet map crashes
  const validMapIncidents = filteredIncidents.filter(i => 
    i && i.location && Array.isArray(i.location.coordinates) && 
    typeof i.location.coordinates[0] === 'number' && 
    typeof i.location.coordinates[1] === 'number'
  );

  return (
    <div className="app">
      <Header 
        mainView={mainView}
        setMainView={setMainView}
        stats={stats}
        severityFilter={severityFilter}
        setSeverityFilter={setSeverityFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onOpenMyReports={() => setShowMyReportsModal(true)}
        myReportsCount={myReportIds.length}
      />

      <div className="main-content">
        {mainView === 'admin' ? (
          <AdminDashboard
            incidents={incidents}
            onRefresh={() => {
              fetchIncidents(1, true);
              fetchStats();
              fetchHotspots();
            }}
            onBackToMap={() => {
              setMainView('map');
              window.history.replaceState({}, '', '/');
            }}
            onLogout={() => {
              localStorage.removeItem('admin_api_key');
              setIsAdminAuthenticated(false);
              setMainView('map');
              window.history.replaceState({}, '', '/');
            }}
          />
        ) : mainView === 'map' ? (
          <div className="map-container fade-in">
            <MapContainer
              attributionControl={false}
              center={mapCenter}
              zoom={mapZoom}
              minZoom={10}
              maxBounds={[[12.7, 77.3], [13.2, 77.8]]}
              maxBoundsViscosity={1.0}
              style={{ height: '100%', width: '100%', zIndex: 1 }}
              zoomControl={false}
            >
              {/* Reliable OpenStreetMap Humanitarian basemap without watermark or label */}
              <TileLayer
                url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
                maxZoom={19}
                className="faded-basemap"
              />

              <GeoJSON 
                data={bangaloreWards}
                style={{ color: '#0ea5e9', weight: 1, fillColor: '#0ea5e9', fillOpacity: 0.05 }}
                onEachFeature={(feature, layer) => {
                  layer.on({
                    mouseover: (e) => {
                      const l = e.target;
                      l.setStyle({
                        color: '#0284c7',
                        weight: 2.5,
                        fillColor: '#0ea5e9',
                        fillOpacity: 0.28
                      });
                      l.bringToFront();
                      setHoveredWard(feature.properties);
                    },
                    mouseout: (e) => {
                      const l = e.target;
                      l.setStyle({
                        color: '#0ea5e9',
                        weight: 1,
                        fillColor: '#0ea5e9',
                        fillOpacity: 0.05
                      });
                      setHoveredWard(null);
                    }
                  });
                }}
              />

              {userLocation && (
                <Marker 
                  position={userLocation}
                  icon={createCustomIcon('#0284c7', true)}
                />
              )}

              <LocateControl setUserLocation={setUserLocation} setSelectedLocation={setSelectedLocation} />
              <MapClickHandler onLocationSelect={handleLocationSelect} />

              <MarkerClusterGroup key={validMapIncidents.length} iconCreateFunction={createClusterCustomIcon}>
                {validMapIncidents.map((incident) => (
                  <Marker
                    key={incident._id}
                    position={[incident.location.coordinates[1], incident.location.coordinates[0]]}
                    icon={createCustomIcon(getMarkerColor(incident), incident.severity === 'high' && incident.status !== 'resolved')}
                    eventHandlers={{
                      click: () => {
                        setSelectedIncident(incident);
                      },
                    }}
                  />
                ))}
              </MarkerClusterGroup>

              {selectedLocation && (
                <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={createCustomIcon('#0ea5e9')} />
              )}

              <ChangeMapView center={mapCenter} zoom={mapZoom} />
            </MapContainer>

            {/* Map Status Legend Highlighting Under Review in Orange */}
            <div className="map-status-legend">
              <div className="legend-chip"><span className="legend-dot" style={{ backgroundColor: '#0ea5e9' }}></span>Reported</div>
              <div className="legend-chip highlight-orange"><span className="legend-dot" style={{ backgroundColor: '#ea580c' }}></span>Under Review</div>
              <div className="legend-chip"><span className="legend-dot" style={{ backgroundColor: '#eab308' }}></span>In Progress</div>
              <div className="legend-chip"><span className="legend-dot" style={{ backgroundColor: '#22c55e' }}></span>Resolved</div>
            </div>

            {hoveredWard && (
              <div style={{
                position: 'absolute',
                bottom: '92px',
                left: '24px',
                zIndex: 1000,
                background: '#ffffff',
                padding: '14px 18px',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.06)',
                border: '1px solid #e2e8f0',
                pointerEvents: 'none',
                minWidth: '190px'
              }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', marginBottom: '2px' }}>
                  {hoveredWard.name_en || hoveredWard.proposed_ward_name_en || 'Ward'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>
                  {hoveredWard.id ? `Ward #${hoveredWard.id}` : ''}
                  {hoveredWard.assembly_constituency_name_en ? ` · ${hoveredWard.assembly_constituency_name_en}` : ''}
                </div>
                {hoveredWard.parliamentary_constituency_name_en && (
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                    {hoveredWard.parliamentary_constituency_name_en.trim()}
                  </div>
                )}
                {(() => {
                  const wardId = hoveredWard.id ? hoveredWard.id.toString() : '';
                  const wardName = (hoveredWard.name_en || hoveredWard.proposed_ward_name_en || '').toLowerCase().trim();
                  const wardCount = incidents.filter(i => {
                    if (i.wardId && i.wardId.toString() === wardId) return true;
                    if (i.ward && i.ward.toLowerCase().trim() === wardName) return true;
                    const resolved = getWardDetailsForIncident(i, bangaloreWards);
                    return resolved.wardId.toString() === wardId;
                  }).length;
                  return (
                    <div style={{ fontSize: '13px', fontWeight: 700, color: wardCount > 0 ? '#0284c7' : '#64748b' }}>
                      {wardCount} {wardCount === 1 ? 'incident report' : 'reports'}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ) : mainView === 'hotspots' ? (
          <div className="list-view-wrapper fade-in">
            <HotspotPanel 
              hotspots={hotspots} 
              loading={loadingHotspots} 
              onLocate={(coords) => {
                setMainView('map');
                if (coords && coords.length === 2) {
                  setMapCenter([coords[1], coords[0]]);
                  setMapZoom(16);
                  setSelectedLocation({ lat: coords[1], lng: coords[0] });
                }
              }}
            />
          </div>
        ) : mainView === 'stats' ? (
          <div className="list-view-wrapper fade-in">
            <StatsPanel stats={stats} incidents={incidents} />
          </div>
        ) : (
          <div className="list-view-wrapper fade-in">
            <IncidentList
              incidents={filteredIncidents}
              onUpdate={handleIncidentUpdate}
              loading={loading}
              onLoadMore={handleLoadMore}
              hasNextPage={hasNextPage}
              onSelect={setSelectedIncident}
            />
          </div>
        )}
      </div>

      {!showReportForm && mainView !== 'admin' && (
        <div className="app-bottom-bar">
          <div className="bottom-dock-left">
            <button 
              className={`dock-btn ${mainView === 'hotspots' ? 'active' : ''}`}
              onClick={() => setMainView(prev => prev === 'hotspots' ? 'map' : 'hotspots')}
              title="Priority Hotspots & Runoff Intelligence"
            >
              <Flame size={20} />
            </button>
            <button 
              className={`dock-btn ${mainView === 'stats' ? 'active' : ''}`}
              onClick={() => setMainView(prev => prev === 'stats' ? 'map' : 'stats')}
              title="Citywide Water Analytics"
            >
              <BarChart3 size={20} />
            </button>
          </div>

          <button
            className="scan-report-btn"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={() => {
              if (selectedLocation) {
                setShowReportForm(true);
              } else if (userLocation) {
                handleLocationSelect(userLocation);
              } else {
                handleLocationSelect({ lat: 12.9716, lng: 77.5946 });
              }
            }}
          >
            <PlusCircle size={18} />
            Report Waterlogging
          </button>
        </div>
      )}

      {showReportForm && (
        <ReportForm
          selectedLocation={selectedLocation}
          onSubmit={handleReportSubmit}
          onCancel={() => {
            setShowReportForm(false);
            setSelectedLocation(null);
          }}
        />
      )}

      {selectedIncident && (
        <ErrorBoundary>
          <IncidentModal 
            incident={selectedIncident} 
            onClose={() => setSelectedIncident(null)} 
            onUpdate={handleIncidentUpdate}
            onOpenReportForm={(wardInfo) => {
              setSelectedIncident(null);
              if (wardInfo && wardInfo.wardId) {
                const feat = bangaloreWards.features?.find(f => f.properties?.id?.toString() === wardInfo.wardId.toString());
                if (feat && feat.geometry && feat.geometry.coordinates) {
                  const ring = Array.isArray(feat.geometry.coordinates[0][0])
                    ? feat.geometry.coordinates[0][0]
                    : feat.geometry.coordinates[0];
                  if (Array.isArray(ring) && typeof ring[0] === 'number') {
                    setSelectedLocation({ lat: ring[1], lng: ring[0] });
                  }
                }
              }
              setShowReportForm(true);
            }}
          />
        </ErrorBoundary>
      )}

      {/* Admin Login Modal */}
      <AdminLogin
        isOpen={showAdminLogin}
        onClose={() => {
          setShowAdminLogin(false);
          if (mainView !== 'admin') {
            window.history.replaceState({}, '', '/');
          }
        }}
        onLoginSuccess={() => {
          setIsAdminAuthenticated(true);
          setMainView('admin');
          window.history.replaceState({}, '', '/?admin=true');
        }}
      />

      {/* My Reports Modal */}
      <MyReportsModal
        isOpen={showMyReportsModal}
        onClose={() => setShowMyReportsModal(false)}
        myIncidents={myIncidents}
        onSelectIncident={(incident) => setSelectedIncident(incident)}
        onOpenReportForm={() => {
          if (userLocation) {
            handleLocationSelect(userLocation);
          } else {
            handleLocationSelect({ lat: 12.9716, lng: 77.5946 });
          }
        }}
      />
    </div>
  );
}

export default App;
