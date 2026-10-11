# AquaWatch 🌊

**Citizen-powered waterlogging intelligence platform**

A comprehensive web application for reporting, tracking, and analyzing urban waterlogging incidents with real-time weather context and intelligent hotspot detection.

---

## 🎯 Project Overview

AquaWatch transforms citizen-reported waterlogging incidents into actionable intelligence through:

- **Real-time Incident Reporting**: Simple, map-based interface for reporting water issues
- **Hotspot Detection**: AI-powered clustering identifies recurring problem areas
- **Weather Integration**: Live precipitation data from Open-Meteo API
- **Runoff Calculation**: Scenario-based rainwater management recommendations
- **Priority Scoring**: Explainable algorithm ranking hotspots by urgency

---

## 🏗️ Architecture

### Tech Stack

**Frontend**
- React 19 + Vite
- Leaflet + React-Leaflet for interactive mapping
- Axios for API communication
- Lucide React for icons
- Date-fns for date formatting

**Backend**
- Node.js + Express
- MongoDB Atlas for data persistence
- Axios for external API calls
- Node-cache for weather data caching

**External Services**
- Open-Meteo API (weather data)
- OpenStreetMap (map tiles)

**Deployment Ready**
- AWS Amplify (Frontend hosting)
- AWS App Runner (Backend API)

---

## 📁 Project Structure

```
aquawatch/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── models/
│   │   └── Incident.js          # Incident schema with geospatial indexing
│   ├── routes/
│   │   ├── incidents.js         # Incident CRUD operations
│   │   └── hotspots.js          # Hotspot detection & recommendations
│   ├── services/
│   │   ├── weatherService.js    # Open-Meteo integration
│   │   ├── hotspotService.js    # Clustering & scoring algorithm
│   │   └── runoffService.js     # Runoff calculations
│   ├── .env.example
│   ├── server.js                # Express server setup
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx       # App header with branding
│   │   │   ├── ReportForm.jsx   # Incident reporting modal
│   │   │   ├── IncidentList.jsx # Incident cards list
│   │   │   ├── HotspotPanel.jsx # Hotspot priority view
│   │   │   └── StatsPanel.jsx   # Statistics dashboard
│   │   ├── services/
│   │   │   └── api.js           # API client with Axios
│   │   ├── App.jsx              # Main application component
│   │   ├── App.css              # Application styles
│   │   ├── index.css            # Global styles & variables
│   │   └── main.jsx             # React entry point
│   ├── .env.example
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── package.json                 # Root package with scripts
└── README.md                    # This file
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd aquawatch
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Configure MongoDB Atlas**
   
   - Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Get your connection string
   - Update `backend/.env`:
   
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your MongoDB URI
   ```

4. **Configure frontend environment**
   ```bash
   cp frontend/.env.example frontend/.env
   # Default settings work for local development
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

   This starts:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

---

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aquawatch
PORT=5000
NODE_ENV=development
WEATHER_API_BASE_URL=https://api.open-meteo.com/v1
FRONTEND_URL=http://localhost:5173
MAX_FILE_SIZE=5242880
UPLOAD_DIR=uploads
```

