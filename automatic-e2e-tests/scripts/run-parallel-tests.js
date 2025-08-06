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

const processes = devices.map(device => {
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
    'shared/tests/*.spec.ts',
    '--timeout', '300000'
  ];

  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const proc = spawn(npxCmd, ['mocha', ...mochaArgs], {
    env,
    stdio: ['ignore', fs.openSync(logFile, 'w'), fs.openSync(logFile, 'w')]
  });

  proc.on('close', code => {
    console.log(`${device.name} finished with code ${code}`);
  });

  return proc;
});
