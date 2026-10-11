# AWS Deployment Guide for AquaWatch

## Overview

This guide walks you through deploying AquaWatch on AWS using:
- **AWS Amplify** for frontend hosting
- **AWS App Runner** for backend API
- **MongoDB Atlas** for database (cloud-hosted)

---

## Prerequisites

- AWS Account with billing enabled
- AWS CLI installed and configured
- MongoDB Atlas account
- GitHub repository with your code
- Domain name (optional)

---

## Part 1: Deploy Backend to AWS App Runner

### Step 1: Prepare Backend

1. **Ensure your backend code is in a GitHub repository**

2. **Create Dockerfile** (optional, App Runner can auto-detect Node.js):

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

### Step 2: Create App Runner Service

**Option A: Using AWS Console**

1. Go to **AWS App Runner** console
2. Click **Create service**
3. **Source**: Repository
4. **Connect to GitHub** and authorize
5. Select your repository and branch
6. **Build settings**:
   - Runtime: Node.js 18
   - Build command: `npm install`
   - Start command: `node server.js`
   - Port: 5000
7. **Configure service**:
   - Service name: `aquawatch-api`
   - CPU: 1 vCPU
   - Memory: 2 GB
   - Auto scaling: 1-10 instances

8. **Add environment variables**:
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=your_mongodb_atlas_connection_string
   WEATHER_API_BASE_URL=https://api.open-meteo.com/v1
   FRONTEND_URL=https://your-amplify-domain.amplify.app
   ```

9. Click **Create & deploy**

**Option B: Using AWS CLI**

```bash
aws apprunner create-service \
  --service-name aquawatch-api \
  --source-configuration '{
    "CodeRepository": {
      "RepositoryUrl": "https://github.com/your-username/aquawatch",
      "SourceCodeVersion": {"Type": "BRANCH", "Value": "main"},
      "CodeConfiguration": {
        "ConfigurationSource": "API",
        "CodeConfigurationValues": {
          "Runtime": "NODEJS_18",
          "BuildCommand": "npm install",
          "StartCommand": "node server.js",
          "Port": "5000"
        }
      }
    }
  }' \
  --instance-configuration '{
    "Cpu": "1024",
    "Memory": "2048"
  }'
```

### Step 3: Get Your App Runner URL

After deployment completes, you'll get a URL like:
```
https://xxxxxxxxxx.us-east-1.awsapprunner.com
```

Save this URL - you'll need it for frontend configuration.

### Step 4: Test Backend Deployment

```bash
# Health check
curl https://your-apprunner-url.awsapprunner.com/health

# Get incidents
curl https://your-apprunner-url.awsapprunner.com/api/incidents
```

---

## Part 2: Deploy Frontend to AWS Amplify

### Step 1: Prepare Frontend

1. **Update `.env` for production** (don't commit this):
```env
VITE_API_URL=https://your-apprunner-url.awsapprunner.com
VITE_MAP_CENTER_LAT=12.9716
VITE_MAP_CENTER_LNG=77.5946
VITE_MAP_ZOOM=12
```

2. **Test production build locally**:
```bash
cd frontend
npm run build
npm run preview
```

### Step 2: Deploy with Amplify Console

1. Go to **AWS Amplify** console
2. Click **New app** → **Host web app**
3. **Connect to GitHub** and authorize
4. Select your repository
5. **App settings**:
   - App name: `aquawatch`
   - Branch: `main`
   - Monorepo: **Enable** and set root directory to `frontend`

6. **Build settings** - Amplify auto-detects Vite, but verify:
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --legacy-peer-deps
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

7. **Add environment variables**:
   - `VITE_API_URL` = Your App Runner URL
   - `VITE_MAP_CENTER_LAT` = 12.9716
   - `VITE_MAP_CENTER_LNG` = 77.5946
   - `VITE_MAP_ZOOM` = 12

8. Click **Save and deploy**

### Step 3: Get Your Amplify URL

After deployment, you'll get a URL like:
```
https://main.xxxxxxxxxx.amplifyapp.com
```

### Step 4: Update Backend CORS

Go back to App Runner and update `FRONTEND_URL` environment variable:
```
FRONTEND_URL=https://main.xxxxxxxxxx.amplifyapp.com
```

Redeploy the backend service.

---

## Part 3: Configure Custom Domain (Optional)

### For Frontend (Amplify)

1. In Amplify console, go to **Domain management**
2. Click **Add domain**
3. Enter your domain (e.g., `aquawatch.com`)
4. Follow DNS configuration instructions
5. Wait for SSL certificate provisioning

### For Backend (App Runner)

1. In App Runner, go to **Custom domains**
2. Click **Link domain**
3. Enter API subdomain (e.g., `api.aquawatch.com`)
4. Add DNS records as instructed
5. Wait for SSL certificate

---

## Part 4: MongoDB Atlas Configuration

### Allow AWS Access

1. Go to **MongoDB Atlas** → **Network Access**
2. Click **Add IP Address**
3. Add `0.0.0.0/0` (allow from anywhere) OR
4. Add specific AWS region IP ranges for better security

### Create Database User

1. Go to **Database Access**
2. Create user with read/write permissions
3. Use this in your `MONGODB_URI` connection string

---

## Part 5: Testing Production Deployment

### Test Frontend

1. Open your Amplify URL in browser
2. Check map loads correctly
3. Try reporting an incident
4. Verify data appears on map

### Test Backend API

```bash
# Replace with your URLs
BACKEND_URL="https://your-apprunner-url.awsapprunner.com"

