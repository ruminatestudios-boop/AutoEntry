#!/usr/bin/env node
/**
 * Start frontend with API URL set to this machine's LAN IP so you can test on phone.
 * Usage: node scripts/dev-phone.js  (or npm run dev:phone from frontend)
 */
const { execSync, spawn } = require('child_process');
const path = require('path');

function getLocalIP() {
  try {
    if (process.platform === 'darwin') {
      return execSync('ipconfig getifaddr en0', { encoding: 'utf8' }).trim();
    }
    if (process.platform === 'linux') {
      const out = execSync("hostname -I 2>/dev/null | awk '{print $1}'", { encoding: 'utf8' });
      return out.trim();
    }
    if (process.platform === 'win32') {
      const out = execSync('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch \'Loopback\' } | Select-Object -First 1).IPAddress"', { encoding: 'utf8' });
      return out.trim();
    }
  } catch (_) {}
  return null;
}

const ip = getLocalIP() || '192.168.1.5';
const apiUrl = `http://${ip}:8000`;

console.log('');
console.log('Phone test mode – use these on your phone (same Wi‑Fi):');
console.log('  App:     http://' + ip + ':3000');
console.log('  Scan:    http://' + ip + ':3000/scan');
console.log('  Review:  http://' + ip + ':3000/review');
console.log('  Flow:    http://' + ip + ':3000/flow-1.html');
console.log('  Backend: http://' + ip + ':8000/health');
console.log('  Publish: http://' + ip + ':8001/health');
console.log('');

const env = { ...process.env, NEXT_PUBLIC_API_URL: apiUrl };
const child = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env,
  cwd: path.join(__dirname, '..'),
});
child.on('exit', (code) => process.exit(code != null ? code : 0));
