import assert from 'node:assert';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import Incident from '../backend/models/Incident.js';
import incidentRoutes from '../backend/routes/incidents.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Testing Situation Photo Verification Update Requirement...');

// Build lightweight isolated Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/incidents', incidentRoutes);

// Global test dummy incident ID (valid 24-char ObjectId)
const testId = '507f1f77bcf86cd799439011';

// Prepare a mock 1x1 valid PNG buffer and JPEG buffer
const validPngBuffer = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex');
const validJpgBuffer = Buffer.from('ffd8ffe000104a46494600010101006000600000ffd9', 'hex');

// Mock Incident.findByIdAndUpdate
let lastUpdateCall = null;
Incident.findByIdAndUpdate = async (id, updateData) => {
  lastUpdateCall = { id, updateData };
  return {
    _id: id,
    issueType: 'waterlogging',
    severity: 'high',
    status: updateData.status || 'reported',
    verificationStatus: updateData.verificationStatus || 'unverified',
    evidenceUrl: updateData.evidenceUrl || null,
    resolutionNote: updateData.resolutionNote || null
  };
};

// Start temporary local HTTP server
const server = http.createServer(app);

async function runTests() {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Citizen updating status to "resolved" without photo -> MUST FAIL with 400
    const formNoPhoto = new FormData();
    formNoPhoto.append('status', 'resolved');

    const resNoPhoto = await fetch(`${baseUrl}/api/incidents/${testId}`, {
      method: 'PATCH',
      body: formNoPhoto
    });
    const dataNoPhoto = await resNoPhoto.json();

    assert.strictEqual(resNoPhoto.status, 400, 'Should reject status update without photo with 400');
    assert.strictEqual(dataNoPhoto.success, false);
    assert.ok(
      dataNoPhoto.message.includes('Uploading a new photo of the situation is required'),
      'Should mention photo requirement in error message'
    );
    console.log('✓ Rejection without photo verified (400 Bad Request)');

    // 2. Citizen updating status with non-image file -> MUST FAIL with 400
    const formBadFile = new FormData();
    formBadFile.append('status', 'resolved');
    formBadFile.append('photo', new Blob(['not an image content'], { type: 'text/plain' }), 'fake.txt');

    const resBadFile = await fetch(`${baseUrl}/api/incidents/${testId}`, {
      method: 'PATCH',
      body: formBadFile
    });
    assert.strictEqual(resBadFile.status, 400, 'Should reject non-image file with 400');
    console.log('✓ Rejection of invalid non-image file verified (400 Bad Request)');

    // 3. Citizen updating status to "in_progress" with valid JPEG photo -> MUST SUCCEED
    const formInProgress = new FormData();
    formInProgress.append('status', 'in_progress');
    formInProgress.append('resolutionNote', 'BBMP suction team on site');
    formInProgress.append('photo', new Blob([validJpgBuffer], { type: 'image/jpeg' }), 'proof.jpg');

    const resInProgress = await fetch(`${baseUrl}/api/incidents/${testId}`, {
      method: 'PATCH',
      body: formInProgress
    });
    const dataInProgress = await resInProgress.json();

    assert.strictEqual(resInProgress.status, 200, 'Should accept valid in_progress update with photo');
    assert.strictEqual(dataInProgress.success, true);
    assert.strictEqual(dataInProgress.data.status, 'in_progress');
    assert.ok(dataInProgress.data.evidenceUrl.startsWith('/uploads/'));
    assert.strictEqual(lastUpdateCall.updateData.status, 'in_progress');
    assert.strictEqual(lastUpdateCall.updateData.resolutionNote, 'BBMP suction team on site');
    console.log('✓ Citizen status transition to IN_PROGRESS with photo evidence verified');

    // 4. Citizen updating status to "resolved" with valid PNG photo -> MUST SUCCEED and mark verified
    const formResolved = new FormData();
    formResolved.append('status', 'resolved');
    formResolved.append('resolutionNote', 'Drain cleared and street dry');
    formResolved.append('photo', new Blob([validPngBuffer], { type: 'image/png' }), 'proof.png');

    const resResolved = await fetch(`${baseUrl}/api/incidents/${testId}`, {
      method: 'PATCH',
      body: formResolved
    });
    const dataResolved = await resResolved.json();

    assert.strictEqual(resResolved.status, 200, 'Should accept valid resolved update with photo');
    assert.strictEqual(dataResolved.success, true);
    assert.strictEqual(dataResolved.data.status, 'resolved');
    assert.strictEqual(dataResolved.data.verificationStatus, 'verified');
    assert.ok(dataResolved.data.evidenceUrl.startsWith('/uploads/'));
    console.log('✓ Citizen status transition to RESOLVED with photo evidence verified');

    // 5. Admin updating directly with API key without photo -> MUST SUCCEED
    const resAdmin = await fetch(`${baseUrl}/api/incidents/${testId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'aquawatch_admin'
      },
      body: JSON.stringify({ status: 'under_review' })
    });
    const dataAdmin = await resAdmin.json();

    assert.strictEqual(resAdmin.status, 200, 'Admin should be permitted to update without photo');
    assert.strictEqual(dataAdmin.data.status, 'under_review');
    console.log('✓ Admin key authorization override verified');

    console.log('\nAll 5 situation photo verification tests passed successfully!');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('Test failed:', err);
  server.close();
  process.exit(1);
});
