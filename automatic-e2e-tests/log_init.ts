/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Test Logging and Error Handling Initialization
 * 
 * DESCRIPTION:
 *  - Sets up logging so that all console output (log, error, warn) is written to a timestamped file in logs/.
 *  - Ensures logs directory exists and creates a unique log file for each test run.
 *  - Captures and logs uncaught exceptions and unhandled promise rejections for better debugging.
 * USAGE:
 *  - Import this file at the top of your test entry point (e.g., regression.spec.ts) to enable logging and error capture.
 * ──────────────────────────────────────────────────────────────
 */

import * as fs from 'fs';
import * as path from 'path';

// Prevent multiple initializations
const GLOBAL_KEY = '__TEST_LOGGING_INITIALIZED__';
if (!(global as any)[GLOBAL_KEY]) {
  (global as any)[GLOBAL_KEY] = true;
  
  // Detect current platform and device name from environment variables
  const PLATFORM = process.env.PLATFORM || 'android';
  const DEVICE_NAME = process.env.DEVICE_NAME || '';
  // Determine platform-specific logs directory
  let logsDir = path.resolve(__dirname, `./logs/${PLATFORM}`);
  // Ensure the logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.debug(`Created logs directory: ${logsDir}`);
  }
  // Create a unique log file name with current date and time, and device name if available
  const now = new Date();
  const dateStr = now.toISOString().replace(/:/g, '-').replace(/\..+/, '').replace('T', '_');
  const pid = process.pid;
  const cleanLogFileName = DEVICE_NAME
    ? `clean-${PLATFORM}-${DEVICE_NAME}-${dateStr}-${pid}.log`
    : `clean-${PLATFORM}-${dateStr}-${pid}.log`;
  const cleanLogFilePath = path.join(logsDir, cleanLogFileName);
  fs.writeFileSync(cleanLogFilePath, ''); // Clear contents or create file
  const cleanLogStream = fs.createWriteStream(cleanLogFilePath, { flags: 'a' });

  const origLog = console.log;
  const origError = console.error;
  const origDebug = console.debug;

  // catch and convert our logs, errors, and debugs to a clean format
  console.log = (...args: any[]) => {
    origLog(...args);
    cleanLogStream.write(args.map(String).join(' ') + '\n');
  };
  console.error = (...args: any[]) => {
    origError(...args);
    cleanLogStream.write('[ERROR] ' + args.map(String).join(' ') + '\n');
  };

  console.debug = (...args: any[]) => {
    origDebug(...args);
    cleanLogStream.write('[DEBUG] ' + args.map(String).join(' ') + '\n');
  };

  console.debug(`Test logging initialized. Clean log file: ${cleanLogFilePath}`);
}