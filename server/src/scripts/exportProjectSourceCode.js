import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = path.resolve('d:/designer/E-COMMERCE WEBSITE');
const exportDir = path.resolve('d:/designer');
const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const zipFileName = `PRINT_BAZZAR_COMPLETE_SOURCE_CODE_${timestamp}.zip`;
const targetZipPath = path.join(exportDir, zipFileName);
const stagingDir = path.join(exportDir, `_staging_${Date.now()}`);

console.log('====================================================');
console.log('📦 PRINT BAZZAR: CLEAN SOURCE CODE EXPORT ENGINE');
console.log('====================================================\n');

// Excluded directories and file patterns
const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'dist-ssr',
  'build',
  '.idea',
  '.vscode'
]);

function shouldIncludeFile(relPath) {
  const normalized = relPath.replace(/\\/g, '/');

  // Exclude real live environment files (Keep .env.example)
  if (normalized.endsWith('/.env') || normalized === '.env' || (normalized.includes('/.env.') && !normalized.endsWith('.env.example'))) {
    return false;
  }

  // Exclude database dumps containing live customer records
  if (normalized.startsWith('server/backups/') && !normalized.endsWith('.gitkeep')) {
    return false;
  }

  // Exclude local uploaded files (preserve folder with .gitkeep)
  if (normalized.startsWith('server/uploads/') && !normalized.endsWith('.gitkeep')) {
    return false;
  }

  // Exclude SQLite dev DBs
  if (normalized.endsWith('.db') || normalized.endsWith('.db-journal')) {
    return false;
  }

  return true;
}

let copiedCount = 0;
let totalBytes = 0;

function copyCleanFiles(src, dest, relBase = '') {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const items = fs.readdirSync(src);
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const relPath = relBase ? `${relBase}/${item}` : item;

    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      if (EXCLUDE_DIRS.has(item)) {
        continue;
      }
      copyCleanFiles(srcPath, destPath, relPath);
    } else {
      if (shouldIncludeFile(relPath)) {
        fs.copyFileSync(srcPath, destPath);
        copiedCount++;
        totalBytes += stat.size;
      }
    }
  }
}

try {
  console.log('1. Preparing clean staging workspace...');
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(stagingDir, { recursive: true });

  console.log('2. Aggregating project source files (excluding node_modules & secrets)...');
  copyCleanFiles(rootDir, stagingDir);
  console.log(`   ✔ Collected ${copiedCount} files (${(totalBytes / (1024 * 1024)).toFixed(2)} MB)`);

  console.log('\n3. Compressing into clean production ZIP archive...');
  console.log(`   Destination: ${targetZipPath}`);

  // Use PowerShell Compress-Archive for standard Windows compatibility
  const psCommand = `powershell -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${targetZipPath}' -Force"`;
  execSync(psCommand, { stdio: 'inherit' });

  // Clean up staging directory
  fs.rmSync(stagingDir, { recursive: true, force: true });

  const zipStat = fs.statSync(targetZipPath);
  console.log('\n4. Verifying Exported Archive:');
  console.log(`   ✔ Archive Name: ${zipFileName}`);
  console.log(`   ✔ Archive Size: ${(zipStat.size / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`   ✔ Exact Path:   ${targetZipPath}`);

  console.log('\n====================================================');
  console.log('🎉 SOURCE CODE BACKUP GENERATED & VERIFIED SUCCESSFULLY!');
  console.log('====================================================');
} catch (error) {
  console.error('\n❌ Export failed:', error);
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  process.exit(1);
}
