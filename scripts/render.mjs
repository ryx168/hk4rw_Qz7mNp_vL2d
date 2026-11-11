// Headless frame capture. Loads the built page in render mode, seeks the film
// to each frame time, screenshots it. Usage:
//   node scripts/render.mjs --start 0 --end 1709 --out frames [--url http://127.0.0.1:4173/]
import puppeteer from 'puppeteer';
import { mkdirSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) { args[argv[i].slice(2)] = argv[i + 1]; i++; }
const FPS = 30, DURATION = 57, TOTAL = FPS * DURATION;
const start = +(args.start ?? 0), end = Math.min(+(args.end ?? TOTAL - 1), TOTAL - 1);
const out = args.out ?? 'frames';
const W = +(args.width ?? 1920), H = +(args.height ?? 1080);
mkdirSync(out, { recursive: true });

// tiny static server for dist/ so the page runs from an http origin
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
let url = args.url;
let server;
if (!url) {
  server = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const f = join('dist', p);
    try { await stat(f); res.setHeader('content-type', MIME[extname(f)] || 'application/octet-stream'); res.end(await readFile(f)); }
    catch { res.statusCode = 404; res.end('nf'); }
  }).listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  url = `http://127.0.0.1:${server.address().port}/`;
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
         '--ignore-gpu-blocklist', '--hide-scrollbars', `--window-size=${W},${H}`, '--force-device-scale-factor=1'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
page.on('pageerror', e => { console.log('[pageerror]', e.message); process.exitCode = 1; });
await page.goto(url + '?render=1', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.__film && window.__film.isReady, { timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
console.log(`rendering frames ${start}..${end} at ${W}x${H} from ${url}`);
await page.evaluate((t) => window.__film.seek(t), start / FPS);   // throwaway: first render after load is not trustworthy
const t0 = Date.now();
for (let f = start; f <= end; f++) {
  const file = join(out, `f${String(f).padStart(5, '0')}.png`);
  if (existsSync(file) && args.resume) continue;
  await page.evaluate((t) => window.__film.seek(t), f / FPS);
  await page.screenshot({ path: file, type: 'png', captureBeyondViewport: false });
  if ((f - start) % 30 === 0) console.log(`frame ${f}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
console.log(`done ${end - start + 1} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
await browser.close();
if (server) server.close();
