import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Incident from '../models/Incident.js';
import { createIncidentLimiter } from '../middleware/rateLimiter.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import {
  validateIncidentCreation,
  validateIncidentUpdate,
  validateIncidentId,
  validateIncidentQuery,
  validateNearbyQuery
} from '../middleware/validators.js';
import { getWardForCoordinates } from '../utils/wardLookup.js';
import { getLeaderboardAggregation } from './statsRoutes.js';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `incident-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Magic number validation for file types
const validateFileType = (buffer) => {
  const magicNumbers = {
    'ffd8ff': 'jpg',     // JPEG
    '89504e47': 'png',   // PNG
    '47494638': 'gif',   // GIF
    '52494646': 'webp'   // WEBP (RIFF header)
  };

  const hex = buffer.toString('hex', 0, 4);
  for (const [magic, type] of Object.entries(magicNumbers)) {
    if (hex.startsWith(magic)) {
      return type;
    }
  }
  return null;
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1 // Only 1 file per request
  },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();

    // Check MIME type and extension
    if (file.mimetype.startsWith('image/') && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type! Please upload a valid image file.'), false);
    }
  }
});

const uploadSinglePhoto = (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid file uploaded. Please upload a valid image file.'
      });
    }
    next();
  });
};

/**
 * @route   POST /api/incidents
 * @desc    Create a new incident report
 * @access  Public
 */
router.post('/', createIncidentLimiter, uploadSinglePhoto, validateIncidentCreation, async (req, res) => {
  try {
    const {
      issueType,
      description,
      latitude,
      longitude,
      severity,
      sourceType,
      ward,
      wardId
    } = req.body;

    let evidenceUrl = null;

    // Validate file content if uploaded
    if (req.file) {
      const fileBuffer = fs.readFileSync(req.file.path);
      const fileType = validateFileType(fileBuffer);

      if (!fileType) {
        // Delete invalid file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Invalid image file. File content does not match image format.'
        });
      }

      evidenceUrl = `/uploads/${req.file.filename}`;
    }

    let resolvedWard = ward;
    let resolvedWardId = wardId;
    if (!resolvedWard) {
      const detected = getWardForCoordinates(parseFloat(longitude), parseFloat(latitude));
      resolvedWard = detected.wardName;
      resolvedWardId = detected.wardId;
    }

    const incident = new Incident({
      ward: resolvedWard,
      wardId: resolvedWardId,
      issueType,
      description,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      severity: severity || 'medium',
      sourceType: sourceType || 'user',
      evidenceUrl
    });

    await incident.save();

    res.status(201).json({
      success: true,
      data: incident,
      message: 'Incident reported successfully'
    });
  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production'
        ? 'Failed to create incident report'
        : error.message
    });
  }
});

/**
 * @route   GET /api/incidents
 * @desc    Get all incidents with optional filters and pagination
 * @access  Public
 * @query   {string} status - Filter by status
 * @query   {string} issueType - Filter by issue type
 * @query   {string} severity - Filter by severity
 * @query   {number} limit - Number of results per page (1-500, default: 100)
 * @query   {number} page - Page number (1-indexed, default: 1)
 * @query   {number} skip - Number of results to skip (alternative to page)
 * @query   {string} sortBy - Field to sort by (default: createdAt)
 * @query   {string} order - Sort order: asc or desc (default: desc)
 */
router.get('/', validateIncidentQuery, async (req, res) => {
  try {
    const {
      status,
      issueType,
      severity,
      limit = 100,
      page,
      skip,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (issueType) filter.issueType = issueType;
    if (severity) filter.severity = severity;

    const sanitizedLimit = Math.min(Math.max(parseInt(limit), 1), 500);

    // Calculate skip value from either skip or page parameter
    let skipValue = 0;
    if (skip !== undefined) {
      skipValue = Math.max(0, parseInt(skip));
    } else if (page !== undefined) {
      const pageNum = Math.max(1, parseInt(page));
      skipValue = (pageNum - 1) * sanitizedLimit;
    }

    // Get total count for pagination metadata
    const totalCount = await Incident.countDocuments(filter);

    const incidents = await Incident.find(filter)
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .skip(skipValue)
      .limit(sanitizedLimit);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / sanitizedLimit);
    const currentPage = Math.floor(skipValue / sanitizedLimit) + 1;
    const hasNextPage = skipValue + incidents.length < totalCount;
    const hasPrevPage = skipValue > 0;

    res.json({
      success: true,
      count: incidents.length,
      data: incidents,
      pagination: {
        total: totalCount,
        limit: sanitizedLimit,
        skip: skipValue,
        page: currentPage,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? currentPage + 1 : null,
        prevPage: hasPrevPage ? currentPage - 1 : null
      }
    });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production'
        ? 'Failed to fetch incidents'
        : error.message
    });
  }
});

/**
 * @route   GET /api/incidents/:id
 * @desc    Get single incident by ID
 * @access  Public
 */
router.get('/:id', validateIncidentId, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    res.json({
      success: true,
      data: incident
    });
  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production'
        ? 'Failed to fetch incident'
        : error.message
    });
  }
});

/**
 * @route   POST /api/incidents/:id/confirm
 * @desc    Record citizen confirmation ("I saw this too")
 * @access  Public
 */
router.post('/:id/confirm', validateIncidentId, async (req, res) => {
  try {
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      { $inc: { confirmationsCount: 1 } },
      { new: true }
    );

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    res.json({
      success: true,
      data: incident,
      message: 'Confirmation recorded successfully'
    });
  } catch (error) {
    console.error('Error confirming incident:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   PATCH /api/incidents/:id
 * @desc    Update incident status (citizens must upload photo of situation; admins can update directly)
 * @access  Public with situation photo / Private for admins
 */
router.patch('/:id', optionalAuth, uploadSinglePhoto, validateIncidentUpdate, async (req, res) => {
  try {
    const { status, verificationStatus, resolutionNote } = req.body;

    // Strict validation: citizens can only update the issue by uploading a new image of the situation
    // to analyze whether it is in progress or resolved.
    if (!req.isAuthenticated) {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Uploading a new photo of the situation is required to analyze and update the status.'
        });
      }
      if (!status || !['in_progress', 'resolved'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Citizens may only update status to "in_progress" or "resolved" with photo proof.'
        });
      }
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (verificationStatus) updateData.verificationStatus = verificationStatus;
    if (resolutionNote) updateData.resolutionNote = resolutionNote;

    if (req.file) {
      // Validate file contents using magic numbers
      const buffer = fs.readFileSync(req.file.path);
      const fileType = validateFileType(buffer);

      if (!fileType) {
        // Delete invalid file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: 'Invalid file format. Only JPEG, PNG, GIF, and WEBP images are allowed.'
        });
      }

      updateData.evidenceUrl = `/uploads/${req.file.filename}`;
      if (status === 'resolved' && !verificationStatus) {
        updateData.verificationStatus = 'verified';
      }
    }

    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    res.json({
      success: true,
      data: incident,
      message: 'Incident updated successfully'
    });
  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production'
        ? 'Failed to update incident'
        : error.message
    });
  }
});

/**
 * @route   GET /api/incidents/location/nearby
 * @desc    Get incidents near a location
 * @access  Public
 */
router.get('/location/nearby', validateNearbyQuery, async (req, res) => {
  try {
    const { latitude, longitude, radius = 1000 } = req.query;

    const sanitizedRadius = Math.min(Math.max(parseInt(radius), 100), 50000);

    const incidents = await Incident.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: sanitizedRadius
        }
      }
    }).limit(50);

    res.json({
      success: true,
      count: incidents.length,
      data: incidents
    });
  } catch (error) {
    console.error('Error finding nearby incidents:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production'
        ? 'Failed to find nearby incidents'
        : error.message
    });
  }
});

/**
 * @route   GET /api/incidents/analytics/stats
 * @desc    Get incident statistics
 * @access  Public
 */
router.get('/analytics/stats', async (req, res) => {
  try {
    const totalIncidents = await Incident.countDocuments();
    const byStatus = await Incident.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const byIssueType = await Incident.aggregate([
      { $group: { _id: '$issueType', count: { $sum: 1 } } }
    ]);
    const bySeverity = await Incident.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);
    const leaderboard = await getLeaderboardAggregation();

    res.json({
      success: true,
      data: {
        total: totalIncidents,
        byStatus,
        byIssueType,
        bySeverity,
        byWard: leaderboard,
        leaderboard
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production'
        ? 'Failed to fetch statistics'
        : error.message
    });
  }
});

/**
 * @route   GET /api/incidents/analytics/leaderboard
 * @desc    Get ward leaderboard aggregated from MongoDB
 * @access  Public
 */
router.get('/analytics/leaderboard', async (req, res) => {
  try {
    const leaderboard = await getLeaderboardAggregation();
    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production'
        ? 'Failed to fetch ward leaderboard'
        : error.message
    });
  }
});

export default router;
