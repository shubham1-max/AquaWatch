# ⚡ AquaWatch - Quick Start Guide

**Get up and running in 5 minutes!**

---

## 🚀 Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (free tier) - [Sign up here](https://www.mongodb.com/cloud/atlas/register)
- Git (optional)

---

## 📦 Installation

### Step 1: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install --legacy-peer-deps
```

### Step 2: Configure Environment

#### Backend Configuration

Create `backend/.env`:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/aquawatch?retryWrites=true&w=majority
FRONTEND_URL=http://localhost:5173
```

**Get your MongoDB URI:**
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a free cluster (M0)
3. Create a database user
4. Get connection string from "Connect" → "Connect your application"
5. Replace `<username>` and `<password>` with your credentials

#### Frontend Configuration

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_MAP_CENTER_LAT=12.9716
VITE_MAP_CENTER_LNG=77.5946
VITE_MAP_ZOOM=12
```

---

## 🎯 Run the Application

### Terminal 1 - Backend

```bash
cd backend
npm run dev
```

**Expected output:**
```
╔════════════════════════════════════════════╗
║         🌊 AquaWatch API Server            ║
╚════════════════════════════════════════════╝

  Environment: development
  Server URL:  http://localhost:5000
  Health:      http://localhost:5000/health
```

### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## ✅ Verify Installation

1. **Backend Health Check:**
   ```bash
   curl http://localhost:5000/health
   ```
   
   Should return:
   ```json
   {
     "success": true,
     "message": "AquaWatch API is running",
     "timestamp": "2026-10-10T08:21:42.351Z",
     "environment": "development"
   }
   ```

2. **Frontend:** Open browser to `http://localhost:5173`
   - Map should load
   - "Report Issue" button visible
   - No console errors

---

## 🎮 Test Features

### 1. Report an Incident
- Click anywhere on the map
- Fill in the form:
  - Issue Type: Waterlogging
  - Description: "Test incident"
  - Severity: High
- Click "Submit Report"
- New marker should appear on map

### 2. View Hotspots
- Click "Detect Hotspots" button
- Hotspot markers appear (if 2+ incidents nearby)
- Click hotspot to see details

### 3. Weather & Runoff
- Click on a hotspot
- View current weather
- Enter rainfall and area values
- Get recommendations

---

## 🐛 Troubleshooting

### Backend won't start

**Error: "MongooseError: Authentication failed"**

Solution:
1. Check username/password in MongoDB URI
2. Ensure IP address is whitelisted in MongoDB Atlas
3. Go to Atlas → Network Access → Add IP Address → Add Current IP Address

**Error: "Port 5000 already in use"**

Solution:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5000 | xargs kill -9

# Or change PORT in backend/.env
```

### Frontend won't start

**Error: "ERESOLVE could not resolve"**

Solution:
```bash
npm install --legacy-peer-deps
```

### Map doesn't load

Solution:
1. Check internet connection (map tiles from OpenStreetMap)
2. Clear browser cache
3. Check browser console for errors

---

## 📚 Next Steps

- **Full Documentation:** See [README.md](./README.md)
- **Deployment:** See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Security:** See [AUDIT_REPORT.md](./AUDIT_REPORT.md)
- **Project Details:** See [PROJECT_COMPLETION_SUMMARY.md](./PROJECT_COMPLETION_SUMMARY.md)

---

## 🆘 Need Help?

1. Check the troubleshooting section above
2. Review full documentation in README.md
3. Check backend logs in terminal
4. Check browser console for frontend errors
5. Verify MongoDB connection in Atlas dashboard

---

**Ready to Deploy?** See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for production deployment instructions.

---

*Last Updated: October 10, 2026*  
*Version: 1.0.0*
