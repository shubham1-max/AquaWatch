import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import Incident from '../models/Incident.js';

describe('Incident API Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    const testMongoUri = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/aquawatch_test';
    await mongoose.connect(testMongoUri);
  });

  afterAll(async () => {
    // Clean up and close connection
    await Incident.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear incidents before each test
    await Incident.deleteMany({});
  });

  describe('POST /api/incidents', () => {
    it('should create a new incident', async () => {
      const incidentData = {
        issueType: 'waterlogging',
        description: 'Heavy waterlogging on main road',
        latitude: 12.9716,
        longitude: 77.5946,
        severity: 'high'
      };

      const response = await request(app)
        .post('/api/incidents')
        .send(incidentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.issueType).toBe('waterlogging');
      expect(response.body.data.severity).toBe('high');
    });

    it('should reject invalid incident data', async () => {
      const invalidData = {
        issueType: 'invalid_type',
        description: 'Short',
        latitude: 200, // Invalid
        longitude: 77.5946
      };

      const response = await request(app)
        .post('/api/incidents')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should enforce rate limiting', async () => {
      const incidentData = {
        issueType: 'waterlogging',
        description: 'Test incident for rate limiting',
        latitude: 12.9716,
        longitude: 77.5946,
        severity: 'medium'
      };

      // Make 11 requests (limit is 10 per hour)
      for (let i = 0; i < 11; i++) {
        const response = await request(app)
          .post('/api/incidents')
          .send(incidentData);

        if (i < 10) {
          expect(response.status).toBe(201);
        } else {
          expect(response.status).toBe(429);
        }
      }
    });
  });

  describe('GET /api/incidents', () => {
    it('should return all incidents', async () => {
      // Create test incidents
      await Incident.create([
        {
          issueType: 'waterlogging',
          description: 'Test incident 1',
          location: { type: 'Point', coordinates: [77.5946, 12.9716] },
          severity: 'high'
        },
        {
          issueType: 'blocked_drain',
          description: 'Test incident 2',
          location: { type: 'Point', coordinates: [77.5950, 12.9720] },
          severity: 'medium'
        }
      ]);

      const response = await request(app)
        .get('/api/incidents')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter incidents by status', async () => {
      await Incident.create([
        {
          issueType: 'waterlogging',
          description: 'Reported incident',
          location: { type: 'Point', coordinates: [77.5946, 12.9716] },
          severity: 'high',
          status: 'reported'
        },
        {
          issueType: 'blocked_drain',
          description: 'Resolved incident',
          location: { type: 'Point', coordinates: [77.5950, 12.9720] },
          severity: 'medium',
          status: 'resolved'
        }
      ]);

      const response = await request(app)
        .get('/api/incidents?status=reported')
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('reported');
    });
  });

  describe('GET /api/incidents/:id', () => {
    it('should return a specific incident', async () => {
      const incident = await Incident.create({
        issueType: 'waterlogging',
        description: 'Test incident',
        location: { type: 'Point', coordinates: [77.5946, 12.9716] },
        severity: 'high'
      });

      const response = await request(app)
        .get(`/api/incidents/${incident._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(incident._id.toString());
    });

    it('should return 404 for non-existent incident', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/incidents/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/incidents/:id', () => {
    it('should update incident status with valid API key', async () => {
      const incident = await Incident.create({
        issueType: 'waterlogging',
        description: 'Test incident',
        location: { type: 'Point', coordinates: [77.5946, 12.9716] },
        severity: 'high',
        status: 'reported'
      });

      const response = await request(app)
        .patch(`/api/incidents/${incident._id}`)
        .set('x-api-key', process.env.ADMIN_API_KEY || 'test-api-key')
        .send({ status: 'in_progress' })
        .expect(200);

      expect(response.body.data.status).toBe('in_progress');
    });

    it('should reject update without API key', async () => {
      const incident = await Incident.create({
        issueType: 'waterlogging',
        description: 'Test incident',
        location: { type: 'Point', coordinates: [77.5946, 12.9716] },
        severity: 'high'
      });

      const response = await request(app)
        .patch(`/api/incidents/${incident._id}`)
        .send({ status: 'in_progress' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/incidents/:id', () => {
    it('should delete incident with valid API key', async () => {
      const incident = await Incident.create({
        issueType: 'waterlogging',
        description: 'Test incident',
        location: { type: 'Point', coordinates: [77.5946, 12.9716] },
        severity: 'high'
      });

      const response = await request(app)
        .delete(`/api/incidents/${incident._id}`)
        .set('x-api-key', process.env.ADMIN_API_KEY || 'test-api-key')
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deletion
      const deleted = await Incident.findById(incident._id);
      expect(deleted).toBeNull();
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.database).toBeDefined();
    });
  });
});
