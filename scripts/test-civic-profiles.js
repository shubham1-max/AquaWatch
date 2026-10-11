import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getWardDetailsForIncident, getDefaultWardData, getWardGroups } from '../frontend/src/utils/wardData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wardsPath = path.resolve(__dirname, '../frontend/src/data/bangalore-wards.json');
const bangaloreWards = JSON.parse(fs.readFileSync(wardsPath, 'utf8'));

console.log('Testing Civic Profiles and Authentic Official Contacts...');

// 1. Test fallback/default ward data
const defaultData = getDefaultWardData();
assert.ok(defaultData.agencyProfile, 'agencyProfile should exist in default data');
assert.ok(defaultData.commissionerProfile, 'commissionerProfile should exist in default data');
assert.ok(defaultData.acProfile, 'acProfile should exist in default data');
assert.ok(defaultData.aeeProfile, 'aeeProfile should exist in default data');
assert.ok(defaultData.jhiProfile, 'jhiProfile should exist in default data');
assert.ok(defaultData.corporatorProfile, 'corporatorProfile should exist in default data');
assert.ok(defaultData.mlaProfile, 'mlaProfile should exist in default data');
assert.ok(defaultData.mpProfile, 'mpProfile should exist in default data');

// 2. Test dynamic lookup for an incident in Central Bengaluru (e.g., Shivajinagar / Shantinagar / Koramangala)
// Lat 12.9352, Lng 77.6245 (Koramangala / BTM)
const incidentKoramangala = {
  location: {
    coordinates: [77.6245, 12.9352]
  }
};
const resultKoramangala = getWardDetailsForIncident(incidentKoramangala, bangaloreWards);
assert.ok(resultKoramangala, 'Result should exist for Koramangala coordinates');
assert.ok(resultKoramangala.agencyProfile, 'agencyProfile should exist');
assert.strictEqual(resultKoramangala.agencyProfile.tag, 'BWSSB / BSWML');
assert.ok(resultKoramangala.agencyProfile.actions.length >= 4, 'Should contain WhatsApp Sahaaya, BWSSB, Email and Helplines');
assert.ok(resultKoramangala.mla.name, 'Real MLA name should be present');
assert.ok(resultKoramangala.mla.phone, 'MLA phone should be present');
assert.ok(resultKoramangala.mp.name, 'Real MP name should be present');
assert.ok(resultKoramangala.mp.phone, 'MP phone should be present');

// 3. Test dynamic lookup for Whitefield / Mahadevapura
// Lat 12.9698, Lng 77.7500
const incidentMahadevapura = {
  location: {
    coordinates: [77.7500, 12.9698]
  }
};
const resultMahadevapura = getWardDetailsForIncident(incidentMahadevapura, bangaloreWards);
assert.ok(resultMahadevapura.zone, 'Zone should be resolved');
assert.ok(resultMahadevapura.acProfile.subtitle.length > 0, 'Joint Commissioner IAS/KAS name should be included');

// 4. Test real-time Ward Groups: Empty wards must report 0, never fake counts or fake status
const emptyWardGroups = getWardGroups([], bangaloreWards);
assert.ok(emptyWardGroups.length > 0, 'Should return all BBMP wards');
const doddaBidarakallu = emptyWardGroups.find(w => w.wardId === '26' || w.wardName.includes('Bidarakallu'));
assert.ok(doddaBidarakallu, 'Dodda Bidarakallu Ward should exist in GeoJSON');
assert.strictEqual(doddaBidarakallu.totalReports, 0, 'Dodda Bidarakallu must have 0 total reports when no incidents exist');
assert.strictEqual(doddaBidarakallu.unresolvedReports, 0, 'Dodda Bidarakallu must have 0 unresolved reports');
assert.strictEqual(doddaBidarakallu.incidents.length, 0, 'Incidents array must be empty');

console.log('✓ All civic profiles, ward groupings, and 0-report assertions passed successfully!');
