# 🚀 AquaWatch Quick Setup Guide

## Step-by-Step Installation

### 1. Install Dependencies

```bash
# Install concurrently for running both servers
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install --legacy-peer-deps
```

### 2. Setup MongoDB Atlas

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free M0 cluster
3. Create a database user with username and password
4. Get your connection string from "Connect" → "Connect your application"
5. Replace `<password>` with your actual password
6. Update `backend/.env` with your connection string

**Example connection string:**
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/aquawatch?retryWrites=true&w=majority
```

### 3. Configure Environment Files

**Backend** (`backend/.env`):
```env
MONGODB_URI=your_mongodb_atlas_connection_string
PORT=5000
NODE_ENV=development
WEATHER_API_BASE_URL=https://api.open-meteo.com/v1
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000
VITE_MAP_CENTER_LAT=12.9716
VITE_MAP_CENTER_LNG=77.5946
VITE_MAP_ZOOM=12
```

### 4. Start Development Servers

```bash
# From root directory, run both servers:
npm run dev

# Or run separately:
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

---

## 🎯 First Steps After Installation

### 1. Test the Application

1. **Open the frontend** in your browser
2. **Click on the map** to select a location
3. **Fill out the report form**:
   - Issue Type: Waterlogging
   - Severity: High
   - Description: "Test incident"
4. **Submit the report**
5. **Verify** the marker appears on the map

### 2. Create Multiple Test Incidents

Create 3-5 incidents close to each other (within 500m) to test hotspot detection:

```bash
# Use this curl command to create test data
curl -X POST http://localhost:5000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "issueType": "waterlogging",
    "description": "Heavy waterlogging on main road",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "severity": "high"
  }'
```

### 3. View Hotspots

1. Click the **"Hotspots"** tab in the sidebar
2. View the clustered incidents
3. Check the priority scoring breakdown
4. Click on hotspot markers to see details

### 4. Test Weather Integration

1. Select a hotspot
2. The system automatically fetches weather data
3. View current conditions and precipitation forecast

---

## 📊 API Testing with curl

### Create Incident
```bash
curl -X POST http://localhost:5000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "issueType": "blocked_drain",
    "description": "Storm drain completely blocked with debris",
    "latitude": 12.9750,
    "longitude": 77.5980,
    "severity": "medium"
  }'
```

### Get All Incidents
```bash
curl http://localhost:5000/api/incidents
```

### Get Statistics
```bash
curl http://localhost:5000/api/incidents/analytics/stats
```

### Detect Hotspots
```bash
curl http://localhost:5000/api/hotspots
```

### Get Weather Data
```bash
curl "http://localhost:5000/api/hotspots/hotspot_1/weather?latitude=12.9716&longitude=77.5946"
```

### Calculate Runoff
```bash
curl -X POST http://localhost:5000/api/hotspots/hotspot_1/recommendation \
  -H "Content-Type: application/json" \
  -d '{
    "rainfall": 50,
    "catchmentArea": 1000,
    "surfaceType": "concrete"
  }'
```

---

## 🐛 Common Issues & Solutions

### Issue: Frontend shows "Cannot connect to API"

**Solution:**
1. Check if backend is running on port 5000
2. Verify VITE_API_URL in frontend/.env
3. Check CORS settings in backend/server.js

### Issue: MongoDB connection error

**Solution:**
1. Verify MongoDB Atlas cluster is running
2. Check IP whitelist (add 0.0.0.0/0 for testing)
3. Confirm username and password in connection string
4. Test connection with MongoDB Compass

### Issue: Map tiles not loading

**Solution:**
1. Check internet connection
2. Clear browser cache
3. Check browser console for errors
4. Verify Leaflet CSS is imported in index.css

### Issue: Weather API returns 404

**Solution:**
1. Verify coordinates are valid numbers
2. Check latitude is between -90 and 90
3. Check longitude is between -180 and 180
4. Ensure backend can access open-meteo.com

---

## 📁 Project Structure Overview

```
aquawatch/
├── backend/               # Express API server
│   ├── config/           # Database configuration
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API endpoints
│   ├── services/         # Business logic
│   └── server.js         # Entry point
│
├── frontend/             # React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API client
│   │   ├── App.jsx      # Main app
│   │   └── index.css    # Global styles
│   └── vite.config.js   # Vite configuration
│
└── README.md            # Full documentation
```

---

## 🌐 Deployment to AWS

### Deploy Frontend to Amplify

1. **Push to GitHub**
2. **Go to AWS Amplify Console**
3. **Connect repository** and select the `frontend` folder
4. **Add environment variables**:
   - `VITE_API_URL` = Your App Runner URL
5. **Deploy** - Amplify auto-detects Vite

### Deploy Backend to App Runner

1. **Push backend to GitHub**
2. **Go to AWS App Runner Console**
3. **Create service** from source code
4. **Add environment variables**:
   - `MONGODB_URI`
   - `NODE_ENV=production`
   - `FRONTEND_URL` = Your Amplify URL
5. **Deploy**

---

## 🎨 Customization

### Change Map Location

Edit `frontend/.env`:
```env
VITE_MAP_CENTER_LAT=YOUR_LATITUDE
VITE_MAP_CENTER_LNG=YOUR_LONGITUDE
VITE_MAP_ZOOM=12
```

### Change Color Theme

Edit `frontend/src/index.css`:
```css
:root {
  --primary: #0891b2;      /* Change primary color */
  --primary-dark: #0e7490;
  --danger: #ef4444;
  --warning: #f59e0b;
  --success: #10b981;
}
```

### Add New Issue Types

1. Update `backend/models/Incident.js` enum
2. Update frontend form options in `ReportForm.jsx`

---

## 📈 Performance Tips

- **MongoDB**: Use indexes for geospatial queries (already configured)
- **Weather API**: Cache is set to 10 minutes (configurable in weatherService.js)
- **Frontend**: Use production build for deployment (`npm run build`)
- **Images**: Leaflet markers use CDN URLs

---

## 🔐 Security Checklist

- [ ] Change default MongoDB password
- [ ] Enable MongoDB IP whitelist
- [ ] Use HTTPS in production
- [ ] Set strong CORS policies
- [ ] Never commit .env files
- [ ] Use environment variables for secrets
- [ ] Implement rate limiting (production)
- [ ] Add input validation on all forms

---

## 📞 Need Help?

- Check the main [README.md](./README.md) for detailed documentation
- Review API endpoints in the documentation
- Check browser console for errors
- Review backend logs for API issues

---

**Built with 💧 for WeMakeDevs Environmental Hacks 2026**

Good luck with your hackathon! 🚀
