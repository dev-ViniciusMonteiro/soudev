// Gera os banners (1920x768, WebP) dos jogos, apps e sistemas no estilo dos banners feitos à mão: fundo escuro
// com brilho neon, título grande, chamada, quatro selos e, à direita, uma cena desenhada (jogos) ou a tela real do
// produto num monitor (apps e sistemas).
//
// Uso:
//   node scripts/banners/gerar.mjs --capturar http://localhost:3000   captura as telas (com o site rodando)
//   node scripts/banners/gerar.mjs [slug ...]                          gera todos (ou só os slugs dados)
// As telas e o HTML intermediário ficam em .banners/ (fora do git).

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { banners } from './conteudo.mjs';

const RAIZ = resolve(import.meta.dirname, '../..');
const CACHE = join(RAIZ, '.banners');
const TELAS = join(CACHE, 'telas');
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
mkdirSync(TELAS, { recursive: true });

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Chrome headless com o protocolo de depuração (sem dependências). */
async function abrirChrome(largura, altura) {
  const porta = 9400 + Math.floor(Math.random() * 400);
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${porta}`, `--user-data-dir=${join(CACHE, `perfil-${porta}`)}`, `--window-size=${largura},${altura}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--no-first-run', 'about:blank']);
  let alvo;
  for (let i = 0; i < 60 && !alvo; i++) {
    await esperar(300);
    try {
      alvo = (await (await fetch(`http://127.0.0.1:${porta}/json`)).json()).find((t) => t.type === 'page');
    } catch {}
  }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pend = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) (pend.get(m.id)(m), pend.delete(m.id));
  };
  const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: 1, mobile: false });
  return {
    cdp,
    foto: async () => Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'),
    fechar: () => (ws.close(), proc.kill()),
  };
}

/* ---------- Captura das telas (apps, sistemas e jogos com "tela") ---------- */

const ENDERECO = { apps: (s) => `/apps/${s}/app`, sistemas: (s) => `/sistemas/${s}/app?beta=1`, jogos: (s) => `/jogar/${s}/index.html` };

async function capturar(base) {
  const c = await abrirChrome(1600, 900);
  await c.cdp('Page.addScriptToEvaluateOnNewDocument', { source: "try{localStorage.setItem('consentimento', JSON.stringify({analytics:false,ads:false,em:Date.now()}))}catch(e){}" });
  for (const b of banners.filter((x) => x.tela)) {
    await c.cdp('Page.navigate', { url: base + ENDERECO[b.tipo](b.slug) });
    await esperar(9000);
    // Tira o aviso de cookies e o selo do modo de desenvolvimento do Next (quando capturado do "next dev").
    await c.cdp('Runtime.evaluate', { expression: "document.querySelectorAll('nextjs-portal, .cookie-banner').forEach((e) => e.remove())" });
    writeFileSync(join(TELAS, `${b.tela}.png`), await c.foto());
    console.log('tela', b.tela);
  }
  c.fechar();
}

/* ---------- Banner ---------- */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const destaque = (linha) => esc(linha).replace(/\*([^*]+)\*/g, '<span class="cor">$1</span>');