# Health check
curl $BACKEND_URL/health

# Create incident
curl -X POST $BACKEND_URL/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "issueType": "waterlogging",
    "description": "Test from production",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "severity": "high"
  }'

# Get incidents
curl $BACKEND_URL/api/incidents

# Get hotspots
curl $BACKEND_URL/api/hotspots
```

---

## Cost Estimates (AWS Free Tier)

### AWS Amplify
- **Free Tier**: 1,000 build minutes/month, 15 GB data transfer
- **After free tier**: ~$0.01/build minute, ~$0.15/GB data transfer
- **Estimated cost**: $0-10/month for low traffic

### AWS App Runner
- **Free Tier**: None
- **Compute**: $0.007/vCPU-hour + $0.0008/GB-hour
- **Estimated cost**: ~$30-50/month for 1 vCPU, 2GB always-on

### MongoDB Atlas
- **Free Tier**: M0 cluster (512MB storage)
- **Estimated cost**: $0/month for M0, ~$9/month for M10

**Total Estimated Monthly Cost**: $30-60/month (or $0-10/month with App Runner free alternative)

---

## Alternative: Cost-Free Deployment Options

### Frontend Alternatives
- **Vercel**: Free tier with GitHub integration
- **Netlify**: Free tier with automatic deployments
- **GitHub Pages**: Free static hosting

### Backend Alternatives
- **Railway**: Free tier with 500 hours/month
- **Render**: Free tier with auto-sleep
- **Fly.io**: Free tier available

---

## Monitoring & Debugging

### AWS CloudWatch Logs

**App Runner Logs**:
1. Go to App Runner service
2. Click **Logs** tab
3. View application and system logs

**Amplify Logs**:
1. Go to Amplify app
2. Click on build
3. View build logs

### Common Issues

**Frontend can't connect to backend**:
- Check `VITE_API_URL` environment variable
- Verify CORS settings in backend
- Check backend is running in App Runner

**Backend crashes**:
- Check MongoDB connection string
- Verify environment variables
- Review CloudWatch logs

**Map not loading**:
- Check Leaflet CSS imports
- Verify OpenStreetMap tiles accessible
- Check browser console for errors

---

## Security Best Practices

1. **Use HTTPS only** (AWS provides free SSL certificates)
2. **Enable WAF** (Web Application Firewall) for production
3. **Set up CloudWatch alarms** for monitoring
4. **Use AWS Secrets Manager** for sensitive data
5. **Enable CloudTrail** for audit logging
6. **Implement rate limiting** in your API
7. **Use MongoDB IP whitelist** (specific AWS regions)
8. **Enable MFA** on AWS account

---

## CI/CD Pipeline

Both Amplify and App Runner support automatic deployments:

1. **Push to GitHub**
2. **AWS detects changes**
3. **Automatic build and deploy**
4. **Zero downtime deployment**

To disable auto-deploy:
- Amplify: Go to App settings → Build settings → Disable auto-build
- App Runner: Go to Configuration → Deployment → Manual deployment

---

## Backup Strategy

### Database Backups
- MongoDB Atlas has automatic backups
- Configure backup schedule in Atlas console
- Test restore process regularly

### Code Backups
- Code is in GitHub (version controlled)
- Keep production .env files in secure location
- Document all configuration changes

---

## Rollback Process

### Frontend Rollback (Amplify)
1. Go to Amplify console
2. Click on previous successful build
3. Click **Redeploy this version**

### Backend Rollback (App Runner)
1. Go to App Runner console
2. Click **Deployments** tab
3. Select previous deployment
4. Click **Deploy**

---

## Performance Optimization

### Frontend
- Enable Amplify's built-in CDN
- Use image optimization
- Implement code splitting
- Enable gzip compression

### Backend
- Use App Runner auto-scaling
- Implement caching (Redis if needed)
- Optimize MongoDB queries
- Use connection pooling

---

## Support

For AWS-specific issues:
- AWS Support (if you have a support plan)
- AWS Developer Forums
- Stack Overflow

For application issues:
- Check CloudWatch logs
- Review application logs
- Test locally first

---

## Deployment Checklist

### Pre-Deployment
- [ ] Code pushed to GitHub
- [ ] MongoDB Atlas cluster created
- [ ] Environment variables documented
- [ ] Local testing completed
- [ ] Production build tested

### Deployment
- [ ] Backend deployed to App Runner
- [ ] Backend URL obtained
- [ ] Frontend environment variables configured
- [ ] Frontend deployed to Amplify
- [ ] CORS updated in backend
- [ ] MongoDB IP whitelist configured

### Post-Deployment
- [ ] Frontend URL tested
- [ ] Backend API tested
- [ ] End-to-end flow tested
- [ ] Custom domain configured (if applicable)
- [ ] Monitoring set up
- [ ] Team notified

---

**Deployment complete! Your AquaWatch platform is now live on AWS! 🚀**
