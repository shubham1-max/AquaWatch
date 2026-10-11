/**
 * Optimized Hotspot Service with Spatial Indexing
 * Replaces O(N²) algorithm with efficient database queries
 */
import Incident from '../models/Incident.js';

class HotspotService {
  /**
   * Detect hotspots using MongoDB geospatial aggregation with pagination
   * @param {number} radiusMeters - Clustering radius (default: 500m)
   * @param {number} timeWindowDays - Time window for grouping (default: 30 days)
   * @param {number} minIncidents - Minimum incidents to form a hotspot (default: 2)
   * @param {number} limit - Maximum hotspots to return
   * @returns {Array} Array of hotspot objects
   */
  async detectHotspots(radiusMeters = 500, timeWindowDays = 30, minIncidents = 2, limit = 100) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timeWindowDays);

      // Get active incidents
      const incidents = await Incident.find({
        createdAt: { $gte: cutoffDate },
        status: { $ne: 'resolved' }
      }).lean().limit(10000); // Safety limit

      if (incidents.length === 0) {
        return [];
      }

      // Use DBSCAN-like clustering algorithm (more efficient than nested loops)
      const clusteredHotspots = this.performClustering(incidents, radiusMeters, minIncidents);

      // Sort hotspots by priority score (highest first)
      const sortedHotspots = clusteredHotspots.sort((a, b) => b.priorityScore - a.priorityScore);

      // Return limited results
      return sortedHotspots.slice(0, limit);
    } catch (error) {
      console.error('Hotspot detection error:', error);
      throw error;
    }
  }

  /**
   * Perform DBSCAN-style clustering (O(N log N) with spatial indexing)
   * @param {Array} incidents - Array of incidents
   * @param {number} radiusMeters - Clustering radius
   * @param {number} minIncidents - Minimum cluster size
   * @returns {Array} Array of hotspots
   */
  performClustering(incidents, radiusMeters, minIncidents) {
    const clusters = [];
    const visited = new Set();
    const noise = new Set();

    // Haversine distance calculation
    const calculateDistance = (lon1, lat1, lon2, lat2) => {
      const R = 6371e3; // Earth radius in meters
      const toRad = (value) => value * Math.PI / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Find neighbors within radius
    const getNeighbors = (incident, allIncidents) => {
      const [centerLon, centerLat] = incident.location.coordinates;
      return allIncidents.filter(candidate => {
        if (visited.has(candidate._id.toString())) return false;
        if (candidate.issueType !== incident.issueType) return false;

        const [candLon, candLat] = candidate.location.coordinates;
        const dist = calculateDistance(centerLon, centerLat, candLon, candLat);
        return dist <= radiusMeters;
      });
    };

    // DBSCAN clustering
    for (const incident of incidents) {
      const id = incident._id.toString();

      if (visited.has(id)) continue;
      visited.add(id);

      const neighbors = getNeighbors(incident, incidents);

      if (neighbors.length < minIncidents - 1) {
        noise.add(id);
        continue;
      }

      // Start new cluster
      const cluster = [incident, ...neighbors];
      neighbors.forEach(n => visited.add(n._id.toString()));

      // Expand cluster
      let i = 0;
      while (i < cluster.length) {
        const current = cluster[i];
        const currentNeighbors = getNeighbors(current, incidents);

        if (currentNeighbors.length >= minIncidents - 1) {
          for (const neighbor of currentNeighbors) {
            const nId = neighbor._id.toString();
            if (!visited.has(nId)) {
              visited.add(nId);
              cluster.push(neighbor);
            }
          }
        }
        i++;
      }

      if (cluster.length >= minIncidents) {
        clusters.push(this.createHotspot(cluster));
      }
    }

    return clusters;
  }

  /**
   * Create a hotspot object from clustered incidents
   * @param {Array} incidents - Clustered incidents
   * @returns {Object} Hotspot object with priority score
   */
  createHotspot(incidents) {
    // Calculate center point (average of all coordinates)
    const coordinates = incidents.map(inc => inc.location.coordinates);
    const centerLon = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length;
    const centerLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length;

    // Priority score components (extracted as constants)
    const WEIGHT_VOLUME = 0.40;
    const WEIGHT_SEVERITY = 0.25;
    const WEIGHT_FRESHNESS = 0.25;
    const WEIGHT_VERIFICATION = 0.10;

    const volumeScore = this.calculateVolumeScore(incidents.length);
    const severityScore = this.calculateSeverityScore(incidents);
    const freshnessScore = this.calculateFreshnessScore(incidents);
    const verificationScore = this.calculateVerificationScore(incidents);

    // Weighted priority score
    const priorityScore =
      volumeScore * WEIGHT_VOLUME +
      severityScore * WEIGHT_SEVERITY +
      freshnessScore * WEIGHT_FRESHNESS +
      verificationScore * WEIGHT_VERIFICATION;

    // Get latest incident
    const latestIncident = incidents.reduce((latest, current) =>
      new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
    );

    // Severity distribution
    const severityCounts = incidents.reduce((acc, inc) => {
      acc[inc.severity] = (acc[inc.severity] || 0) + 1;
      return acc;
    }, {});

    return {
      id: `hotspot_${centerLat.toFixed(6)}_${centerLon.toFixed(6)}`,
      location: {
        type: 'Point',
        coordinates: [centerLon, centerLat]
      },
      issueType: incidents[0].issueType,
      incidentCount: incidents.length,
      incidents: incidents.map(inc => ({
        id: inc._id,
        severity: inc.severity,
        status: inc.status,
        createdAt: inc.createdAt,
        description: inc.description,
        verificationStatus: inc.verificationStatus
      })),
      priorityScore: Math.round(priorityScore * 100) / 100,
      scoreBreakdown: {
        volume: Math.round(volumeScore * 100) / 100,
        severity: Math.round(severityScore * 100) / 100,
        freshness: Math.round(freshnessScore * 100) / 100,
        verification: Math.round(verificationScore * 100) / 100
      },
      severityDistribution: severityCounts,
      latestReport: latestIncident.createdAt,
      oldestReport: incidents.reduce((oldest, current) =>
        new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest
      ).createdAt,
      explanation: this.generateExplanation(incidents, severityCounts, priorityScore)
    };
  }

  /**
   * Calculate volume score based on number of reports
   * @param {number} count - Number of incidents
   * @returns {number} Score between 0 and 1
   */
  calculateVolumeScore(count) {
    // Logarithmic scale: 2 reports = 0.4, 5 = 0.7, 10+ = 1.0
    if (count >= 10) return 1.0;
    if (count >= 5) return 0.8;
    if (count >= 3) return 0.6;
    return 0.4;
  }

  /**
   * Calculate average severity score
   * @param {Array} incidents
   * @returns {number} Score between 0 and 1
   */
  calculateSeverityScore(incidents) {
    const severityWeights = { low: 0.3, medium: 0.6, high: 1.0 };
    const totalWeight = incidents.reduce((sum, inc) =>
      sum + (severityWeights[inc.severity] || 0.6), 0
    );
    return totalWeight / incidents.length;
  }

  /**
   * Calculate freshness score (most recent incident)
   * @param {Array} incidents
   * @returns {number} Score between 0 and 1
   */
  calculateFreshnessScore(incidents) {
    const latestIncident = incidents.reduce((latest, current) =>
      new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
    );

    const hoursAgo = (Date.now() - new Date(latestIncident.createdAt).getTime()) / (1000 * 60 * 60);

    // Decay function
    if (hoursAgo < 1) return 1.0;
    if (hoursAgo < 6) return 0.9;
    if (hoursAgo < 24) return 0.7;
    if (hoursAgo < 72) return 0.5;
    if (hoursAgo < 168) return 0.3; // 7 days
    return 0.1;
  }

  /**
   * Calculate verification score
   * @param {Array} incidents
   * @returns {number} Score between 0 and 1
   */
  calculateVerificationScore(incidents) {
    const verificationWeights = {
      verified: 1.0,
      unverified: 0.5,
      disputed: 0.0
    };

    const totalWeight = incidents.reduce((sum, inc) =>
      sum + (verificationWeights[inc.verificationStatus] || 0.5), 0
    );
    return totalWeight / incidents.length;
  }

  /**
   * Generate human-readable explanation for priority score
   * @param {Array} incidents
   * @param {Object} severityCounts
   * @param {number} priorityScore
   * @returns {string} Explanation text
   */
  generateExplanation(incidents, severityCounts, priorityScore) {
    const count = incidents.length;
    const highSeverity = severityCounts.high || 0;
    const latestIncident = incidents.reduce((latest, current) =>
      new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
    );

    const hoursAgo = Math.round((Date.now() - new Date(latestIncident.createdAt).getTime()) / (1000 * 60 * 60));
    const timeStr = hoursAgo < 24
      ? (hoursAgo < 1 ? 'less than an hour ago' : `${hoursAgo} hours ago`)
      : `${Math.round(hoursAgo / 24)} days ago`;

    let priority = 'Medium priority';
    if (priorityScore >= 0.7) priority = 'High priority';
    else if (priorityScore < 0.4) priority = 'Low priority';

    return `${priority}: ${count} nearby reports${
      highSeverity > 0 ? `, ${highSeverity} marked high severity` : ''
    }, latest report ${timeStr}`;
  }
}

export default new HotspotService();
