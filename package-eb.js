import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isBackendOnly = process.argv.includes('--backend-only');
const zipFileName = isBackendOnly ? 'aquawatch-backend-eb.zip' : 'aquawatch-elasticbeanstalk.zip';
const outputPath = path.join(__dirname, zipFileName);

console.log('═══════════════════════════════════════════════════════════════');
console.log(`🚀 Packaging AquaWatch for AWS Elastic Beanstalk`);
console.log(`   Mode: ${isBackendOnly ? 'Backend API Only' : 'Unified (Frontend + Backend)'}`);
console.log('═══════════════════════════════════════════════════════════════\n');

// 1. Build frontend if unified mode
if (!isBackendOnly) {
  console.log('📦 Step 1: Checking frontend build...');
  const frontendDir = path.join(__dirname, 'frontend');
  const distDir = path.join(frontendDir, 'dist');

  if (!fs.existsSync(distDir) || process.argv.includes('--rebuild')) {
    console.log('   Running "npm run build" in frontend...');
    execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });
  } else {
    console.log('   Using existing frontend/dist build.');
  }
}

// 2. Initialize ZIP
const zip = new AdmZip();

// Helper to add directory recursively
function addDirectory(srcDir, zipPrefix) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(srcDir, entry.name);
    const zipPath = zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'coverage') continue;
      addDirectory(fullPath, zipPath);
    } else {
      if (entry.name.endsWith('.log') || entry.name === '.DS_Store' || entry.name === 'Thumbs.db') continue;
      zip.addLocalFile(fullPath, zipPrefix);
    }
  }
}

console.log('📦 Step 2: Assembling backend files...');
const backendDir = path.join(__dirname, 'backend');

// Core files
const coreFiles = ['server.js', 'package.json', 'package-lock.json', 'Procfile', 'openapi.json'];
for (const file of coreFiles) {
  const filePath = path.join(backendDir, file);
  if (fs.existsSync(filePath)) {
    zip.addLocalFile(filePath);
    console.log(`   + ${file}`);
  }
}

// Core directories
const coreDirs = ['config', 'middleware', 'models', 'routes', 'services', 'utils', '.ebextensions', '.platform'];
for (const dir of coreDirs) {
  const dirPath = path.join(backendDir, dir);
  if (fs.existsSync(dirPath)) {
    addDirectory(dirPath, dir);
    console.log(`   + ${dir}/`);
  }
}

// Bundle real uploaded incident photos so they exist on Elastic Beanstalk
const uploadsDir = path.join(backendDir, 'uploads');
if (fs.existsSync(uploadsDir)) {
  addDirectory(uploadsDir, 'uploads');
  console.log('   + uploads/ (packaged real incident photos)');
} else {
  zip.addFile('uploads/.gitkeep', Buffer.from(''));
  console.log('   + uploads/ (empty)');
}

// 3. Add static frontend to public/ if unified mode
if (!isBackendOnly) {
  console.log('📦 Step 3: Bundling frontend into public/ directory...');
  const distDir = path.join(__dirname, 'frontend', 'dist');
  if (fs.existsSync(distDir)) {
    addDirectory(distDir, 'public');
    console.log('   + public/ (static frontend assets)');
  } else {
    console.warn('   ⚠️ Warning: frontend/dist not found, proceeding without static frontend.');
  }
}

// 4. Write zip
console.log(`\n💾 Step 4: Writing deployment bundle to ${zipFileName}...`);
if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
}
zip.writeZip(outputPath);

const stats = fs.statSync(outputPath);
const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

console.log('\n✅ Deployment bundle created successfully!');
console.log(`   File: ${outputPath}`);
console.log(`   Size: ${sizeMb} MB`);
console.log('\nReady to deploy to AWS Elastic Beanstalk:');
console.log('1. Go to AWS Elastic Beanstalk Console: https://console.aws.amazon.com/elasticbeanstalk/');
console.log('2. Click "Create application" or select existing environment');
console.log('3. Platform: Node.js (Node.js 18 or 20, Amazon Linux 2023)');
console.log(`4. Application code: Choose "Upload your code" and upload: ${zipFileName}`);
console.log('5. Configure Environment Variables (MONGODB_URI, etc.)');
console.log('6. Click Deploy!\n');
