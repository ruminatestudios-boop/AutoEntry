#!/usr/bin/env node
/**
 * Help test the app on your phone. Detects LAN IP and prints:
 * - Backend health URL
 * - Landing + scan URL
 * - Exact command to start frontend with that API URL
 * Run from repo root or auralink-ai/frontend.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

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
      const out = execSync('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch \\'Loopback\\' } | Select-Object -First 1).IPAddress"', { encoding: 'utf8' });
      return out.trim();
    }
  } catch (_) {}
  return null;
}

const ip = getLocalIP() || '192.168.1.5';
const apiUrl = `http://${ip}:8000`;
const landingUrl = `http://${ip}:3000/landing.html?mode=scan`;
const healthUrl = `http://${ip}:8000/health`;

console.log('');
console.log('========================================');
console.log('  AuraLink – phone test');
console.log('========================================');
console.log('');
console.log('Using IP:', ip);
console.log('');
console.log('1) Start backend (other terminal):');
console.log('   cd auralink-ai/backend');
console.log('   source .venv/bin/activate');
console.log('   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000');
console.log('');
console.log('2) On phone, check backend:');
console.log('   ', healthUrl);
console.log('');
console.log('3) Start frontend (this terminal):');
console.log('   cd auralink-ai/frontend');
console.log('   NEXT_PUBLIC_API_URL=' + apiUrl + ' npm run dev');
console.log('');
console.log('4) On phone, open:');
console.log('   ', landingUrl);
console.log('');
console.log('========================================');
console.log('');

// Optionally run inject so landing.html has the right URL
const landingPath = path.join(__dirname, 'public/landing.html');
if (fs.existsSync(landingPath)) {
  let html = fs.readFileSync(landingPath, 'utf8');
  if (html.includes('__AURALINK_API_URL__')) {
    html = html.replace(/__AURALINK_API_URL__/g, apiUrl);
    fs.writeFileSync(landingPath, html);
    console.log('[inject-api-url] Set API URL to', apiUrl, 'in landing.html');
  }
} else {
  const altPath = path.join(__dirname, '../frontend/public/landing.html');
  if (fs.existsSync(altPath)) {
    let html = fs.readFileSync(altPath, 'utf8');
    if (html.includes('__AURALINK_API_URL__')) {
      html = html.replace(/__AURALINK_API_URL__/g, apiUrl);
      fs.writeFileSync(altPath, html);
      console.log('[inject-api-url] Set API URL to', apiUrl, 'in landing.html');
    }
  }
}
