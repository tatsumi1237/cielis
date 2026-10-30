// usage: SCENE=video.html node render.js <outdir> <fps> <startFrame> <endFrame>
//        SCENE=video.html node render.js <outdir> test t1,t2,...
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const [out, a, b, c] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.log('[err]', e.message));
  await page.goto('file://' + path.resolve(process.env.SCENE));
  await page.waitForFunction("window.ready===true",null,{timeout:120000});
  await page.evaluate(() => document.fonts.ready);
  const stage = await page.$('#stage');
  let jobs = [];
  if (a === 'test') jobs = b.split(',').map((t, i) => [parseFloat(t), `t_${t}.jpg`]);
  else { const fps = +a; for (let f = +b; f < +c; f++) jobs.push([f / fps, `f_${String(f).padStart(4, '0')}.jpg`]); }
  const t0 = Date.now();
  for (const [t, name] of jobs) {
    await page.evaluate(t => window.renderFrame(t), t);
    await stage.screenshot({ path: path.join(out, name), type: 'jpeg', quality: 90 });
  }
  console.log('done', jobs.length, 'frames in', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await browser.close();
})();
