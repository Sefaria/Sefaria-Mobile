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

  const mochaArgs = [
    '--require', 'ts-node/register',
    '--extensions', 'ts',
    'tests/*.spec.ts',
    '--timeout', '300000'
  ];

  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const proc = spawn(npxCmd, ['mocha', ...mochaArgs], {
    env,
    stdio: ['ignore', fs.openSync(logFile, 'w'), fs.openSync(logFile, 'w')]
  });

  proc.on('close', code => {
    console.log(`${device.name} finished with code ${code}`);
    results.push({ device: device.name, code });
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