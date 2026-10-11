# AWS Elastic Beanstalk Deployment Guide for AquaWatch

This guide walks you through deploying the complete **AquaWatch** project to **AWS Elastic Beanstalk** (Amazon Linux 2023 / Node.js platform).

---

## 🌟 Architecture Overview

AquaWatch is deployed as a high-performance, single-tier or multi-tier application on AWS Elastic Beanstalk:

| Component | Technology | Role on Elastic Beanstalk |
|-----------|------------|---------------------------|
| **Frontend** | React 18 + Vite + Leaflet | Bundled into `public/` and served statically by Express with SPA routing |
| **Backend API** | Node.js + Express + Mongoose | Handles `/api/*` endpoints, weather integrations, rate limiting, and uploads |
| **Reverse Proxy** | Nginx (EB Managed) | Handles HTTP/HTTPS, proxies to port 8080, supports 15MB file uploads |
| **Health Monitoring** | EB Enhanced Health | Monitors `/health` endpoint every 10 seconds |
| **Database** | MongoDB Atlas | Managed cloud database connected via connection URI |

> **Why Unified Deployment?**
> By bundling the compiled React frontend into the Node.js application, both frontend and backend share the exact same Elastic Beanstalk domain. This eliminates all CORS issues, avoids maintaining separate hosting services, and lowers AWS costs to a single EC2 instance / load balancer.

---

## 📦 What Was Configured for Elastic Beanstalk

1. **`Procfile`**: Defines the process command (`web: node server.js`) for Elastic Beanstalk.
2. **`.ebextensions/01_environment.config`**: Sets environment variables, proxy port (`8080`), and configures the health check to target `/health`.
3. **`.platform/nginx/conf.d/proxy.conf`**: Configures Nginx reverse proxy with `client_max_body_size 15M;` (preventing `413 Request Entity Too Large` errors on photo uploads).
4. **`.platform/hooks/predeploy/01_mkdir.sh` & `postdeploy/01_permissions.sh`**: Ensures `uploads/` directory exists and has write permissions for `webapp`.
5. **`backend/server.js`**:
   - Fixed missing `mongoose` import for the `/health` endpoint.
   - Enhanced CORS handling for production URLs.
   - Added automatic static frontend serving from `public/` with SPA fallback.
6. **`frontend/vite.config.js`**: Fixed chunking and minification compatibility with modern Vite.
7. **`package-eb.js`**: Packaging script that bundles everything into a production-ready zip archive without bulky local `node_modules`.

---

## 🚀 Quick Deployment: AWS Web Console (Recommended)

The easiest way to deploy without installing CLI tools:

### Step 1: Generate the Deployment Package

Run the packaging script from the project root:

```bash
npm run build:eb
```

This creates:
- `aquawatch-elasticbeanstalk.zip` (~2.5 MB)

*(Or run `npm run build:eb:backend` if you want only the backend API).*

---

### Step 2: Create Application in AWS Elastic Beanstalk Console

