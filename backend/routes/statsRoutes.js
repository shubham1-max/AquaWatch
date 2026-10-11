import express from 'express';
import Incident from '../models/Incident.js';
import { backfillIncidentWards } from '../utils/wardLookup.js';

const router = express.Router();

/**
 * Helper to aggregate real incident counts by ward dynamically from MongoDB
 */
export async function getLeaderboardAggregation() {
  // Ensure any incidents missing ward/wardId are backfilled from their coordinates
  await backfillIncidentWards();

  const leaderboard = await Incident.aggregate([
    {
      $group: {
        _id: {
          ward: { $ifNull: ['$ward', 'Bengaluru Ward'] },
          wardId: { $ifNull: ['$wardId', null] }
        },
        totalReports: { $sum: 1 },
        unresolvedReports: {
          $sum: {
            $cond: [{ $ne: ['$status', 'resolved'] }, 1, 0]
          }
        },
        resolvedReports: {
          $sum: {
            $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
          }
        },
        reportedCount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'reported'] }, 1, 0]
          }
        },
        inProgressCount: {
          $sum: {
            $cond: [
              { $in: ['$status', ['in_progress', 'under_review']] },
              1,
              0
            ]
          }
        },
        highSeverityCount: {
          $sum: {
            $cond: [{ $eq: ['$severity', 'high'] }, 1, 0]
          }
        },
        issueTypes: { $push: '$issueType' }
      }
    },
    {
      $project: {
        _id: 0,
        ward: '$_id.ward',
        wardName: '$_id.ward',
        wardId: '$_id.wardId',
        totalReports: 1,
        unresolvedReports: 1,
        resolvedReports: 1,
        reportedCount: 1,
        inProgressCount: 1,
        highSeverityCount: 1,
        issueTypes: 1
      }
    },
    {
      $sort: {
        unresolvedReports: -1,
        totalReports: -1,
        ward: 1
      }
    }
  ]);

  return leaderboard;
}

/**
 * @route   GET /api/stats
 * @desc    Get comprehensive stats with real dynamic MongoDB ward aggregation
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const total = await Incident.countDocuments();
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
        total,
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
 * @route   GET /api/stats/leaderboard
 * @desc    Get dynamic ward accountability leaderboard aggregated from MongoDB
 * @access  Public
 */
router.get('/leaderboard', async (req, res) => {
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
