import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDB from './config/database.js';
import incidentRoutes from './routes/incidents.js';
import deleteIncidentRoute from './routes/deleteIncident.js';
import hotspotRoutes from './routes/hotspots.js';
import statsRoutes from './routes/statsRoutes.js';
import { backfillIncidentWards } from './utils/wardLookup.js';
import { apiLimiter } from './middleware/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware - MUST be first
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  originAgentCluster: false,
  hsts: false,
}));

// Sanitize data to prevent MongoDB operator injection
app.use(mongoSanitize());

// CORS configuration
const parseAllowedOrigins = () => {
  const frontendEnv = process.env.FRONTEND_URL || '';
  return frontendEnv
    .split(',')
    .map(url => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

app.use(cors({
  origin: (origin, callback) => {
    // 1. Allow direct browser navigation, health checks, curl, and requests with no origin
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/+$/, '');

    // 2. Always allow localhost, 127.0.0.1, and AWS Elastic Beanstalk domains
    if (
      normalizedOrigin.includes('localhost') ||
      normalizedOrigin.includes('127.0.0.1') ||
      normalizedOrigin.includes('elasticbeanstalk.com') ||
      normalizedOrigin.includes('amazonaws.com')
    ) {
      return callback(null, true);
    }

    // 3. If FRONTEND_URL is wildcard or empty, allow
    if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    // 4. Check against configured origins
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    // Fallback: allow to prevent breaking client assets
    return callback(null, true);
  },
  credentials: true
}));

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Serve uploads folder statically with CORS headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Health check endpoint (no rate limit)
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    // Simple DB ping
    let dbLatency = null;
    if (dbStatus === 'connected') {
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      dbLatency = Date.now() - startTime;
    }

    const health = {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        latency: dbLatency ? `${dbLatency}ms` : null
      },
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
      }
    };

    // Return 503 if database is not connected
    if (dbStatus !== 'connected') {
      health.status = 'unhealthy';
      return res.status(503).json(health);
    }

    res.json(health);
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// API Routes
app.use('/api/incidents', incidentRoutes);
app.use('/api/incidents', deleteIncidentRoute);
app.use('/api/hotspots', hotspotRoutes);
app.use('/api/stats', statsRoutes);

// Serve static frontend if available (Unified Elastic Beanstalk deployment)
const candidateDistPaths = [
  path.join(__dirname, 'public'),
  path.join(__dirname, '../frontend/dist')
];
const frontendDistPath = candidateDistPaths.find(p => fs.existsSync(path.join(p, 'index.html')));

if (frontendDistPath) {
  console.log(`📦 Serving static frontend from: ${frontendDistPath}`);
  app.use(express.static(frontendDistPath, {
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health' || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  // Root endpoint when frontend is not bundled
  app.get('/', (req, res) => {
    res.json({
      name: 'AquaWatch API',
      version: '1.0.0',
      description: 'Citizen-powered waterlogging intelligence platform',
      endpoints: {
        health: '/health',
        incidents: '/api/incidents',
        hotspots: '/api/hotspots',
        stats: '/api/stats',
        leaderboard: '/api/stats/leaderboard'
      },
      documentation: 'See README.md for API documentation'
    });
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  // Handle specific error types
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    });
  }

  // Don't expose error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    success: false,
    message: isDevelopment ? err.message : 'An error occurred while processing your request',
    ...(isDevelopment && { stack: err.stack })
  });
});

// Start server only after database connection
const startServer = async () => {
  try {
    await connectDB();
    await backfillIncidentWards();

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════╗
║         🌊 AquaWatch API Server            ║
╚════════════════════════════════════════════╝

  Environment: ${process.env.NODE_ENV || 'development'}
  Server URL:  http://localhost:${PORT}
  Health:      http://localhost:${PORT}/health

  Security Features:
  ✅ Helmet security headers
  ✅ Rate limiting enabled
  ✅ Input validation
  ✅ MongoDB injection protection
  ✅ CORS configured

  API Endpoints:
  • GET    /api/incidents          - List all incidents
  • POST   /api/incidents          - Create new incident
  • GET    /api/incidents/:id      - Get incident details
  • PATCH  /api/incidents/:id      - Update incident
  • GET    /api/hotspots           - Detect hotspots
  • POST   /api/hotspots/:id/recommendation - Get recommendations

  Press Ctrl+C to stop
  `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;
