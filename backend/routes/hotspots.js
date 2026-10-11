import express from 'express';
import hotspotService from '../services/hotspotService.js';
import weatherService from '../services/weatherService.js';
import runoffService from '../services/runoffService.js';
import {
  validateHotspotQuery,
  validateWeatherQuery,
  validateRunoffRecommendation
} from '../middleware/validators.js';

const router = express.Router();

/**
 * @route   GET /api/hotspots
 * @desc    Get all detected hotspots with priority scoring
 * @access  Public
 */
router.get('/', validateHotspotQuery, async (req, res) => {
  try {
    const {
      radius = 500,
      timeWindow = 30,
      minIncidents = 2,
      limit = 100,
      page = 1
    } = req.query;

    const parsedLimit = Math.min(parseInt(limit), 500); // Max 500 per page
    const parsedPage = Math.max(parseInt(page), 1);

    const hotspots = await hotspotService.detectHotspots(
      parseInt(radius),
      parseInt(timeWindow),
      parseInt(minIncidents),
      parsedLimit
    );

    // Simple pagination (in-memory for now)
    const startIndex = (parsedPage - 1) * parsedLimit;
    const endIndex = startIndex + parsedLimit;
    const paginatedHotspots = hotspots.slice(startIndex, endIndex);

    res.json({
      success: true,
      count: paginatedHotspots.length,
      total: hotspots.length,
      data: paginatedHotspots,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(hotspots.length / parsedLimit),
        hasMore: endIndex < hotspots.length
      },
      metadata: {
        radius: parseInt(radius),
        timeWindowDays: parseInt(timeWindow),
        minIncidents: parseInt(minIncidents),
        detectedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error detecting hotspots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect hotspots',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/hotspots/:id/weather
 * @desc    Get weather context for a specific hotspot
 * @access  Public
 */
router.get('/:id/weather', validateWeatherQuery, async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude required'
      });
    }

    const weatherData = await weatherService.getWeatherData(
      parseFloat(latitude),
      parseFloat(longitude)
    );

    // Add weather description
    weatherData.current.description = weatherService.getWeatherDescription(
      weatherData.current.weatherCode
    );

    // Calculate 24-hour precipitation
    weatherData.precipitation24h = weatherService.calculate24hPrecipitation(
      weatherData.hourly.precipitation
    );

    res.json({
      success: true,
      data: weatherData
    });
  } catch (error) {
    console.error('Error fetching weather:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weather data',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/hotspots/:id/recommendation
 * @desc    Generate intervention recommendation for a hotspot
 * @access  Public
 */
router.post('/:id/recommendation', validateRunoffRecommendation, async (req, res) => {
  try {
    const {
      rainfall,
      catchmentArea,
      runoffCoefficient,
      surfaceType,
      issueType
    } = req.body;

    if (!rainfall || !catchmentArea) {
      return res.status(400).json({
        success: false,
        message: 'Rainfall and catchment area required'
      });
    }

    // Use provided coefficient or get default based on surface type
    const coefficient = runoffCoefficient ||
      (surfaceType ? runoffService.getRunoffCoefficient(surfaceType) : 0.70);

    // Calculate runoff
    const runoffCalc = runoffService.calculateRunoff(
      parseFloat(rainfall),
      parseFloat(catchmentArea),
      parseFloat(coefficient)
    );

    // Generate recommendation
    const recommendation = runoffService.generateRecommendation(
      runoffCalc.runoffCubicMeters,
      issueType || 'waterlogging'
    );

    // Calculate annual savings
    const annualSavings = runoffService.calculateAnnualSavings(
      runoffCalc.runoffCubicMeters
    );

    res.json({
      success: true,
      data: {
        calculation: runoffCalc,
        recommendation,
        annualSavings,
        surfaceTypes: {
          concrete: 0.90,
          asphalt: 0.85,
          roof: 0.90,
          compacted_soil: 0.60,
          gravel: 0.50,
          lawn_flat: 0.20,
          lawn_steep: 0.35,
          forest: 0.10,
          mixed_urban: 0.70
        }
      }
    });
  } catch (error) {
    console.error('Error generating recommendation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate recommendation',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/hotspots/priority/top
 * @desc    Get top priority hotspots
 * @access  Public
 */
router.get('/priority/top', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const parsedLimit = parseInt(limit);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid limit parameter' });
    }

    const hotspots = await hotspotService.detectHotspots();
    const topHotspots = hotspots.slice(0, parsedLimit);

    res.json({
      success: true,
      count: topHotspots.length,
      data: topHotspots
    });
  } catch (error) {
    console.error('Error fetching top hotspots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top hotspots',
      error: error.message
    });
  }
});

export default router;
