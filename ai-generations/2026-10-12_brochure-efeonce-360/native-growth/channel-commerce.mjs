// Sección Channel & Commerce dentro de Brand: CC1 (activación épica), CC2 (trade marketing), CC3 (BTL).
// Uso: node channel-commerce.mjs <dirSalida>. Copy alineado al catálogo docs/services/channel-commerce (Proposed: sin
// claims de venta, cobertura ni precio; la producción física la ejecuta un proveedor y Efeonce opera y responde).
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const OUT = path.resolve(process.argv[2]); fs.mkdirSync(OUT, { recursive: true });
const HERE = path.dirname(new URL(import.meta.url).pathname);
const FOTO = path.resolve(HERE, '../channel-commerce/brio-activacion-plaza.png');
const SHOT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-29_deck-seo-aeo-documentos/render-src/shot.cjs';
const BUB = 'file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/url-bubble-baked-dark.svg';
const ID = 'Bricolage Grotesque, system-ui, sans-serif', ST = 'Poppins, system-ui, sans-serif', ACC = '#ff6500';
const head = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Poppins:wght@300;400;500;600&display=swap"><style>body{margin:0}b{font-weight:600}</style></head><body>`;
const dot = `<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:${ACC};margin-left:0.04em"></span>`;
const eb = t => `<div style="font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">${t}</div>`;
const q = t => `<div style="margin-top:56px;display:flex;align-items:center;gap:14px;font-family:${ST};font-size:34px;font-weight:300;color:#fff"><span style="width:16px;height:16px;border-radius:50%;border:3px solid ${ACC};box-sizing:border-box"></span>${t}</div>`;
const title = (t, px) => `<div style="margin-top:14px;font-family:${ID};font-size:${px}px;font-weight:760;letter-spacing:-0.045em;line-height:0.94;color:#fff">${t}${dot}</div>`;
const body = (t, w = 560) => `<div style="margin-top:36px;font-family:${ST};font-size:24px;font-weight:300;line-height:1.45;color:#fff;max-width:${w}px">${t}</div>`;
const bub = `<img src="${BUB}" style="position:absolute;left:135px;top:990px;width:162px;height:38px">`;
const stage = `background:radial-gradient(ellipse 900px 620px at 1360px 560px, rgba(255,101,0,0.20), rgba(255,101,0,0.05) 55%, rgba(0,26,51,0) 80%), #001a33`;
const card = (n, t, d) => `<div style="box-sizing:border-box;padding:26px 28px;border-radius:16px;background:rgba(160,200,255,0.06);border:1px solid rgba(160,200,255,0.16);box-shadow:0 24px 48px rgba(0,8,20,0.35)">
<div style="font-family:${ID};font-size:22px;font-weight:300;color:${ACC}">${n}</div>
<div style="margin-top:10px;font-family:${ID};font-size:28px;font-weight:740;letter-spacing:-0.02em;line-height:1.05;color:#fff">${t}</div>
<div style="margin-top:10px;font-family:${ST};font-size:17px;font-weight:300;line-height:1.4;color:#cfe0f3">${d}</div></div>`;
const pages = {
  CC1: `<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:#001a33"><img src="file://${FOTO}" style="position:absolute;inset:0;width:1920px;height:1080px;object-fit:cover">
<div style="position:absolute;left:140px;top:112px;width:760px">${eb('02 · Te recuerdan · Channel &amp; Commerce')}${q('¿Y fuera de la pantalla?')}${title('Te viven', 168)}${body('Activaciones, pop-ups, roadshows y sampling que ponen tu marca en la mano de la gente, medidos desde antes de abrir.', 540)}</div>
<div style="position:absolute;left:320px;top:1000px;font-family:${ST};font-size:13px;font-weight:300;color:rgba(255,255,255,0.7)">BRÍO es una marca ficticia.</div>${bub}</div>`,
  CC2: `<div style="position:relative;width:1920px;height:1080px;overflow:hidden;${stage}">
<div style="position:absolute;left:140px;top:112px;width:640px">${eb('02 · Te recuerdan · Trade marketing')}${q('¿Qué pasa en tu góndola?')}${title('Lo sabes', 120)}${body('Gobernamos tu inversión en el canal: qué se ejecuta en cada punto de venta, cuánto cuesta y dónde poner el próximo peso.', 540)}
<div style="margin-top:40px;padding-top:26px;border-top:1px solid rgba(255,255,255,0.18);font-family:${ST};font-size:20px;font-weight:300;line-height:1.45;color:#fff;max-width:540px">Un solo responsable: operamos, validamos cada dato y <b>respondemos también por los proveedores</b>.</div></div>
<div style="position:absolute;left:860px;top:180px;width:920px;display:grid;grid-template-columns:1fr 1fr;gap:20px">
${card('01', 'Diagnóstico de canal', 'Qué está roto y en qué orden intervenir.')}
${card('02', 'Cobertura auditada', 'El estado de cada punto de venta y qué arreglar primero, cada ciclo.')}
${card('03', 'Tienda perfecta', 'Qué significa «bien ejecutado» en cada canal, antes de medir.')}
${card('04', 'Promociones medidas', 'Si la promoción vendió de más o se comió tu margen.')}
${card('05', 'Anaquel digital y IA', 'Cómo se ve tu producto en cada ficha y si la IA lo recomienda.')}
${card('06', 'Retail media', 'Tu inversión en las cadenas, leída junto a la góndola.')}
</div>
<div style="position:absolute;left:860px;top:808px;width:920px;display:flex;align-items:center;gap:16px;font-family:${ID};font-size:30px;font-weight:740;letter-spacing:-0.02em;color:#fff"><span style="width:12px;height:12px;border-radius:50%;background:${ACC}"></span>La góndola y lo digital, leídos juntos.</div>${bub}</div>`,
  CC3: `<div style="position:relative;width:1920px;height:1080px;overflow:hidden;${stage}">
<div style="position:absolute;left:140px;top:112px;width:640px">${eb('02 · Te recuerdan · BTL')}${q('¿Y las activaciones?')}${title('Medidas', 120)}${body('Definimos cómo se va a leer cada activación antes de ejecutarla, y cada una deja contenido para tus canales.', 540)}</div>
<div style="position:absolute;left:860px;top:170px;width:920px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
${['Activaciones en sala', 'Promotoría e impulso', 'Visual merchandising', 'Roadshow y tour de marca', 'Street marketing y sampling', 'Pop-up y espacios efímeros', 'Activación de patrocinios', 'Ferias y exposiciones', 'Encuentros de canal'].map((t, i) => `<div style="box-sizing:border-box;height:104px;padding:0 22px;border-radius:14px;background:rgba(160,200,255,0.06);border:1px solid rgba(160,200,255,0.16);display:flex;align-items:center;gap:14px"><span style="font-family:${ID};font-size:18px;font-weight:300;color:${ACC}">${String(i + 1).padStart(2, '0')}</span><span style="font-family:${ID};font-size:23px;font-weight:700;letter-spacing:-0.015em;line-height:1.1;color:#fff">${t}</span></div>`).join('')}
</div>
<div style="position:absolute;left:860px;top:572px;width:920px;display:grid;grid-template-columns:repeat(3,1fr);gap:28px">
${[['La medición va primero', 'Tiendas de control, lectura por plaza y la métrica de éxito acordada antes de abrir.'], ['Alimenta tu dato de canal', 'Quien activa ya está en la tienda: ese paso también mide la ejecución.'], ['Deja contenido', 'Lo que se captura en cada activación vuelve a tus redes y a retail media, con derechos desde el brief.']].map(([t, d]) => `<div style="padding-top:22px;border-top:2px solid ${ACC}"><div style="font-family:${ID};font-size:30px;font-weight:740;letter-spacing:-0.02em;line-height:1.05;color:#fff">${t}</div><div style="margin-top:12px;font-family:${ST};font-size:18px;font-weight:300;line-height:1.45;color:#cfe0f3">${d}</div></div>`).join('')}
</div>
<div style="position:absolute;left:860px;top:820px;width:920px;font-family:${ST};font-size:17px;font-weight:300;line-height:1.45;color:rgba(255,255,255,0.75)">La producción física la ejecutan proveedores que contratamos y dirigimos; tú tienes un solo responsable.</div>${bub}</div>`,
};
for (const [k, html] of Object.entries(pages)) { const h = path.join(OUT, `${k}.html`); fs.writeFileSync(h, head + html + '</body></html>'); execFileSync('node', [SHOT, h, path.join(OUT, `${k}.png`)]); console.log(k); }