1. Open the [AWS Elastic Beanstalk Console](https://console.aws.amazon.com/elasticbeanstalk/).
2. Click **Create application** (or **Create environment**).
3. **Application name**: `aquawatch`
4. **Platform**:
   - Platform: **Node.js**
   - Platform branch: **Node.js 20 running on 64bit Amazon Linux 2023** (or Node.js 18)
   - Platform version: Recommended default
5. **Application code**:
   - Select **Upload your code**
   - Version label: `v1.0.0`
   - Source code origin: **Local file** -> Click **Choose file**
   - Select `aquawatch-elasticbeanstalk.zip`
6. **Presets**: Select **Single instance (free tier eligible)** for testing or **High availability** for production.
7. Click **Next**.

---

### Step 3: Configure Service Access & Permissions

1. **Service role**: Choose **Use an existing service role** (`aws-elasticbeanstalk-service-role`) or create one.
2. **EC2 key pair**: Optional (leave blank if you don't need SSH access).
3. **EC2 instance profile**: Select an IAM role with `AWSElasticBeanstalkWebTier` (e.g., `aws-elasticbeanstalk-ec2-role`).
   > *Note:* If you don't have an instance profile yet, create a role in IAM Console with `AWSElasticBeanstalkWebTier` and attach it here.
4. Click **Next**.

---

### Step 4: Configure Networking & Environment (Optional)

1. Select your default VPC and subnets (or use defaults).
2. Click **Next**.

---

### Step 5: Configure Environment Variables & Health Checks

Scroll to **Environment properties** and add:

| Property Name | Example Value | Description |
|---------------|---------------|-------------|
| `NODE_ENV` | `production` | Enables production mode |
| `PORT` | `8080` | Port monitored by Nginx proxy |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/aquawatch?retryWrites=true&w=majority` | Your MongoDB Atlas connection URI |
| `ADMIN_API_KEY` | *(Random 32-character hex string)* | API key for admin operations |
| `WEATHER_API_BASE_URL` | `https://api.open-meteo.com/v1` | Weather data API endpoint |
| `MAX_FILE_SIZE` | `5242880` | Max upload size (5 MB) |
| `UPLOAD_DIR` | `uploads` | Directory for uploaded incident photos |
| `FRONTEND_URL` | *(Leave blank or set to your custom domain)* | Allowed CORS origin |

> **How to generate a secure ADMIN_API_KEY:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

Click **Next**, review your configuration, and click **Submit**!

---

### Step 6: Verify Deployment

AWS will launch your EC2 instance, install dependencies, configure Nginx, and start the app.
After 3–5 minutes, your environment health will show a green **OK**.

- Visit your environment URL: `http://<your-env-name>.<region>.elasticbeanstalk.com`
- Test health check: `http://<your-env-name>.<region>.elasticbeanstalk.com/health`
- Test API info: `http://<your-env-name>.<region>.elasticbeanstalk.com/api/incidents`

---

## 🛠️ Alternative Deployment: Using AWS EB CLI

If you prefer using the command line:

### 1. Install EB CLI

```bash
# Using pip
pip install awsebcli

# Verify installation
eb --version
```

### 2. Configure AWS Credentials

```bash
aws configure
```

### 3. Initialize & Deploy

```bash
# Initialize Elastic Beanstalk
eb init -p node.js-20 aquawatch --region ap-south-1

# Create environment and deploy
eb create aquawatch-prod --single --instance-type t3.small

# Set environment variables
eb setenv NODE_ENV=production PORT=8080 MONGODB_URI="your_mongodb_uri" ADMIN_API_KEY="your_api_key"

# For subsequent updates:
npm run build:eb
eb deploy
```

---

## 🔄 CI/CD Automation (GitHub Actions)

To automatically deploy to Elastic Beanstalk on git push, configure these GitHub Secrets:

- `AWS_ACCESS_KEY_ID`: IAM user access key
- `AWS_SECRET_ACCESS_KEY`: IAM user secret key
- `EB_APP_NAME`: `aquawatch`
- `EB_ENV_NAME`: `aquawatch-prod`

Add this job to `.github/workflows/ci-cd.yml`:

```yaml
  deploy-elastic-beanstalk:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies & Build
        run: |
          npm ci
          cd backend && npm ci
          cd ../frontend && npm ci
          cd ..
          node package-eb.js

      - name: Deploy to Elastic Beanstalk
        uses: einaregilsson/beanstalk-deploy@v22
        with:
          aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          application_name: ${{ secrets.EB_APP_NAME }}
          environment_name: ${{ secrets.EB_ENV_NAME }}
          version_label: "v${{ github.run_number }}"
          region: ap-south-1
          deployment_package: aquawatch-elasticbeanstalk.zip
```

---

## 🔧 Troubleshooting

### 1. Environment status is "Degraded" or "Severe"
- Check `/health` endpoint. If MongoDB connection fails, Elastic Beanstalk marks the health check as degraded.
- Verify `MONGODB_URI` has the correct username, password, and database name.
- Check MongoDB Atlas Network Access: Make sure **0.0.0.0/0** (or your Elastic Beanstalk EC2 IP/NAT Gateway) is allowed.

### 2. Viewing Logs
- In AWS Console: Navigate to **Logs** -> **Request Logs** -> **Last 100 Lines**.
- Via EB CLI: `eb logs`

### 3. File Uploads (413 Request Entity Too Large)
- `.platform/nginx/conf.d/proxy.conf` increases the limit to 15MB. Ensure this file is present in the uploaded zip.
