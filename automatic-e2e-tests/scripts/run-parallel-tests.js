const spawn = require('cross-spawn').spawn;
const path = require('path');
const fs = require('fs');

const devicesPath = path.resolve(__dirname, '../devices.json');
const devicesConfig = JSON.parse(fs.readFileSync(devicesPath, 'utf8'));

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

// Run tests for each device in parallel
const PLATFORM = process.env.PLATFORM || 'android';
let devices;
if (PLATFORM === 'ios') {
  devices = devicesConfig.devices.filter(d => d.platform === 'ios');
} else {
  devices = devicesConfig.devices.filter(d => d.platform === 'android');
}

const results = [];
let finishedCount = 0;

devices.forEach(device => {
  const logFile = path.resolve(__dirname, `../logs/${PLATFORM}/verbose-${PLATFORM}-${device.name}-${timestamp}.log`);
  const env = Object.assign({}, process.env, {
    PLATFORM: PLATFORM,
    RUN_ENV: 'browserstack',
    DEVICE_NAME: device.name,
    BS_DEVICE: device.browserstack.device,
    BS_OS_VERSION: device.browserstack.os_version,
    LOG_FILE: logFile
  });

  // Allow overriding which spec to run via the SPEC env var (e.g., "tests/sanity.spec.ts")
  // Or provide a MOCHA_CONFIG env var to use a dedicated mocha config (e.g., .mocharc.sanity.json)
  const mochaArgs = ['--require', 'ts-node/register', '--extensions', 'ts', '--timeout', '300000'];
  if (process.env.MOCHA_CONFIG) {
    mochaArgs.push('--config', process.env.MOCHA_CONFIG);
  } else if (process.env.SPEC) {
    mochaArgs.push('--spec', process.env.SPEC, '--no-recursive');
  } else {
    mochaArgs.push('tests/*.spec.ts');
  }

  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const proc = spawn(npxCmd, ['mocha', ...mochaArgs], {
    env,
    stdio: ['ignore', fs.openSync(logFile, 'w'), fs.openSync(logFile, 'w')]
  });

  proc.on('close', code => {
    console.log(`\n${device.name} finished with code ${code}`);
    // Default failures empty
    let failures = [];

    if (code !== 0) {
      try {
        const logContent = fs.readFileSync(logFile, 'utf8');
        // Try to find Mocha-style failure headings like "1) Suite should do X"
        const failRegex = /^\s*\d+\)\s*(.+)$/gm;
        let m;
        while ((m = failRegex.exec(logContent)) !== null) {
          failures.push(m[1].trim());
        }

        if (failures.length) {
          console.log(`\n${device.name} failed:`);
          failures.forEach(f => console.log(`- ${f}`));
        } else {
          // Fallback: show last lines of the log to help identify the error
          const tail = logContent.split('\n').slice(-60).join('\n');
          console.log(`\n${device.name} failed but specific test names could not be parsed from the log.`);
          console.log('--- Log tail (last 60 lines) ---');
          console.log(tail);
          console.log('--- End log tail ---');
        }
      } catch (err) {
        console.log(`Could not read log file ${logFile} to determine failing tests: ${err.message}`);
      }
    }

    results.push({ device: device.name, code, failures });
    finishedCount++;
    if (finishedCount === devices.length) {
      // All done, print summary
      const failed = results.filter(r => r.code !== 0);
      if (failed.length) {
        console.log('\nFAILED DEVICES:');
        failed.forEach(r => console.log(`- ${r.device} (exit code ${r.code})`));
      } else {
        console.log('\nAll devices passed!');
      }
    }
  });
});