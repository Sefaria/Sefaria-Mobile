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

// Ensure the logs-test directory exists
const logsDir = path.resolve(__dirname, '../../logs-test');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create a unique log file name with current date and time
const now = new Date();
const dateStr = now.toISOString().replace(/:/g, '-').replace(/\..+/, '').replace('T', '_');
const logFilePath = path.join(logsDir, `test-run-${dateStr}.log`);
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


// Log uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.stack || err);
});
process.on('unhandledRejection', (reason: any) => {
  console.error('[UNHANDLED REJECTION]', reason && reason.stack ? reason.stack : reason);
});