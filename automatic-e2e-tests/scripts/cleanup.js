const fs = require('fs');
const path = require('path');

// Get project root (one level up from scripts folder)
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Platform-specific directories to clean (relative to project root)
const PLATFORM_DIRECTORIES = {
  android: [
    'logs/android',
    'screenshots/android'
  ],
  ios: [
    'logs/ios',
    'screenshots/ios'
  ]
};

/**
 * Validates if a directory is safe to clean
 * @param {string} dirPath - Path to validate
 * @returns {boolean} - True if safe to clean
 */
function isSafeToClean(dirPath) {
  const allAllowedDirs = [
    ...Object.values(PLATFORM_DIRECTORIES).flat()
  ];

  if (!allAllowedDirs.includes(dirPath)) {
    console.error(`❌ Directory "${dirPath}" is not in the whitelist`);
    return false;
  }

  // Allow paths that are relative to project root
  const fullPath = path.resolve(PROJECT_ROOT, dirPath);
  if (!fullPath.startsWith(PROJECT_ROOT)) {
    console.error(`❌ Path "${dirPath}" is outside the project directory`);
    return false;
  }

  return true;
}

/**
 * Removes all files from a directory
 * @param {string} dirPath - Path to the directory to clean (relative to project root)
 */
function cleanDirectory(dirPath) {
  if (!isSafeToClean(dirPath)) {
    return;
  }

  // Resolve path relative to project root, not scripts folder
  const fullPath = path.resolve(PROJECT_ROOT, dirPath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`[INFO] Creating directory: ${dirPath}`);
    try {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✅ Created: ${dirPath}`);
    } catch (error) {
      console.error(`❌ Error creating ${dirPath}:`, error.message);
    }
    return;
  }

  try {
    const files = fs.readdirSync(fullPath);
    
    if (files.length === 0) {
      console.log(`[INFO] Directory ${dirPath} is already empty`);
      return;
    }

    let filesRemoved = 0;
    files.forEach(file => {
      const filePath = path.join(fullPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile()) {
        fs.unlinkSync(filePath);
        filesRemoved++;
      }
    });
    
    console.log(`[INFO] Cleaned ${dirPath} (${filesRemoved} files removed)`);
  } catch (error) {
    console.error(`❌ Error cleaning ${dirPath}:`, error.message);
  }
}

/**
 * Clean platform-specific directories
 * @param {string} platform - Platform to clean ('android' or 'ios')
 */
function cleanPlatform(platform) {
  if (!PLATFORM_DIRECTORIES[platform]) {
    console.error(`❌ Unknown platform: ${platform}`);
    console.log(`Available: ${Object.keys(PLATFORM_DIRECTORIES).join(', ')}`);
    return;
  }

  console.log(`[INFO] Cleaning ${platform.toUpperCase()} test artifacts...`);
  
  PLATFORM_DIRECTORIES[platform].forEach(dir => {
    cleanDirectory(dir);
  });
  
  console.log(`✅ ${platform.toUpperCase()} cleanup complete!`);
}

// Main execution
const platform = process.argv[2];

console.log('[INFO] Sefaria Mobile E2E Test Cleanup Script');
console.log(`Project directory: ${PROJECT_ROOT}`); // Fixed: show project root, not scripts dir

if (!platform) {
  console.error('❌ Platform required. Usage: node cleanup.js [android|ios]');
  process.exit(1);
}

cleanPlatform(platform.toLowerCase());
