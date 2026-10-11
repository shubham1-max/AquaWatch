import { useState, useMemo } from 'react';
import { Camera, MapPin, X, UploadCloud, AlertCircle } from 'lucide-react';
import bangaloreWards from '../data/bangalore-wards.json';
import { getWardDetailsForIncident } from '../utils/wardData';
import './ReportForm.css';

function ReportForm({ selectedLocation, onSubmit, onCancel }) {
  const [currentLoc, setCurrentLoc] = useState(selectedLocation || { lat: 12.9716, lng: 77.5946 });
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [formData, setFormData] = useState({
    issueType: 'waterlogging',
    severity: 'medium',
    description: '',
    photo: null
  });
  const [preview, setPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamically resolve ward from selected coordinates
  const activeLocation = currentLoc || selectedLocation || { lat: 12.9716, lng: 77.5946 };
  const detectedWard = useMemo(() => {
    return getWardDetailsForIncident(
      { location: { coordinates: [activeLocation.lng, activeLocation.lat] } },
      bangaloreWards
    );
  }, [activeLocation]);

  const detectLocation = () => {
    setDetectingLoc(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setDetectingLoc(false);
        },
        async () => {
          try {
            const res = await fetch('https://ipapi.co/json/');
            const d = await res.json();
            if (d.latitude && d.longitude) {
              setCurrentLoc({ lat: d.latitude, lng: d.longitude });
            }
          } catch (e) {}
          setDetectingLoc(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setDetectingLoc(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, photo: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loc = currentLoc || selectedLocation || { lat: 12.9716, lng: 77.5946 };
    
    setIsSubmitting(true);
    try {
      const dataToSubmit = {
        ...formData,
        latitude: loc.lat,
        longitude: loc.lng,
        ward: detectedWard ? detectedWard.wardName : 'Bengaluru Ward',
        wardId: detectedWard?.wardId ? detectedWard.wardId.toString() : null
      };
      await onSubmit(dataToSubmit);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="report-modal-overlay fade-in" onClick={onCancel}>
      <div className="report-bottom-sheet slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle"></div>
        <div className="sheet-header">
          <h2>Report Water Issue</h2>
          <button className="close-btn" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="report-form">
          <div className="location-banner">
            <MapPin size={18} color="#0284c7" />
            <div className="location-banner-text" style={{ flex: 1 }}>
              <span className="location-ward-title">
                {detectedWard ? `${detectedWard.wardName} (${detectedWard.zone} #${detectedWard.wardId})` : 'Bengaluru Area'}
              </span>
              <span className="location-coords">
                {activeLocation 
                  ? `GPS: ${activeLocation.lat.toFixed(4)}, ${activeLocation.lng.toFixed(4)}` 
                  : 'Central Bengaluru'}
              </span>
            </div>
            <button 
              type="button" 
              onClick={detectLocation}
              disabled={detectingLoc}
              title="Detect my current GPS position"
              style={{
                padding: '6px 10px',
                fontSize: '11.5px',
                fontWeight: 700,
                background: '#ffffff',
                border: '1px solid #bae6fd',
                borderRadius: '6px',
                color: '#0284c7',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {detectingLoc ? 'Locating...' : '📍 My GPS'}
            </button>
          </div>

          <div className="form-group">
            <label>What's the issue?</label>
            <select
              value={formData.issueType}
              onChange={(e) => setFormData({...formData, issueType: e.target.value})}
              required
            >
              <option value="waterlogging">Waterlogging</option>
              <option value="blocked_drain">Blocked Stormwater Drain</option>
              <option value="overflow">Sewage Overflow</option>
              <option value="visible_leak">Visible Pipe Leak</option>
            </select>
          </div>

          <div className="form-group severity-group">
            <label>Severity</label>
            <div className="severity-options">
              {['low', 'medium', 'high'].map(sev => (
                <button
                  key={sev}
                  type="button"
                  className={`severity-btn ${sev} ${formData.severity === sev ? 'active' : ''}`}
                  onClick={() => setFormData({...formData, severity: sev})}
                >
                  {sev.charAt(0).toUpperCase() + sev.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Photo Evidence (Required)</label>
            <div className="photo-upload-area">
              {preview ? (
                <div className="photo-preview">
                  <img src={preview} alt="Evidence" />
                  <button type="button" className="remove-photo" onClick={() => {
                    setPreview(null);
                    setFormData({...formData, photo: null});
                  }}>
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="upload-placeholder">
                  <Camera size={32} color="var(--text-muted)" />
                  <span>Tap to take a photo</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoChange}
                    style={{display: 'none'}}
                    required
                  />
                </label>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="Provide specific details about the block or flooding..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
              minLength={10}
              maxLength={500}
              rows={3}
            />
            <small className="char-count">
              {formData.description.length < 10 ? 
                <span style={{color: 'var(--danger)'}}><AlertCircle size={10} style={{display:'inline', marginRight: 2}}/> Minimum 10 chars</span> : 
                <span>{formData.description.length}/500</span>
              }
            </small>
          </div>

          <button 
            type="submit" 
            className="submit-btn"
            disabled={isSubmitting || formData.description.length < 10 || !formData.photo}
          >
            {isSubmitting ? (
              <span className="loading-spinner"></span>
            ) : (
              <>
                <UploadCloud size={18} />
                Submit Report
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ReportForm;
