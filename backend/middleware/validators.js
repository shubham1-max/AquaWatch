import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';

// Middleware to check validation results
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Coordinate validation
export const validateCoordinates = (latField, lngField) => [
  body(latField)
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90')
    .toFloat(),
  body(lngField)
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
    .toFloat()
];

// Incident creation validation
export const validateIncidentCreation = [
  body('issueType')
    .isIn(['waterlogging', 'blocked_drain', 'overflow', 'visible_leak'])
    .withMessage('Invalid issue type'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters')
    .escape(),
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90')
    .toFloat(),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
    .toFloat(),
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Severity must be low, medium, or high'),
  body('sourceType')
    .optional()
    .isIn(['user', 'sample'])
    .withMessage('Source type must be user or sample'),
  body('ward')
    .optional()
    .trim(),
  body('wardId')
    .optional()
    .trim(),
  handleValidationErrors
];

// Incident update validation
export const validateIncidentUpdate = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid incident ID'),
  body('status')
    .optional()
    .isIn(['reported', 'under_review', 'in_progress', 'resolved'])
    .withMessage('Invalid status'),
  body('verificationStatus')
    .optional()
    .isIn(['unverified', 'verified', 'disputed'])
    .withMessage('Invalid verification status'),
  body('resolutionNote')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Resolution note must be 500 characters or less')
    .escape(),
  handleValidationErrors
];

// Get incident by ID validation
export const validateIncidentId = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid incident ID'),
  handleValidationErrors
];

// Query parameter validation
export const validateIncidentQuery = [
  query('status')
    .optional()
    .isIn(['reported', 'under_review', 'in_progress', 'resolved'])
    .withMessage('Invalid status filter'),
  query('issueType')
    .optional()
    .isIn(['waterlogging', 'blocked_drain', 'overflow', 'visible_leak'])
    .withMessage('Invalid issue type filter'),
  query('severity')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid severity filter'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Limit must be between 1 and 500'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('skip')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Skip must be a non-negative integer'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'severity', 'status', 'updatedAt'])
    .withMessage('Invalid sort field'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc'),
  handleValidationErrors
];

// Nearby incidents validation
export const validateNearbyQuery = [
  query('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90')
    .toFloat(),
  query('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
    .toFloat(),
  query('radius')
    .optional()
    .isInt({ min: 100, max: 50000 })
    .withMessage('Radius must be between 100 and 50000 meters'),
  handleValidationErrors
];

// Hotspot query validation
export const validateHotspotQuery = [
  query('radius')
    .optional()
    .isInt({ min: 100, max: 5000 })
    .withMessage('Radius must be between 100 and 5000 meters'),
  query('timeWindow')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Time window must be between 1 and 365 days'),
  query('minIncidents')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Minimum incidents must be between 1 and 100'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Limit must be between 1 and 500'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  handleValidationErrors
];

// Weather query validation
export const validateWeatherQuery = [
  query('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90')
    .toFloat(),
  query('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
    .toFloat(),
  handleValidationErrors
];

// Runoff recommendation validation
export const validateRunoffRecommendation = [
  body('rainfall')
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Rainfall must be between 0 and 1000 mm'),
  body('catchmentArea')
    .isFloat({ min: 1, max: 1000000 })
    .withMessage('Catchment area must be between 1 and 1,000,000 m²'),
  body('runoffCoefficient')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Runoff coefficient must be between 0 and 1'),
  body('surfaceType')
    .optional()
    .isIn(['concrete', 'asphalt', 'roof', 'compacted_soil', 'gravel', 'lawn_flat', 'lawn_steep', 'forest', 'mixed_urban'])
    .withMessage('Invalid surface type'),
  handleValidationErrors
];
