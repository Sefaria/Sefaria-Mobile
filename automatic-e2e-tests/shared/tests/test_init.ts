/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Test Logging and Error Handling Initialization
 * 
 * DESCRIPTION:
 *  - Sets up logging so that all console output (log, error, warn) is written to a timestamped file in logs-test/.
 *  - Ensures logs-test directory exists and creates a unique log file for each test run.
 *  - Captures and logs uncaught exceptions and unhandled promise rejections for better debugging.
 * USAGE:
 *  - Import this file at the top of your test entry point (e.g., e2e.spec.ts) to enable logging and error capture.
 * ──────────────────────────────────────────────────────────────
 */

import * as fs from 'fs';
import * as path from 'path';

// Prevent multiple initializations
const GLOBAL_KEY = '__TEST_LOGGING_INITIALIZED__';
if (!(global as any)[GLOBAL_KEY]) {
  (global as any)[GLOBAL_KEY] = true;
  
  // Detect current platform from environment variable
  const PLATFORM = process.env.PLATFORM || 'android';
  
  // Determine platform-specific logs directory
  let logsDir = path.resolve(__dirname, `../../logs/${PLATFORM}`);
  
  // Ensure the logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.debug(`Created logs directory: ${logsDir}`);
  }
  
  // Create a unique log file name with current date and time
  const now = new Date();
  const dateStr = now.toISOString().replace(/:/g, '-').replace(/\..+/, '').replace('T', '_');
  const logFilePath = path.join(logsDir, `test-run-${PLATFORM}-${dateStr}.log`);
  fs.writeFileSync(logFilePath, ''); // Clear contents or create file
  const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
  
  const origLog = console.log;
  const origError = console.error;
  const origDebug = console.debug;
  
  console.log = (...args: any[]) => {
    origLog(...args);
    logStream.write(args.map(String).join(' ') + '\n');
  };
  console.error = (...args: any[]) => {
    origError(...args);
    logStream.write('[ERROR] ' + args.map(String).join(' ') + '\n');
  };
  
  console.debug = (...args: any[]) => {
    origDebug(...args);
    logStream.write('[DEBUG] ' + args.map(String).join(' ') + '\n');
  };

  console.debug(`Test logging initialized. Log file: ${logFilePath}`);
}