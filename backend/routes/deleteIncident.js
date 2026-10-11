import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateIncidentId } from '../middleware/validators.js';
import Incident from '../models/Incident.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

/**
 * @route   DELETE /api/incidents/:id
 * @desc    Delete an incident and its associated photo
 * @access  Private (requires authentication)
 */
router.delete('/:id', requireAuth, validateIncidentId, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: 'Incident not found'
      });
    }

    // Delete associated photo file if it exists
    if (incident.evidenceUrl) {
      const photoPath = path.join(__dirname, '..', incident.evidenceUrl);

      if (fs.existsSync(photoPath)) {
        try {
          fs.unlinkSync(photoPath);
          console.log(`Deleted photo file: ${photoPath}`);
        } catch (err) {
          console.error(`Failed to delete photo file: ${photoPath}`, err);
          // Continue with deletion even if file removal fails
        }
      }
    }

    // Delete the incident from database
    await Incident.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Incident and associated files deleted successfully',
      deletedId: req.params.id
    });
  } catch (error) {
    console.error('Error deleting incident:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production'
        ? 'Failed to delete incident'
        : error.message
    });
  }
});

export default router;
