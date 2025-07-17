const fs = require('fs');
const path = require('path');

// Whitelist of allowed directories to clean (relative to script location)
const ALLOWED_DIRECTORIES = ['logs-test', 'diff-images'];

/**
 * Validates if a directory is safe to clean
 * @param {string} dirPath - Path to validate
 * @returns {boolean} - True if safe to clean
 */
function isSafeToClean(dirPath) {
  // Only allow specific whitelisted directories
  if (!ALLOWED_DIRECTORIES.includes(dirPath)) {
    console.error(`❌ Directory "${dirPath}" is not in the whitelist of safe directories`);
    console.error(`✅ Allowed directories: ${ALLOWED_DIRECTORIES.join(', ')}`);
    return false;
  }

  // Prevent cleaning parent directories or absolute paths
  if (dirPath.includes('..') || path.isAbsolute(dirPath)) {
    console.error(`❌ Invalid path: "${dirPath}". Only relative paths within project are allowed`);
    return false;
  }

  // Ensure we're only cleaning within the project directory
  const fullPath = path.resolve(__dirname, dirPath);
  const projectRoot = path.resolve(__dirname);
  
  if (!fullPath.startsWith(projectRoot)) {
    console.error(`❌ Path "${dirPath}" is outside the project directory`);
    return false;
  }

  return true;
}

/**
 * Removes all files from a directory (with safety checks)
 * @param {string} dirPath - Path to the directory to clean
 */
function cleanDirectory(dirPath) {
  // Safety check first
  if (!isSafeToClean(dirPath)) {
    return;
  }

  const fullPath = path.resolve(__dirname, dirPath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ Directory ${dirPath} does not exist`);
    return;
  }

  try {
    const files = fs.readdirSync(fullPath);
    
    if (files.length === 0) {
      console.log(`✅ Directory ${dirPath} is already empty`);
      return;
    }

    let filesRemoved = 0;
    files.forEach(file => {
      const filePath = path.join(fullPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile()) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Removed: ${file}`);
        filesRemoved++;
      } else {
        console.log(`⏭️ Skipped directory: ${file}`);
      }
    });
    
    console.log(`✅ Cleaned ${dirPath} directory (${filesRemoved} files removed)`);
  } catch (error) {
    console.error(`❌ Error cleaning ${dirPath}:`, error.message);
  }
}

console.log('🧹 Cleaning up test artifacts...\n');
console.log(`📁 Project directory: ${__dirname}`);
console.log(`🔒 Allowed directories: ${ALLOWED_DIRECTORIES.join(', ')}\n`);

// Clean only the whitelisted directories
ALLOWED_DIRECTORIES.forEach(dir => {
  cleanDirectory(dir);
});

console.log('\n🎉 Cleanup complete!');