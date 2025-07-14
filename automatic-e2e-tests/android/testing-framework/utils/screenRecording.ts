import type { Browser } from 'webdriverio';

/**
 * Starts screen recording on the device.
 */
export async function startScreenRecording(client: Browser) {
  await client.startRecordingScreen();
}

/**
 * Stops screen recording and saves the video to a file.
 * @param filename The path to save the video file (e.g., './recordings/test.mp4')
 */
export async function stopScreenRecording(client: Browser, filename: string) {
  const base64Video = await client.stopRecordingScreen();
  const buffer = Buffer.from(base64Video, 'base64');
  const fs = await import('fs');
  fs.writeFileSync(filename, buffer);
}