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
const BTL = [['b1-sala.png', 'Activaciones en sala'], ['b2-impulso.png', 'Promotoría e impulso'], ['b3-exhibicion.png', 'Visual merchandising'], ['b4-roadshow.png', 'Roadshow y tour de marca'], ['b5-street.png', 'Street marketing y sampling'], ['b6-popup.png', 'Pop-up y espacios efímeros'], ['b7-patrocinio.png', 'Activación de patrocinios'], ['b8-feria.png', 'Ferias y exposiciones'], ['b9-canal.png', 'Encuentros de canal']];
const pages = {
  CC1: `<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:#001a33"><img src="file://${FOTO}" style="position:absolute;inset:0;width:1920px;height:1080px;object-fit:cover">
<div style="position:absolute;left:140px;top:112px;width:760px">${eb('02 · Te recuerdan · Channel &amp; Commerce')}${q('¿Y fuera de la pantalla?')}${title('Te viven', 168)}</div>
<div style="position:absolute;left:140px;top:740px;width:420px">${body('Activaciones, pop-ups, roadshows y sampling que ponen tu marca en la mano de la gente, medidos desde antes de abrir.', 420).replace('margin-top:36px;', '')}</div>
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
  CC3: `<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:#001a33">
<div style="position:absolute;left:800px;top:0;width:1120px;height:1080px;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:6px">
${BTL.map(([f, t], i) => `<div style="position:relative;overflow:hidden"><img src="file://${path.resolve(HERE, '../channel-commerce/btl/' + f)}" style="width:100%;height:100%;object-fit:cover;display:block"><div style="position:absolute;left:14px;bottom:14px;display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:10px;background:rgba(0,26,51,0.86)"><span style="font-family:${ID};font-size:16px;font-weight:300;color:${ACC}">${String(i + 1).padStart(2, '0')}</span><span style="font-family:${ID};font-size:19px;font-weight:700;letter-spacing:-0.01em;color:#fff">${t}</span></div></div>`).join('')}
</div>
<div style="position:absolute;left:140px;top:112px;width:600px">${eb('02 · Te recuerdan · BTL')}${q('¿Y las activaciones?')}${title('Medidas', 132)}${body('Nueve formatos para que te vivan, y cada uno se diseña con su forma de medir antes de abrir.', 560)}
<div style="margin-top:44px;display:flex;flex-direction:column;gap:22px">
${[['La medición va primero', 'Tiendas de control, lectura por plaza y métrica de éxito acordada.'], ['Alimenta tu dato de canal', 'Quien activa ya está en la tienda: ese paso también mide la ejecución.'], ['Deja contenido', 'Lo que se captura vuelve a tus redes y a retail media, con derechos desde el brief.']].map(([t, d], i) => `<div style="display:flex;gap:18px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.16)"><div style="font-family:${ID};font-size:24px;font-weight:300;color:${ACC};width:34px">0${i + 1}</div><div><div style="font-family:${ID};font-size:26px;font-weight:740;letter-spacing:-0.02em;color:#fff">${t}</div><div style="margin-top:6px;font-family:${ST};font-size:17px;font-weight:300;line-height:1.4;color:#cfe0f3">${d}</div></div></div>`).join('')}
</div></div>
<div style="position:absolute;left:320px;top:992px;width:440px;line-height:1.4;font-family:${ST};font-size:13px;font-weight:300;color:rgba(255,255,255,0.7)">BRÍO es una marca ficticia. La producción física la ejecutan proveedores que contratamos y dirigimos.</div>${bub}</div>`,
};
for (const [k, html] of Object.entries(pages)) { const h = path.join(OUT, `${k}.html`); fs.writeFileSync(h, head + html + '</body></html>'); execFileSync('node', [SHOT, h, path.join(OUT, `${k}.png`)]); console.log(k); }
