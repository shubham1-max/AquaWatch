/**
 * Database Migration Script
 * Run: node scripts/migrate.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Incident from '../models/Incident.js';
import { backfillIncidentWards } from '../utils/wardLookup.js';

dotenv.config();

const migrate = async () => {
  try {
    console.log('🔄 Starting database migration...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Migration 1: Create indexes
    console.log('📊 Creating indexes...');
    await Incident.createIndexes();
    console.log('✅ Indexes created\n');

    // Migration 2: Backfill ward data
    console.log('🗺️  Backfilling ward assignments...');
    const updated = await backfillIncidentWards();
    console.log(`✅ Updated ${updated} incidents with ward data\n`);

    // Migration 3: Add any new fields with default values
    console.log('🔧 Updating schema fields...');
    await Incident.updateMany(
      { sourceType: { $exists: false } },
      { $set: { sourceType: 'user' } }
    );
    console.log('✅ Schema fields updated\n');

    // Migration 4: Clean up invalid data
    console.log('🧹 Cleaning up invalid data...');
    const invalidIncidents = await Incident.find({
      $or: [
        { 'location.coordinates.0': { $lt: -180 } },
        { 'location.coordinates.0': { $gt: 180 } },
        { 'location.coordinates.1': { $lt: -90 } },
        { 'location.coordinates.1': { $gt: 90 } }
      ]
    });
    if (invalidIncidents.length > 0) {
      console.log(`⚠️  Found ${invalidIncidents.length} incidents with invalid coordinates`);
      console.log('   Manual review required');
    } else {
      console.log('✅ No invalid data found\n');
    }

    // Display migration summary
    const totalIncidents = await Incident.countDocuments();
    const byStatus = await Incident.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    console.log('\n📈 Migration Summary:');
    console.log('─────────────────────────────');
    console.log(`Total incidents: ${totalIncidents}`);
    console.log('Incidents by status:');
    byStatus.forEach(({ _id, count }) => {
      console.log(`  ${_id}: ${count}`);
    });

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
};

migrate();