function html(b, tela) {
  const [c1, c2] = b.cores;
  const ehJogo = b.tipo === 'jogos';
  const direita = tela
    ? `<div class="monitor"><img src="${pathToFileURL(tela).href}" alt=""></div>`
    : `<div class="cena">${b.cena}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1920px; height: 768px; overflow: hidden; font-family: 'Segoe UI', 'Arial', sans-serif; color: #fff;
    background: radial-gradient(circle at 78% 45%, ${c1}38, transparent 45%), radial-gradient(circle at 18% 85%, ${c2}30, transparent 40%), linear-gradient(120deg, #060914, #0b1024 55%, #070a17); }
  .grade { position: absolute; inset: 0; background-image: linear-gradient(${c1}12 1px, transparent 1px), linear-gradient(90deg, ${c1}12 1px, transparent 1px); background-size: 64px 64px; mask-image: linear-gradient(90deg, transparent, #000 40%, #000 70%, transparent); }
  .pontos { position: absolute; inset: 0; background-image: radial-gradient(${c2}66 1.5px, transparent 2px); background-size: 120px 90px; opacity: .5; }
  .esq { position: absolute; left: 110px; top: 0; bottom: 0; width: 830px; display: flex; flex-direction: column; justify-content: center; gap: 26px; z-index: 2; }
  .tag { align-self: flex-start; padding: 8px 18px; border: 2px solid ${c1}; border-radius: 10px; font: 700 24px 'Consolas', monospace; letter-spacing: 3px; color: ${c1}; background: ${c1}14; box-shadow: 0 0 24px ${c1}55; }
  h1 { align-self: flex-start; display: inline-block; padding-right: 20px; font-weight: 900; font-size: 150px; line-height: .95; letter-spacing: -2px; white-space: nowrap; ${ehJogo ? 'font-style: italic; transform: skewX(-4deg);' : ''}
    background: linear-gradient(180deg, #ffffff 30%, ${c1}); -webkit-background-clip: text; color: transparent; filter: drop-shadow(0 0 18px ${c1}aa) drop-shadow(0 6px 0 #0008); }
  .chamada { font-weight: 800; font-size: 58px; line-height: 1.05; ${ehJogo ? 'transform: rotate(-3deg); transform-origin: left;' : ''} text-shadow: 0 4px 0 #0007; }
  .chamada .cor { color: ${c2}; text-shadow: 0 0 22px ${c2}aa; }
  .selos { display: flex; gap: 18px; margin-top: 10px; }
  .selo { width: 172px; height: 150px; border-radius: 16px; border: 2px solid ${c1}cc; background: #0b1024cc; box-shadow: 0 0 22px ${c1}44, inset 0 0 18px ${c1}22;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; font: 700 22px/1.15 'Segoe UI', sans-serif; padding: 0 10px; }
  .selo:nth-child(2n) { border-color: ${c2}cc; box-shadow: 0 0 22px ${c2}44, inset 0 0 18px ${c2}22; }
  .selo .icone { font-size: 50px; line-height: 1; filter: drop-shadow(0 0 10px ${c1}); }
  .cena, .monitor { position: absolute; right: 0; top: 0; width: 1000px; height: 768px; z-index: 1; }
  .cena { mask-image: linear-gradient(90deg, transparent, #000 18%); }
  .monitor { right: 70px; top: 104px; width: 900px; height: 560px; border-radius: 22px; padding: 14px; background: #111827; border: 3px solid ${c1};
    box-shadow: 0 0 60px ${c1}66, 0 30px 60px #000a; transform: perspective(1600px) rotateY(-14deg) rotateX(3deg); }
  .monitor img { width: 100%; height: 100%; object-fit: cover; object-position: left top; border-radius: 10px; display: block; }
  .monitor::after { content: ''; position: absolute; left: 50%; bottom: -70px; width: 220px; height: 56px; translate: -50% 0; background: linear-gradient(#1f2937, #0b1020); border-radius: 0 0 16px 16px; }
  /* peças das cenas */
  .em { position: absolute; line-height: 1; filter: drop-shadow(0 0 24px ${c1}88) drop-shadow(0 18px 18px #0009); }
  .luz { position: absolute; width: 60px; height: 60px; border-radius: 50%; filter: blur(18px); }
  .cidade, .morro, .cubo { position: absolute; inset: 0; width: 100%; height: 100%; }
  .grama { position: absolute; left: 0; right: 0; bottom: 0; height: 240px; background: radial-gradient(ellipse at 50% 0, #22c55e, #14532d 60%, transparent 75%); }
  .orbe { position: absolute; width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(#ef4444 48%, #111 48% 52%, #f8fafc 52%); border: 6px solid #111; box-shadow: 0 0 40px #facc15; }
  .gelo { position: absolute; left: 0; right: 0; top: 300px; height: 90px; background: linear-gradient(#e0f2fe, #7dd3fc); box-shadow: 0 0 40px #a5f3fc; }
  .gelo::after { content: ''; position: absolute; left: 0; right: 0; top: 90px; height: 400px; background: linear-gradient(#0c4a6e, #082f49); }
  .buraco { position: absolute; left: 400px; top: 310px; width: 220px; height: 70px; border-radius: 50%; background: #082f49; border: 6px solid #bae6fd; z-index: 1; }
  .linha { position: absolute; width: 3px; background: #e0f2fe; z-index: 2; }
  .mesa { position: absolute; left: 60px; right: -60px; top: 330px; height: 520px; border-radius: 50% 50% 0 0; background: radial-gradient(#15803d, #052e16 75%); border: 10px solid #78350f; }
  .carta { position: absolute; width: 230px; height: 320px; border-radius: 22px; background: #f8fafc; color: #0f172a; box-shadow: 0 20px 40px #000a, 0 0 30px #facc1566; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 900; z-index: 2; }
  .carta b { font-size: 110px; line-height: 1; } .carta i { font-style: normal; font-size: 120px; line-height: 1; } .carta.vermelha { color: #dc2626; }
  .ficha { position: absolute; width: 110px; height: 110px; border-radius: 50%; border: 12px dashed #f8fafc; box-shadow: 0 10px 20px #000a; z-index: 2; }
  .numero { position: absolute; right: 70px; top: 40px; font: italic 900 200px 'Segoe UI'; color: #facc15; text-shadow: 0 0 40px #facc15aa; z-index: 3; }
  .corte { position: absolute; height: 10px; border-radius: 10px; background: linear-gradient(90deg, transparent, #fff, ${c1}, transparent); box-shadow: 0 0 30px #fff; z-index: 2; }
  .respingo { position: absolute; width: 90px; height: 90px; border-radius: 50%; filter: blur(4px); opacity: .7; }
  .vs { position: absolute; left: 470px; top: 370px; font: italic 900 120px 'Segoe UI'; color: ${c2}; text-shadow: 0 0 30px ${c2}; }
  .muro { position: absolute; left: 180px; top: 70px; width: 700px; height: 640px; filter: drop-shadow(0 0 30px ${c1}88); }
  .proibido { position: absolute; width: 140px; height: 140px; border-radius: 50%; border: 12px solid #ef4444; }
  .proibido::after { content: ''; position: absolute; left: 50%; top: -6px; bottom: -6px; width: 12px; background: #ef4444; translate: -50% 0; rotate: 45deg; }
  .impacto { position: absolute; left: 330px; top: 170px; width: 380px; height: 380px; background: radial-gradient(#fde047, #f97316 45%, transparent 70%); clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); filter: drop-shadow(0 0 30px #f97316); }
  .ko { position: absolute; left: 330px; top: 560px; font: italic 900 130px 'Segoe UI'; color: #fff; text-shadow: 0 0 30px ${c1}, 0 6px 0 ${c1}; }
  </style></head><body>
  <div class="grade"></div><div class="pontos"></div>
  ${direita}
  <div class="esq">
    <div class="tag">${esc(b.tag)}</div>
    <h1 id="titulo">${esc(b.titulo)}</h1>
    <div class="chamada">${b.chamada.map(destaque).join('<br>')}</div>
    <div class="selos">${b.selos.map(([i, t]) => `<div class="selo"><span class="icone">${i}</span><span>${esc(t)}</span></div>`).join('')}</div>
  </div>
  <script>
    // Título longo diminui até caber na coluna da esquerda.
    const t = document.getElementById('titulo');
    let tam = 150;
    while (t.getBoundingClientRect().width > 820 && tam > 60) t.style.fontSize = (tam -= 4) + 'px';
  </script>
  </body></html>`;
}

