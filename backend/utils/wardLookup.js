import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Incident from '../models/Incident.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let wardsGeoData = null;

function loadWardsGeo() {
  if (wardsGeoData) return wardsGeoData;
  const candidatePaths = [
    path.join(__dirname, '../data/bangalore-wards.json'),
    path.join(__dirname, '../../frontend/src/data/bangalore-wards.json'),
    path.join(process.cwd(), 'frontend/src/data/bangalore-wards.json'),
    path.join(process.cwd(), '../frontend/src/data/bangalore-wards.json')
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        wardsGeoData = JSON.parse(fs.readFileSync(p, 'utf8'));
        console.log(`✅ Loaded ward boundaries from: ${p}`);
        return wardsGeoData;
      } catch (err) {
        console.error(`Failed to load wards GeoJSON from ${p}:`, err.message);
      }
    }
  }

  // CRITICAL: Fail fast if ward data cannot be loaded
  console.error('❌ CRITICAL ERROR: Ward boundary data (bangalore-wards.json) not found!');
  console.error('Searched paths:', candidatePaths);
  console.error('Ward assignment will fail for all incidents.');
  throw new Error('Required ward boundary data file not found. Application cannot start without it.');
}

function pointInPolygon(point, vs) {
  const x = point[0]; // lng
  const y = point[1]; // lat
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0];
    const yi = vs[i][1];
    const xj = vs[j][0];
    const yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function isInsideFeature(lng, lat, feature) {
  if (!feature.geometry) return false;
  const geomType = feature.geometry.type;
  const coords = feature.geometry.coordinates;

  if (geomType === 'Polygon') {
    return pointInPolygon([lng, lat], coords[0]);
  } else if (geomType === 'MultiPolygon') {
    for (const poly of coords) {
      if (pointInPolygon([lng, lat], poly[0])) return true;
    }
  }
  return false;
}

/**
 * Resolve [lng, lat] coordinates to BBMP Ward details
 */
export function getWardForCoordinates(lng, lat) {
  const geoJson = loadWardsGeo();
  if (!geoJson || !geoJson.features) {
    return { wardName: 'Bengaluru Ward', wardId: '1' };
  }

  // Point in polygon match
  let matchedFeature = null;
  for (const feature of geoJson.features) {
    if (isInsideFeature(lng, lat, feature)) {
      matchedFeature = feature;
      break;
    }
  }

  // Fallback to nearest ward by Euclidean distance
  if (!matchedFeature && geoJson.features.length > 0) {
    let minDist = Infinity;
    for (const feature of geoJson.features) {
      if (feature.geometry && feature.geometry.coordinates) {
        const ring = feature.geometry.type === 'Polygon'
          ? feature.geometry.coordinates[0]
          : (feature.geometry.coordinates[0]?.[0] || []);
        if (ring && ring.length > 0) {
          const pt = ring[0];
          const dist = Math.hypot(lng - pt[0], lat - pt[1]);
          if (dist < minDist) {
            minDist = dist;
            matchedFeature = feature;
          }
        }
      }
    }
  }

  if (matchedFeature) {
    const props = matchedFeature.properties || {};
    const wardName = props.name_en || props.proposed_ward_name_en || 'Bengaluru Ward';
    const wardId = props.id ? props.id.toString() : '1';
    const assemblyName = props.assembly_constituency_name_en || '';
    return { wardName, wardId, assemblyName };
  }

  return { wardName: 'Bengaluru Ward', wardId: '1' };
}

/**
 * Backfill any existing MongoDB incidents that do not have ward or wardId populated
 */
export async function backfillIncidentWards() {
  try {
    const unassigned = await Incident.find({
      $or: [
        { ward: { $exists: false } },
        { ward: null },
        { ward: '' },
        { wardId: { $exists: false } },
        { wardId: null }
      ]
    });

    if (unassigned.length === 0) return 0;

    let updatedCount = 0;
    for (const inc of unassigned) {
      if (inc.location && inc.location.coordinates && inc.location.coordinates.length >= 2) {
        const [lng, lat] = inc.location.coordinates;
        const resolved = getWardForCoordinates(lng, lat);
        inc.ward = resolved.wardName;
        inc.wardId = resolved.wardId;
        await inc.save();
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      console.log(`✅ Backfilled ward assignments for ${updatedCount} incidents from MongoDB`);
    }
    return updatedCount;
  } catch (err) {
    console.error('Error backfilling incident wards:', err.message);
    return 0;
  }
}