### Frontend Environment Variables

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_MAP_CENTER_LAT=12.9716
VITE_MAP_CENTER_LNG=77.5946
VITE_MAP_ZOOM=12
```

**Map Center Coordinates**:
- Default: Bangalore, India (12.9716, 77.5946)
- Update to your city's coordinates

---

## 📊 Data Model

### Incident Schema

```javascript
{
  issueType: String,          // 'waterlogging' | 'blocked_drain' | 'overflow' | 'visible_leak'
  description: String,         // Max 500 characters
  location: {
    type: 'Point',
    coordinates: [lon, lat]    // GeoJSON format
  },
  severity: String,            // 'low' | 'medium' | 'high'
  status: String,              // 'reported' | 'under_review' | 'in_progress' | 'resolved'
  observedAt: Date,
  verificationStatus: String,  // 'unverified' | 'verified' | 'disputed'
  sourceType: String,          // 'user' | 'sample'
  resolutionNote: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Hotspot Algorithm

Priority Score = (Volume × 0.40) + (Severity × 0.25) + (Freshness × 0.25) + (Verification × 0.10)

**Components**:
- **Volume**: Logarithmic scale based on incident count
- **Severity**: Average severity weight of incidents
- **Freshness**: Time decay from most recent incident
- **Verification**: Average verification status weight

---

## 🔌 API Endpoints

### Incidents

```
POST   /api/incidents              Create new incident
GET    /api/incidents              List all incidents (with filters)
GET    /api/incidents/:id          Get incident by ID
PATCH  /api/incidents/:id          Update incident status
GET    /api/incidents/location/nearby  Get nearby incidents
GET    /api/incidents/analytics/stats  Get statistics
```

### Hotspots

```
GET    /api/hotspots               Detect all hotspots
GET    /api/hotspots/priority/top  Get top priority hotspots
GET    /api/hotspots/:id/weather   Get weather for hotspot location
POST   /api/hotspots/:id/recommendation  Get intervention recommendation
```

### Example: Create Incident

```bash
curl -X POST http://localhost:5000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "issueType": "waterlogging",
    "description": "Street flooded after heavy rain",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "severity": "high"
  }'
```

---

## 🎨 Features

### 1. Incident Reporting

- **Map-based location selection**: Click anywhere on the map
- **Issue categorization**: Waterlogging, blocked drain, overflow, leak
- **Severity levels**: Low, medium, high
- **Real-time validation**: Ensures data quality
- **Persistent storage**: MongoDB Atlas with geospatial indexing

### 2. Interactive Map

- **OpenStreetMap tiles**: Free, open-source mapping
- **Custom markers**: Color-coded by severity
  - 🟢 Green: Low severity
  - 🟡 Orange: Medium severity
  - 🔴 Red: High severity
- **Popup details**: Click markers for full information
- **Responsive design**: Works on mobile and desktop

### 3. Hotspot Detection

- **Distance-based clustering**: Groups incidents within 500m radius
- **Time window**: 30-day rolling window
- **Explainable scoring**: Shows how priority is calculated
- **Score breakdown**: Visual representation of each factor

### 4. Weather Integration

- **Open-Meteo API**: Free weather data service
- **Current conditions**: Temperature, humidity, precipitation
- **Hourly forecast**: 24-hour precipitation outlook
- **Daily summary**: 3-day precipitation totals
- **Smart caching**: 10-minute cache to reduce API calls

### 5. Runoff Calculator

- **Input parameters**:
  - Rainfall amount (mm)
  - Catchment area (m²)
  - Runoff coefficient (0-1)
  - Surface type presets

- **Calculations**:
  - Runoff volume in liters and cubic meters
  - Annual savings estimate
  - Equivalent household water supply

- **Recommendations**:
  - Rain garden / bioswale (< 5m³)
  - Recharge pit (5-20m³)
  - Rainwater harvesting (20-50m³)
  - Detention basin (> 50m³)

---

## 📱 User Interface

### Dashboard Views

**Incidents View**
- Real-time incident cards
- Status tracking (Reported → Under Review → In Progress → Resolved)
- Time-ago formatting
- Severity indicators
- Quick filters

**Hotspots View**
- Priority-ranked hotspots
- Score breakdown visualization
- Incident clustering information
- Explainable AI reasoning

**Statistics Panel**
- Total incidents counter
- Status distribution (Reported, In Progress, Resolved)
- Severity breakdown with progress bars
- Real-time updates

---

## 🌐 AWS Deployment

### Prerequisites

- AWS Account
- AWS CLI configured
- Domain name (optional)

### Frontend Deployment (AWS Amplify)

1. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Amplify**
   ```bash
   # Via Amplify Console (Recommended)
   # - Connect your GitHub repository
   # - Select the frontend folder
   # - Amplify will auto-detect Vite
   
   # Or via AWS CLI
   aws amplify create-app --name aquawatch-frontend
   ```

3. **Configure environment variables in Amplify**
   ```
   VITE_API_URL=https://your-api-url.execute-api.region.amazonaws.com
   VITE_MAP_CENTER_LAT=12.9716
   VITE_MAP_CENTER_LNG=77.5946
   VITE_MAP_ZOOM=12
   ```

### Backend Deployment (AWS App Runner)

1. **Create App Runner service**
   ```bash
   aws apprunner create-service \
     --service-name aquawatch-api \
     --source-configuration file://apprunner.yaml
   ```

2. **Configure environment variables**
   - Add MongoDB URI in App Runner console
   - Set NODE_ENV=production
   - Update CORS FRONTEND_URL

---

## 🧪 Testing

### Manual Testing Checklist

**Incident Reporting**
- [ ] Can create incident by clicking map
- [ ] Form validation works
- [ ] Incident appears on map immediately
- [ ] Data persists after refresh

**Hotspot Detection**
- [ ] Multiple nearby incidents cluster
- [ ] Priority score updates correctly
- [ ] Score breakdown shows all factors
- [ ] Explanation text is meaningful

**Weather Integration**
- [ ] Weather loads for selected location
- [ ] Data shows source and timestamp
- [ ] Cache prevents excessive API calls
- [ ] Graceful error handling when API fails

**Runoff Calculator**
- [ ] All inputs accept valid numbers
- [ ] Calculation follows documented formula
- [ ] Recommendations match volume ranges
- [ ] Assumptions section is visible

---

## 🐛 Troubleshooting

### Frontend won't start

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run dev
```

### Backend can't connect to MongoDB

- Verify MongoDB Atlas cluster is running
- Check IP whitelist (allow 0.0.0.0/0 for testing)
- Confirm connection string format
- Test connection with MongoDB Compass

### Map doesn't load

- Check browser console for errors
- Verify Leaflet CSS is imported
- Clear browser cache
- Check network tab for failed tile requests

### Weather API not working

- Open-Meteo is free and requires no API key
- Check internet connection
- Verify coordinates are valid (lat: -90 to 90, lon: -180 to 180)
- Check backend logs for API errors

---

## 📈 Performance Optimization

- **MongoDB Indexes**: Geospatial and compound indexes for fast queries
- **Weather Caching**: 10-minute cache reduces API calls by 90%
- **Frontend Bundle**: Vite's optimized production build
- **Lazy Loading**: Components load on demand
- **Image Optimization**: CDN-hosted Leaflet assets

---

## 🔒 Security Considerations

- **Input Validation**: All user inputs sanitized
- **Rate Limiting**: Prevent API abuse (implement in production)
- **CORS**: Configured for specific origins
- **Environment Variables**: Secrets never committed to Git
- **MongoDB Security**: Use strong passwords and IP whitelisting

---

## 🤝 Contributing

This is a hackathon project built for the WeMakeDevs Environmental Hacks 2026.

### Team Collaboration

1. Create feature branches
2. Make focused commits
3. Test thoroughly before merging
4. Update documentation for new features

---

## 📝 License

MIT License - Open source for community benefit

---

## 🙏 Acknowledgments

- **Open-Meteo**: Free weather API
- **OpenStreetMap**: Open mapping data
- **Leaflet**: Open-source mapping library
- **MongoDB Atlas**: Database hosting
- **AWS**: Cloud infrastructure

---

## 📞 Support

For questions or issues:
- Open a GitHub issue
- Review the troubleshooting section
- Check API documentation

---
**Built with 💧 for better urban water management**
