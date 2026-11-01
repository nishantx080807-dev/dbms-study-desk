const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
let executablePath = process.env.CHROME_PATH;
if (!executablePath && !fs.existsSync(chromium.executablePath()) && process.platform === 'win32') {
  const cache = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  if (fs.existsSync(cache)) for (const folder of fs.readdirSync(cache).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const candidate = path.join(cache, folder, 'chrome-win64', 'chrome.exe');
    if (fs.existsSync(candidate)) { executablePath = candidate; break; }
  }
}
module.exports = { chromium, launchOptions: { headless: true, ...(executablePath ? { executablePath } : {}) }, chromePath: executablePath || chromium.executablePath() };
