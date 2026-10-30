// 全カットの字幕・数字の左右の端を測る（動画に焼き込まれる位置と同じ DOM を測定）
const http = require('http'), fs = require('fs'), path = require('path');
// usage: PAGE=/<フォルダ>/index.html [ROOT=<プロジェクトのルート>] [DUR=<秒>] node measure-edges.js <out.json>
const ROOT = path.resolve(process.env.ROOT || process.cwd());
const { chromium } = require(require.resolve('playwright', { paths: [ROOT, path.join(ROOT, 'work'), process.cwd()] }));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]), f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ args: process.platform === 'win32' ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto(`http://127.0.0.1:${port}${process.env.PAGE || '/index.html'}`);
  await page.waitForFunction('window.ready===true', null, { timeout: 300000 });
  const SEL = ['#sub .ln', '#count .lb', '#count .num', '#grow .num', '#need .lb', '#need .num', '#need .lb2', '#land .lb', '#land .num', '#x4', '#rent .num', '#doc .lb', '#doc .num'];
  const rows = [];
  for (let t = 0.2; t < +(process.env.DUR || 87.2); t += 0.4) {
    await page.evaluate(t => window.renderFrame(t, 1), t);
    const r = await page.evaluate(SEL => {
      const out = [];
      for (const s of SEL) for (const el of document.querySelectorAll(s)) {
        let p = el, op = 1; while (p && p.id !== 'stage') { op *= parseFloat(getComputedStyle(p).opacity); p = p.parentElement; }
        if (op < .5) continue;
        const rg = document.createRange(); rg.selectNodeContents(el); const b = rg.getBoundingClientRect();
        out.push({ s, text: el.textContent.slice(0, 22), l: Math.round(b.left), r: Math.round(b.right), top: Math.round(b.top) });
      }
      return out;
    }, SEL);
    for (const x of r) rows.push({ t: +t.toFixed(1), ...x });
  }
  fs.writeFileSync(process.argv[2], JSON.stringify(rows));
  console.log('samples', rows.length);
  await browser.close(); server.close();
})();
