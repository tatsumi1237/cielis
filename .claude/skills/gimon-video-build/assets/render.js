// usage: node render.js <outdir> test t1,t2,...   [SUB=1]
//        node render.js <outdir> <fps> <startFrame> <endFrame>
// プロジェクトのルート（index.html のあるフォルダの親）で実行する。ルートは環境変数 ROOT（既定: 実行したフォルダ）。
// playwright は ROOT/node_modules（`npm i three@0.160.0 playwright`）から読む。対象ページは PAGE=/<フォルダ>/index.html
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(process.env.ROOT || process.cwd());
let chromium;
for (const base of [ROOT, path.join(ROOT, 'work'), __dirname, process.cwd()]) {
  try { ({ chromium } = require(require.resolve('playwright', { paths: [base] }))); break; } catch (e) { /* 次の場所を試す */ }
}
if (!chromium) { console.error('playwright が見つかりません。ROOT で `npm i three@0.160.0 playwright && npx playwright install chromium` を実行してください'); process.exit(1); }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.fbx': 'application/octet-stream', '.glb': 'model/gltf-binary' };

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/__mixamo') {
    const dir = path.join(ROOT, 'work/assets/mixamo');
    const list = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /\.fbx$/i.test(f)) : [];
    res.writeHead(200, { 'content-type': TYPES['.json'] }); return res.end(JSON.stringify(list));
  }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  const [out, a, b, c] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  // Windows はGPU（d3d11）。GPUの無い Linux／クラウドはソフトウェア描画（SwiftShader：遅いが同じ絵になる）
  const gpuArgs = process.platform === 'win32'
    ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization']
    : ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  const browser = await chromium.launch({ args: gpuArgs });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.log('[err]', e.message));
  await page.goto(`http://127.0.0.1:${port}${process.env.PAGE || '/index.html'}`);
  await page.waitForFunction('window.ready===true', null, { timeout: 300000 });
  const stage = await page.$('#stage');
  const sub = +(process.env.SUB || 6);
  let jobs = [];
  if (a === 'test') jobs = b.split(',').map(t => [parseFloat(t), `t_${t}.jpg`]);
  else { const fps = +a; for (let f = +b; f < +c; f++) jobs.push([f / fps, `f_${String(f).padStart(4, '0')}.jpg`]); }
  const t0 = Date.now();
  for (const [t, name] of jobs) {
    await page.evaluate(([t, s]) => window.renderFrame(t, s), [t, sub]);
    await stage.screenshot({ path: path.join(out, name), type: 'jpeg', quality: 97, timeout: 300000 });
  }
  console.log('done', jobs.length, 'frames in', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await browser.close(); server.close();
})();
