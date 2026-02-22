#!/usr/bin/env node
/**
 * Captures viewport screenshots for a design folder.
 * Starts a static HTTP server from the design folder, opens the page in Playwright
 * at several viewport sizes (and optional device presets), saves screenshots to
 * <design-folder>/screenshots/.
 *
 * Usage: node scripts/viewport-screenshots.js <design-folder-path>
 * Example: node scripts/viewport-screenshots.js designs/onboarding-wizard
 *
 * Requires: npm install (playwright as devDependency). First run may download browsers.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const PORT = 3333;
const DESIGN_FOLDER_ARG = process.argv[2];

if (!DESIGN_FOLDER_ARG) {
  console.error('Usage: node scripts/viewport-screenshots.js <design-folder-path>');
  process.exit(1);
}

const designFolderAbs = path.resolve(process.cwd(), DESIGN_FOLDER_ARG);
const screenshotsDir = path.join(designFolderAbs, 'screenshots');

if (!fs.existsSync(designFolderAbs) || !fs.statSync(designFolderAbs).isDirectory()) {
  console.error('Design folder not found or not a directory:', designFolderAbs);
  process.exit(1);
}

// Viewports: [width, height] and optional device name for filename
const VIEWPORTS = [
  { width: 320, height: 720, name: '320x720-mobile' },
  { width: 768, height: 1024, name: '768x1024-tablet' },
  { width: 1024, height: 768, name: '1024x768-desktop' },
  { width: 1440, height: 900, name: '1440x900-desktop-wide' },
];

// Minimal static file server
function createServer(rootDir) {
  return http.createServer((req, res) => {
    let filePath = path.join(rootDir, req.url === '/' ? 'index.html' : req.url);
    if (path.relative(rootDir, path.resolve(filePath)).startsWith('..')) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = err.code === 'ENOENT' ? 404 : 500;
        res.end(err.code === 'ENOENT' ? 'Not Found' : 'Server Error');
        return;
      }
      const ext = path.extname(filePath);
      const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
      res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
      res.end(data);
    });
  });
}

function waitForServer(port, maxAttempts = 20) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryConnect = () => {
      const req = http.get(`http://127.0.0.1:${port}/`, (res) => { resolve(); });
      req.on('error', () => {
        attempts++;
        if (attempts >= maxAttempts) reject(new Error('Server did not become ready'));
        else setTimeout(tryConnect, 300);
      });
    };
    tryConnect();
  });
}

async function main() {
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const server = createServer(designFolderAbs);
  server.listen(PORT, '127.0.0.1');

  await new Promise((resolve) => server.on('listening', resolve));
  await waitForServer(PORT);

  let playwright;
  try {
    playwright = require('playwright');
  } catch (e) {
    console.error('Playwright not found. Run: npm install');
    server.close();
    process.exit(1);
  }

  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const baseUrl = `http://127.0.0.1:${PORT}/`;
  const saved = [];

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 15000 });
  } catch (e) {
    console.warn('Initial navigation failed, continuing with viewports:', e.message);
  }

  for (const vp of VIEWPORTS) {
    try {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const filename = `${vp.name}.png`;
      const filePath = path.join(screenshotsDir, filename);
      await page.screenshot({ path: filePath, fullPage: false });
      saved.push(filename);
    } catch (e) {
      console.warn(`Screenshot ${vp.name} failed:`, e.message);
    }
  }

  await browser.close();
  server.close();

  console.log('Screenshots saved to:', screenshotsDir);
  console.log('Files:', saved.join(', '));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