async function gerar(lista) {
  const c = await abrirChrome(1920, 768);
  for (const b of lista) {
    let tela = null;
    if (b.tela) {
      const original = join(TELAS, `${b.tela}.png`);
      if (!existsSync(original)) {
        console.log(`sem tela para ${b.slug}: rode com --capturar primeiro`);
        continue;
      }
      tela = join(CACHE, `recorte-${b.slug}.png`);
      const r = b.recorte ?? { esquerda: 0, topo: 0, largura: 1600, altura: 900 };
      await sharp(original).extract({ left: r.esquerda, top: r.topo, width: r.largura, height: r.altura }).toFile(tela);
    }
    const arq = join(CACHE, `${b.tipo}-${b.slug}.html`);
    writeFileSync(arq, html(b, tela));
    await c.cdp('Page.navigate', { url: pathToFileURL(arq).href });
    await esperar(1200);
    const destino = join(RAIZ, 'public/banners', b.tipo);
    mkdirSync(destino, { recursive: true });
    const info = await sharp(await c.foto()).webp({ quality: 84 }).toFile(join(destino, `${b.slug}.webp`));
    console.log(`banner ${b.tipo}/${b.slug} (${Math.round(info.size / 1024)} KB)`);
  }
  c.fechar();
}

const args = process.argv.slice(2);
if (args[0] === '--capturar') await capturar(args[1] ?? 'http://localhost:3000');
else await gerar(args.length ? banners.filter((b) => args.includes(b.slug)) : banners);
process.exit(0);
