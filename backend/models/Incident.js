import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema({
  ward: {
    type: String,
    trim: true,
    index: true,
    default: null
  },
  wardId: {
    type: String,
    trim: true,
    index: true,
    default: null
  },
  issueType: {
    type: String,
    required: true,
    enum: ['waterlogging', 'blocked_drain', 'overflow', 'visible_leak'],
    index: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 &&
                 coords[1] >= -90 && coords[1] <= 90 &&
                 coords[0] >= -180 && coords[0] <= 180;
        },
        message: 'Invalid coordinates'
      }
    }
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    required: true,
    enum: ['reported', 'under_review', 'in_progress', 'resolved'],
    default: 'reported',
    index: true
  },
  observedAt: {
    type: Date,
    default: Date.now
  },
  evidenceUrl: {
    type: String,
    default: null
  },
  verificationStatus: {
    type: String,
    enum: ['unverified', 'verified', 'disputed'],
    default: 'unverified'
  },
  sourceType: {
    type: String,
    enum: ['user', 'sample'],
    default: 'user'
  },
  resolutionNote: {
    type: String,
    maxlength: 500,
    default: null
  },
  confirmationsCount: {
    type: Number,
    default: 0
  },
  viewsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Geospatial index for location-based queries
incidentSchema.index({ location: '2dsphere' });

// Compound index for efficient hotspot queries
incidentSchema.index({ issueType: 1, status: 1, createdAt: -1 });

// Compound index for ward-based queries
incidentSchema.index({ ward: 1, status: 1 });
incidentSchema.index({ wardId: 1, status: 1 });

// Method to calculate time-based freshness score
incidentSchema.methods.getFreshnessScore = function() {
  const now = new Date();
  const ageInHours = (now - this.createdAt) / (1000 * 60 * 60);

  if (ageInHours < 24) return 1.0;
  if (ageInHours < 72) return 0.7;
  if (ageInHours < 168) return 0.4;
  return 0.2;
};

// Method to get severity weight
incidentSchema.methods.getSeverityWeight = function() {
  const weights = {
    low: 0.3,
    medium: 0.6,
    high: 1.0
  };
  return weights[this.severity] || 0.6;
};

// Method to get verification weight
incidentSchema.methods.getVerificationWeight = function() {
  const weights = {
    unverified: 0.3,
    verified: 1.0,
    disputed: 0.1
  };
  return weights[this.verificationStatus] || 0.3;
};

const Incident = mongoose.model('Incident', incidentSchema);

export default Incident;
