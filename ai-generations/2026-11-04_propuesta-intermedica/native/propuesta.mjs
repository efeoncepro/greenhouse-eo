// Láminas nativas de la propuesta Intermedica (marketing digital y performance, línea Voice) — v2 de impacto visual
// (2026-11-04). Cada lámina tiene un momento dominante: cifras grandes, profundidad, evidencia real del sitio o diagrama.
// Gramática de las nativas del brochure «Agencia de Medios» y de ARMOR: voz de la línea a la izquierda, vidrio y luz a
// la derecha, íconos Trazo oficiales. El acento #f83902 sólo en trazos, contornos, barras y la esfera; nunca en texto de
// menos de 24 px. Registro: «ustedes» formal (Julio, 2026-11-04).
// Fuentes: docs/commercial/accounts/intermedica/ (auditoría 28/10, revalidada el 04/11) y el costeo V3 intermedio
// (pricing-v3-intermedio-2026-11-04/, requires_review, binding:false). Capturas: evidencia/ (intermedica.pe, 04/11).
// Uso: node propuesta.mjs <carpeta-salida>            → montos como [MONTO] (forma cliente hasta aprobar)
//      MONTOS=1 node propuesta.mjs <carpeta-salida>   → montos del costeo V3 (borrador interno para Julio)
import fs from 'node:fs';
import { resolveIcon } from '@efeoncepro/axis-graphic-line/icons';

const OUT = process.argv[2];
const SHOW = process.env.MONTOS === '1';
const NUM = { performance: 3640, medicion: 940, creatividad: 590, preparacion: 2270, landing: 2140, horizonte: 17780, mensual: 5170, nucleo: 4580, medios: 2000 };
const fmt = (n) => 'USD ' + n.toLocaleString('es-CL');
const m = (k) => (SHOW || k === 'medios' ? fmt(NUM[k]) : '[MONTO]');
const mv = (k) => (SHOW || k === 'medios' ? NUM[k].toLocaleString('es-CL') : '[MONTO]');

const HERE = 'file:///Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-04_propuesta-intermedica';
const ID = "'Bricolage Grotesque', system-ui, sans-serif", ST = "'Poppins', system-ui, sans-serif";
const BUB = 'file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/url-bubble-baked-dark.svg';
const LOGO = `${HERE}/logos/intermedica-blanco.png`;
const EV = (n) => `${HERE}/evidencia/${n}.png`;
const ACC = '#f83902', BG = '#001a33', SOFT = '#d9e3ec', MUTE = '#9fb4c8';
const icon = (glyph, size = 32) => resolveIcon({ glyph, size, line: 'voice', surface: 'dark', state: 'rest', idPrefix: `g-${glyph}-${size}` }).svg;
const sphere = `<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:${ACC};margin-left:0.04em"></span>`;

const voice = ({ eyebrow, question, answer, body, size, width = 660 }) => `
<div style="position:absolute;left:140px;top:110px;width:${width}px">
<div style="font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">${eyebrow}</div>
<div style="margin-top:44px;display:flex;align-items:flex-start;gap:16px;font-family:${ST};font-size:40px;font-weight:300;line-height:1.25;color:#fff"><span style="flex:none;margin-top:16px;display:inline-block;width:18px;height:18px;border-radius:50%;border:3px solid ${ACC}"></span><span>${question}</span></div>
<div style="margin-top:26px;font-family:${ID};font-size:${size ?? (answer.length > 1 ? 128 : 140)}px;font-weight:760;letter-spacing:-0.045em;line-height:0.92;color:#fff;white-space:nowrap">${answer.join('<br>')}${sphere}</div>
<div style="margin-top:40px;font-family:${ST};font-size:24px;font-weight:300;line-height:1.45;color:#fff;max-width:600px">${body}</div></div>`;

const facts = (items, left = 140, top = 868, w = 220) => items.map(([glyph, k, v], i) => `
<div style="position:absolute;left:${left + i * (w + 22)}px;top:${top}px;width:${w}px">
<div style="height:30px">${icon(glyph, 30)}</div>
<div style="margin-top:10px;font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE}">${k}</div>
<div style="margin-top:4px;font-family:${ST};font-size:17px;font-weight:500;line-height:1.35;color:#fff">${v}</div></div>`).join('');

const page = (inner, haloX = 1300, haloY = 520) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Poppins:wght@300;400;500;600&display=swap"><style>body{margin:0}b{font-weight:600}</style></head><body>
<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:${BG}">
<svg width="1920" height="1080" style="position:absolute;inset:0"><defs><radialGradient id="halo" cx="${haloX}" cy="${haloY}" r="820" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1b4f7a" stop-opacity="0.55"/><stop offset="0.5" stop-color="#0a3358" stop-opacity="0.3"/><stop offset="1" stop-color="${BG}" stop-opacity="0"/></radialGradient>
<radialGradient id="pool" cx="${haloX}" cy="1000" r="560" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 1000) scale(1 0.16) translate(0 -1000)"><stop offset="0" stop-color="#7fb6ff" stop-opacity="0.3"/><stop offset="1" stop-color="#7fb6ff" stop-opacity="0"/></radialGradient></defs>
<rect width="1920" height="1080" fill="url(#halo)"/><rect y="900" width="1920" height="180" fill="url(#pool)"/></svg>
${inner}
<img src="${BUB}" style="position:absolute;left:135px;top:990px;width:162px;height:38px">
</div></body></html>`;

const glassCss = (lit = false) => `border-radius:22px;background:linear-gradient(160deg,rgba(255,255,255,0.10),rgba(10,40,70,0.55));border:1.5px solid ${lit ? ACC : 'rgba(255,255,255,0.22)'};box-shadow:${lit ? '0 0 60px rgba(248,57,2,0.22),' : ''}0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.2)`;
const panel = (x, y, w, h, html, lit = false, extra = '') => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;box-sizing:border-box;${glassCss(lit)};${extra}">${html}</div>`;
const kicker = (t, c = MUTE) => `<div style="font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${c}">${t}</div>`;
const h3 = (t, s = 34) => `<div style="margin-top:6px;font-family:${ID};font-size:${s}px;font-weight:760;letter-spacing:-0.025em;line-height:1.02;color:#fff">${t}</div>`;
const p = (t, s = 18) => `<div style="margin-top:10px;font-family:${ST};font-size:${s}px;font-weight:300;line-height:1.45;color:${SOFT}">${t}</div>`;
const note = (t, x = 900, y = 948, w = 880) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;font-family:${ST};font-size:15px;font-weight:300;line-height:1.45;color:${MUTE}">${t}</div>`;
const chip = (t, lit = false) => `<span style="display:inline-block;font-family:${ST};font-size:14px;font-weight:500;color:#fff;border:1.5px solid ${lit ? ACC : 'rgba(255,255,255,0.35)'};border-radius:999px;padding:4px 14px;white-space:nowrap">${t}</span>`;
const giant = (t, s, c = '#fff', extra = '') => `<div style="font-family:${ID};font-size:${s}px;font-weight:780;letter-spacing:-0.05em;line-height:0.86;color:${c};font-variant-numeric:tabular-nums;${extra}">${t}</div>`;
// Ventana de navegador con una captura real, inclinada en perspectiva.
const win = (src, x, y, w, h, { tilt = -14, url = 'intermedica.pe', lit = false, z = 1 } = {}) => `
<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:${z};transform:perspective(2200px) rotateY(${tilt}deg);transform-origin:center;border-radius:16px;overflow:hidden;border:1.5px solid ${lit ? ACC : 'rgba(255,255,255,0.28)'};box-shadow:${lit ? '0 0 70px rgba(248,57,2,0.25),' : ''}0 40px 100px rgba(0,0,0,0.65);background:#0b2a47">
<div style="height:34px;display:flex;align-items:center;gap:8px;padding:0 14px;background:#0f3456;border-bottom:1px solid rgba(255,255,255,0.12)"><span style="width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,0.3)"></span><span style="width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,0.3)"></span><span style="width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,0.3)"></span><span style="margin-left:14px;flex:1;height:20px;border-radius:6px;background:rgba(255,255,255,0.10);font-family:${ST};font-size:12px;line-height:20px;color:${SOFT};padding-left:10px">${url}</span></div>
<img src="${src}" alt="Captura de ${url}" style="display:block;width:${w}px;height:${h - 34}px;object-fit:cover;object-position:top">
</div>`;
// Marcador numerado sobre la evidencia (no es órbita: es una señal de lectura).
const pin = (n, x, y) => `<div style="position:absolute;left:${x}px;top:${y}px;z-index:5;width:46px;height:46px;border-radius:50%;background:${BG};border:3px solid ${ACC};box-shadow:0 0 0 6px rgba(248,57,2,0.18),0 10px 30px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;font-family:${ID};font-size:24px;font-weight:760;color:#fff">${n}</div>`;

const slides = {};

// 02 · Lo que nos pidieron — cuatro preguntas como cuatro capítulos grandes
{
  const items = [
    ['01', 'Análisis de Intermedica', 'Presencia digital, comunicación, campañas y oportunidades', '03 – 07'],
    ['02', 'Equipo de performance', 'Cuántas personas y qué función asume cada una', '08 – 10'],
    ['03', 'Portafolio de servicios', 'Soluciones, alcance, entregables y valor', '11 – 17'],
    ['04', 'Propuesta económica', 'Tarifa mensual por servicio y por equipo', '18 – 20']
  ];
  let inner = voice({ eyebrow: 'Propuesta para Intermedica', question: '¿Qué nos pidieron?', answer: ['Cuatro', 'respuestas'], size: 116, body: 'Esta propuesta sigue, en su orden, las cuatro preguntas de su solicitud. Cada capítulo responde a una, con su <b>sustento</b>.' });
  items.forEach(([n, t, d, l], i) => {
    const x = 880 + (i % 2) * 460, y = 110 + Math.floor(i / 2) * 400, lit = i === 0;
    inner += panel(x, y, 440, 380, `<div style="padding:34px 36px;height:100%;box-sizing:border-box;display:flex;flex-direction:column">${giant(n, 150, lit ? '#fff' : 'rgba(217,227,236,0.32)')}<div style="flex:1"></div>${h3(t, 36)}${p(d, 19)}<div style="margin-top:14px">${chip('Láminas ' + l, lit)}</div></div>`, lit);
  });
  slides['02-encargo'] = page(inner);
}

// 03 · Quiénes son hoy — «4» gigante y muro de marcas
{
  let inner = voice({ eyebrow: '01 · Análisis de Intermedica', question: '¿Desde dónde parten?', answer: ['Marcas de', 'referencia'], size: 112, body: 'Cuatro líneas, tecnología de fabricantes reconocidos, servicio técnico propio y formación clínica: una base sólida para <b>vender mejor</b>.' });
  inner += `<div style="position:absolute;left:880px;top:80px">${giant('4', 420, '#fff', 'text-shadow:0 30px 80px rgba(0,0,0,0.5)')}</div>`;
  inner += `<div style="position:absolute;left:1150px;top:150px;width:620px">${kicker('Líneas de negocio')}<div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:14px">${['Dermatoestética', 'Nutrición y composición corporal', 'Rehabilitación', 'Medicina estética'].map((t, i) => `<div style="font-family:${ID};font-size:28px;font-weight:760;letter-spacing:-0.02em;line-height:1.1;color:#fff;padding:16px 0;border-top:2px solid ${i === 0 ? ACC : 'rgba(255,255,255,0.25)'}">${t}</div>`).join('')}</div></div>`;
  const brands = [['Fotona', 62], ['InBody', 62], ['InMode', 50], ['Hydrafacial', 50], ['DEKA', 44], ['EnPuls', 44], ['Stylage', 44], ['Erchonia', 36], ['Celluma', 36], ['QuantifiCare', 36], ['Emfield Pro', 36], ['Naggura', 36], ['ASA', 36]];
  inner += panel(880, 520, 900, 330, `<div style="padding:28px 40px">${kicker('Marcas que representan')}<div style="margin-top:14px;display:flex;flex-wrap:wrap;align-items:baseline;column-gap:30px;row-gap:6px">${brands.map(([b, s], i) => `<span style="font-family:${ID};font-size:${s}px;font-weight:${s > 45 ? 760 : 560};letter-spacing:-0.03em;color:${i < 4 ? '#fff' : SOFT}">${b}</span>`).join('')}</div></div>`);
  inner += note('Fuente: sitio intermedica.pe y página de LinkedIn de Intermedica, revisados el 28 de octubre y el 4 de noviembre de 2026.', 880, 868, 900);
  inner += facts([['checklist', 'Servicio técnico', 'Ingenieros certificados por fábrica'], ['ubicacion', 'Red', 'Socios en Lima, Arequipa, Chiclayo y Trujillo'], ['talent', 'Formación', 'Entrenamiento clínico Fotona 2026']]);
  slides['03-quienes'] = page(inner);
}

// 04 · Presencia digital — el sitio real en perspectiva y el marcador por canal
{
  let inner = voice({ eyebrow: '01 · Presencia digital', question: '¿Cómo se ve hoy en digital?', answer: ['Buena', 'base'], body: 'El catálogo y las fichas ya explican cada equipo. Falta unir esa información con una <b>conversación comercial</b> que se pueda medir.' });
  inner += win(EV('home'), 900, 90, 880, 520, { tilt: -10 });
  const cols = [['2', 'Fortalezas', ['Sitio y catálogo por línea', 'LinkedIn con formación clínica'], false], ['3', 'Por mejorar', ['Fichas: consulta científica', 'WhatsApp de asesores', 'Enlaces sin destino'], true], ['2', 'Por medir', ['Pauta y búsqueda', 'Analítica y conversiones'], false]];
  cols.forEach(([n, k, items, lit], i) => {
    inner += panel(880 + i * 306, 650, 290, 230, `<div style="padding:24px 26px"><div style="display:flex;align-items:flex-end;gap:14px">${giant(n, 96)}<div style="padding-bottom:10px">${kicker(k, lit ? '#fff' : MUTE)}</div></div><div style="margin-top:14px">${items.map(t => `<div style="font-family:${ST};font-size:16px;font-weight:400;line-height:1.5;color:${SOFT}">${t}</div>`).join('')}</div></div>`, lit);
  });
  inner += note('Captura de intermedica.pe del 4 de noviembre de 2026. La inversión publicitaria y su rendimiento se revisan con los accesos que Intermedica autorice.', 880, 900, 900);
  slides['04-presencia'] = page(inner);
}

// 05 · Comunicación y campañas — carteles por competidor, Intermedica encendida
{
  let inner = voice({ eyebrow: '01 · Comunicación y campañas', question: '¿Qué comunican los demás?', answer: ['Formación', 'y oferta'], size: 112, body: 'En Perú, otros distribuidores convierten cursos, asesoría y promociones en <b>motivos para escribir</b>. Intermedica comunica sobre todo su catálogo.' });
  const comp = [
    ['Estetika Medika', 'Dermatoestética', '«Formación y asesoría para emprender en estética»', 'Academy virtual'],
    ['HM Medical', 'Rehabilitación', '«Cursos con fecha y promociones de temporada»', 'Ventas corporativas'],
    ['Phymed', 'Rehabilitación', '«Proyectos y soporte técnico»', 'Argumento de servicio'],
  ];
  comp.forEach(([n, k, q, tag], i) => {
    const x = 880 + (i % 2) * 460, y = 110 + Math.floor(i / 2) * 330;
    inner += panel(x, y, 440, 310, `<div style="padding:30px 34px;height:100%;box-sizing:border-box;display:flex;flex-direction:column">${kicker(k)}<div style="margin-top:8px;font-family:${ID};font-size:44px;font-weight:780;letter-spacing:-0.03em;line-height:1;color:#fff">${n}</div><div style="margin-top:18px;font-family:${ST};font-size:22px;font-weight:300;line-height:1.35;color:#fff">${q}</div><div style="flex:1"></div><div>${chip(tag)}</div></div>`);
  });
  inner += panel(1340, 440, 440, 310, `<div style="padding:30px 34px;height:100%;box-sizing:border-box;display:flex;flex-direction:column">${kicker('La oportunidad', '#fff')}<img src="${LOGO}" alt="Intermedica" style="display:block;margin-top:14px;height:52px;width:auto;align-self:flex-start"><div style="margin-top:18px;font-family:${ST};font-size:20px;font-weight:300;line-height:1.4;color:#fff">Tiene catálogo técnico y formación clínica. Puede hablar por <b>necesidad profesional</b>: qué equipo conviene, cómo se implementa y qué respaldo tiene.</div></div>`, true);
  inner += note('Mensajes resumidos de los sitios públicos de cada empresa, consultados el 28 de octubre de 2026. Compara comunicación, no resultados comerciales ni desempeño clínico.', 880, 780, 900);
  slides['05-comunicacion'] = page(inner);
}

// 06 · Cinco oportunidades — evidencia en pantalla con marcadores
{
  let inner = voice({ eyebrow: '01 · Oportunidades de mejora', question: '¿Dónde está la oportunidad?', answer: ['Cinco', 'frentes'], body: 'Tres se resuelven en la preparación. Dos construyen la operación comercial que sostiene la <b>inversión en pauta</b>.' });
  inner += win(EV('contacto'), 890, 80, 500, 360, { tilt: -12, url: 'intermedica.pe/contacto', z: 1 });
  inner += win(EV('academy-404'), 1400, 200, 380, 260, { tilt: -12, url: 'intermedica.pe/?page_id=70', z: 2, lit: true });
  inner += pin('1', 1318, 352) + pin('2', 1712, 250);
  const ops = [['1', 'WhatsApp que llega al asesor', 'Rápida', false], ['2', 'Enlaces con destino', 'Rápida', false], ['3', 'Consulta científica separada', 'Rápida', false], ['4', 'Medición hasta la cotización', 'Estructural', true], ['5', 'Formación que abre ventas', 'Estructural', true]];
  inner += panel(880, 520, 900, 380, `<div style="padding:18px 36px">${ops.map(([n, t, k, lit], i) => `<div style="display:grid;grid-template-columns:60px 1fr 140px;align-items:center;padding:12px 0;border-top:${i ? '1px solid rgba(255,255,255,0.12)' : 'none'}"><span style="font-family:${ID};font-size:36px;font-weight:780;color:${lit ? '#fff' : MUTE}">${n}</span><span style="font-family:${ID};font-size:28px;font-weight:760;letter-spacing:-0.02em;color:#fff">${t}</span><span style="text-align:right">${chip(k, lit)}</span></div>`).join('')}</div>`);
  inner += note('Capturas del 4 de noviembre de 2026. (1) El botón general de WhatsApp no lleva prefijo 51 y seis enlaces de asesores en Contacto apuntan a un número genérico. (2) Academy y Términos y Condiciones responden error 404.', 880, 916, 900);
  slides['06-oportunidades'] = page(inner);
}

// 07 · El recorrido — cinco pasos sobre una pista de luz
{
  let inner = voice({ eyebrow: '01 · El recorrido propuesto', question: '¿Qué cambia?', answer: ['El', 'recorrido'], body: 'Del interés de un profesional a una cotización, con un responsable en cada paso y una <b>métrica</b> que lo prueba.' });
  const steps = [['busqueda', 'Descubre', 'Búsqueda, LinkedIn y Meta'], ['contenido', 'Evalúa', 'Ficha y contenido técnico'], ['reunion', 'Conversa', 'WhatsApp o formulario al asesor'], ['checklist', 'Demuestra', 'Demo o visita al showroom'], ['contrato', 'Cotiza', 'Propuesta y seguimiento']];
  const x0 = 880, w = 168, gap = 15;
  inner += `<svg width="1920" height="1080" style="position:absolute;inset:0;pointer-events:none"><defs><linearGradient id="trk" x1="0" x2="1"><stop offset="0" stop-color="rgba(255,255,255,0.15)"/><stop offset="1" stop-color="${ACC}"/></linearGradient></defs><rect x="${x0 + 20}" y="438" width="${5 * (w + gap) - gap - 40}" height="4" rx="2" fill="url(#trk)"/>${steps.map((_, i) => `<circle cx="${x0 + i * (w + gap) + w / 2}" cy="440" r="${i === 4 ? 14 : 8}" fill="${i === 4 ? ACC : '#d9e3ec'}"/>`).join('')}</svg>`;
  steps.forEach(([g, t, d], i) => {
    const h = 200 + i * 22;
    inner += panel(x0 + i * (w + gap), 410 - h, w, h - 20, `<div style="padding:20px 18px;height:100%;box-sizing:border-box;display:flex;flex-direction:column"><div style="font-family:${ID};font-size:40px;font-weight:780;color:${i === 4 ? '#fff' : 'rgba(217,227,236,0.4)'}">0${i + 1}</div><div style="flex:1"></div><div style="height:36px">${icon(g, 36)}</div><div style="margin-top:10px;font-family:${ID};font-size:28px;font-weight:760;letter-spacing:-0.02em;color:#fff">${t}</div></div>`, i === 4);
    inner += `<div style="position:absolute;left:${x0 + i * (w + gap)}px;top:466px;width:${w}px;font-family:${ST};font-size:16px;font-weight:300;line-height:1.35;color:${SOFT}">${d}</div>`;
  });
  const lines = [['Dermatoestética', 'Formación clínica → asesoría → demostración'], ['Nutrición · InBody', 'Necesidad del centro → modelo → evaluación'], ['Rehabilitación', 'Proyecto del centro → criterios técnicos → demo']];
  inner += panel(880, 560, 900, 300, `<div style="padding:24px 40px">${kicker('Tres recorridos candidatos, uno por línea')}${lines.map(([t, d], i) => `<div style="display:grid;grid-template-columns:280px 1fr;gap:20px;align-items:baseline;padding:16px 0;border-top:${i ? '1px solid rgba(255,255,255,0.12)' : 'none'};margin-top:${i ? 0 : 8}px"><span style="font-family:${ID};font-size:30px;font-weight:760;letter-spacing:-0.02em;color:#fff">${t}</span><span style="font-family:${ST};font-size:18px;font-weight:300;color:${SOFT}">${d}</span></div>`).join('')}</div>`, true);
  inner += note('Las dos líneas de arranque se eligen con ustedes según margen, stock, capacidad de demostración y ciclo de venta.', 880, 880, 900);
  slides['07-recorrido'] = page(inner);
}

// 08 · El equipo — cinco roles alrededor de un solo responsable
{
  let inner = voice({ eyebrow: '02 · Equipo de performance', question: '¿Cuántas personas?', answer: ['Cinco', 'personas'], body: 'Un equipo asignado a su cuenta, con un solo responsable frente a ustedes. La preparación suma especialistas de <b>medición y web</b> durante su fase.' });
  const cx = 1330, cy = 500;
  const roles = [
    ['Referente de la cuenta', 'Líder de performance', 'Pruebas y comité mensual', 1330, 110, true],
    ['Operación diaria', 'Especialista de medios', 'Google, Meta y LinkedIn', 1620, 360],
    ['Datos', 'Analista de medición', 'Eventos, tablero y avance', 1560, 720],
    ['Creatividad', 'Redactor', 'Mensajes por necesidad', 1100, 720],
    ['Creatividad', 'Diseñador', 'Piezas para cada prueba', 1040, 360]
  ];
  inner += `<svg width="1920" height="1080" style="position:absolute;inset:0;pointer-events:none">${roles.map(([, , , x, y, lit]) => { const [ex, ey] = y < cy - 200 ? [x, y + 150] : y > cy + 150 ? [x, y] : [x < cx ? x + 150 : x - 150, y + 75]; return `<line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" stroke="${lit ? ACC : 'rgba(255,255,255,0.22)'}" stroke-width="${lit ? 3 : 1.5}" stroke-dasharray="${lit ? '0' : '6 8'}"/>`; }).join('')}</svg>`;
  inner += `<div style="position:absolute;left:${cx - 140}px;top:${cy - 140}px;width:280px;height:280px;border-radius:50%;box-sizing:border-box;border:1.5px solid rgba(255,255,255,0.3);background:radial-gradient(circle at 50% 35%,rgba(27,79,122,0.95),rgba(0,26,51,0.95));box-shadow:0 30px 90px rgba(0,0,0,0.6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px"><img src="${LOGO}" alt="Intermedica" style="height:46px;width:auto"><div style="font-family:${ST};font-size:15px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:${SOFT}">Su cuenta</div></div>`;
  roles.forEach(([k, t, d, x, y, lit]) => { inner += panel(x - 150, y, 300, 150, `<div style="padding:18px 22px">${kicker(k, lit ? '#fff' : MUTE)}<div style="margin-top:6px;font-family:${ID};font-size:26px;font-weight:760;letter-spacing:-0.02em;line-height:1.05;color:#fff">${t}</div><div style="margin-top:6px;font-family:${ST};font-size:16px;font-weight:300;color:${SOFT}">${d}</div></div>`, !!lit); });
  inner += facts([['reunion', 'Interlocutor', 'Un responsable de cuenta'], ['calendario', 'Ritmo', 'Chequeos dos veces por semana'], ['talent', 'Respaldo', '+89 profesionales en Latinoamérica']]);
  slides['08-equipo'] = page(inner);
}

// 09 · Forma de trabajo — una semana real y el ritmo del trimestre
{
  let inner = voice({ eyebrow: '02 · Forma de trabajo', question: '¿Cómo trabajamos juntos?', answer: ['Con', 'ritmo'], body: 'Un calendario fijo de revisión y decisión, y tres contrapartes de Intermedica con <b>roles claros</b>.' });
  const days = [['L', 'Lunes', 'Chequeo de campañas', 'Ajustes en la bitácora', true], ['M', 'Martes', 'Producción', 'Piezas y mensajes', false], ['X', 'Miércoles', 'Lectura con ventas', 'Cada quince días', true], ['J', 'Jueves', 'Chequeo de campañas', 'Presupuesto y pujas', true], ['V', 'Viernes', 'Aprendizajes', 'Qué cambia la próxima', false]];
  days.forEach(([l, d, t, s, lit], i) => {
    inner += panel(880 + i * 182, 110, 170, 360, `<div style="padding:22px 20px;height:100%;box-sizing:border-box;display:flex;flex-direction:column">${giant(l, 96, lit ? '#fff' : 'rgba(217,227,236,0.32)')}<div style="margin-top:8px">${kicker(d)}</div><div style="flex:1"></div><div style="font-family:${ID};font-size:22px;font-weight:760;letter-spacing:-0.02em;line-height:1.1;color:#fff">${t}</div><div style="margin-top:6px;font-family:${ST};font-size:15px;font-weight:300;line-height:1.35;color:${SOFT}">${s}</div></div>`, lit && i === 0);
  });
  const bars = [['Cada mes', 'Reporte de inversión y avance comercial · comité de 60 minutos', 100], ['Cada tres meses', 'Recomendación de inversión para el siguiente ciclo', 100]];
  bars.forEach(([k, t], i) => { inner += panel(880, 494 + i * 92, 900, 78, `<div style="display:flex;align-items:center;gap:26px;height:100%;padding:0 32px"><span style="flex:none;width:170px;font-family:${ST};font-size:19px;font-weight:600;color:#fff">${k}</span><span style="flex:none;width:4px;height:34px;border-radius:2px;background:${ACC}"></span><span style="font-family:${ST};font-size:18px;font-weight:300;color:${SOFT}">${t}</span></div>`); });
  const cp = [['Marketing', 'Aprueba mensajes, materiales y accesos'], ['Ventas', 'Atiende consultas y devuelve su avance'], ['Aprobador técnico', 'Valida las afirmaciones de producto']];
  cp.forEach(([t, d], i) => { inner += panel(880 + i * 306, 694, 290, 186, `<div style="padding:22px 26px">${kicker('Intermedica')}<div style="margin-top:8px;font-family:${ID};font-size:28px;font-weight:760;letter-spacing:-0.02em;color:#fff">${t}</div>${p(d, 16)}</div>`); });
  inner += note('Las tres funciones pueden recaer en una misma persona, siempre que pueda responder y decidir en los plazos del calendario.', 880, 898, 900);
  inner += facts([['reunion', 'Canal', 'Microsoft Teams y WhatsApp'], ['informe', 'Tablero', 'Compartido con su equipo'], ['contrato', 'Bitácora', 'Cada decisión con su motivo']]);
  slides['09-ritmo'] = page(inner);
}

// 10 · Portafolio — tres capas apiladas en perspectiva
{
  let inner = voice({ eyebrow: '03 · Portafolio de servicios', question: '¿Qué podemos hacer?', answer: ['Tres', 'capas'], body: 'Un núcleo que opera desde el primer mes, servicios que lo potencian y una expansión que se activa cuando los <b>datos</b> lo justifiquen.' });
  const layers = [
    ['Expansión', 'Cuando haya datos', ['Contenido técnico y SEO/AEO', 'Pipeline comercial en CRM', 'Formación como captación'], false, 0.7],
    ['Recomendado', 'Lo potencia', ['Creatividad de performance', 'Conversión web por línea'], false, 0.85],
    ['Núcleo', 'Desde el mes 1', ['Performance gestionado', 'Medición y analítica'], true, 1]
  ];
  layers.forEach(([t, k, items, lit, op], i) => {
    const y = 100 + i * 270;
    inner += `<div style="position:absolute;left:900px;top:${y + 40}px;width:880px;height:200px;transform:perspective(1600px) rotateX(52deg);transform-origin:center bottom;border-radius:26px;background:linear-gradient(160deg,rgba(255,255,255,${0.08 + i * 0.04}),rgba(10,40,70,0.6));border:2px solid ${lit ? ACC : 'rgba(255,255,255,0.25)'};box-shadow:${lit ? '0 0 80px rgba(248,57,2,0.3),' : ''}0 40px 80px rgba(0,0,0,0.6);opacity:${op}"></div>`;
    inner += `<div style="position:absolute;left:970px;top:${y + 140}px;width:760px;display:flex;align-items:center;gap:30px"><div style="flex:none;width:340px">${kicker(k, lit ? '#fff' : MUTE)}<div style="margin-top:4px;font-family:${ID};font-size:48px;font-weight:780;letter-spacing:-0.035em;color:#fff">${t}</div></div><div>${items.map(s => `<div style="font-family:${ST};font-size:20px;font-weight:500;line-height:1.55;color:${lit ? '#fff' : SOFT}">${s}</div>`).join('')}</div></div>`;
  });
  slides['10-portafolio'] = page(inner);
}

// 11 · Núcleo — cifras del alcance en grande
{
  let inner = voice({ eyebrow: '03 · Núcleo', question: '¿Qué incluye el núcleo?', answer: ['Operar', 'y medir'], body: 'La operación mensual de campañas y la medición que conecta la inversión con su <b>avance comercial</b>.' });
  const stats = [['2', 'líneas de negocio'], ['3', 'canales'], ['6', 'campañas activas'], ['3', 'pruebas nuevas al mes'], ['8', 'chequeos al mes']];
  inner += panel(880, 110, 900, 300, `<div style="padding:28px 40px">${kicker('Performance gestionado · alcance mensual')}<div style="margin-top:18px;display:grid;grid-template-columns:repeat(5,1fr);gap:16px">${stats.map(([n, k], i) => `<div>${giant(n, 132, i === 2 ? '#fff' : '#fff')}<div style="margin-top:12px;font-family:${ST};font-size:17px;font-weight:400;line-height:1.3;color:${SOFT}">${k}</div></div>`).join('')}</div></div>`, true);
  const svc = [['Performance gestionado', 'Plan de medios y de pruebas, campañas en Google Search, Meta y LinkedIn, bitácora de decisiones y reporte mensual.', 'La inversión se concentra en consultas de compradores profesionales.'], ['Medición y analítica', 'Eventos de formulario, WhatsApp y llamadas; tablero con inversión, consultas y avance; lectura quincenal con ventas.', 'Saber qué campaña trae demostraciones y cotizaciones, no sólo clics.']];
  svc.forEach(([t, ent, val], i) => { inner += panel(880 + i * 460, 440, 440, 420, `<div style="padding:30px 34px">${kicker('Servicio ' + (i + 1))}${h3(t, 32)}<div style="margin-top:18px">${kicker('Entregables')}</div>${p(ent, 17)}<div style="margin-top:18px">${kicker('Valor para el negocio')}</div><div style="margin-top:8px;font-family:${ST};font-size:19px;font-weight:500;line-height:1.4;color:#fff">${val}</div></div>`); });
  slides['11-nucleo'] = page(inner);
}

// 13 · Recomendado — «18 piezas» y una landing por línea
{
  let inner = voice({ eyebrow: '03 · Recomendado', question: '¿Qué lo potencia?', answer: ['Piezas', 'y páginas'], size: 116, body: 'Creatividad hecha para probar argumentos y páginas que facilitan <b>pedir una demo</b>.' });
  inner += panel(880, 110, 470, 760, `<div style="padding:34px 36px;height:100%;box-sizing:border-box;display:flex;flex-direction:column">${kicker('Creatividad de performance · mensual')}<div style="margin-top:10px;display:flex;align-items:flex-end;gap:16px">${giant('18', 260)}<div style="padding-bottom:22px;font-family:${ID};font-size:34px;font-weight:760;line-height:1;color:#fff">piezas<br>al mes</div></div><div style="margin-top:26px;display:grid;grid-template-columns:1fr 1fr;gap:16px">${[['6', 'conceptos con mensaje'], ['6', 'piezas maestras'], ['12', 'adaptaciones de formato'], ['2', 'rondas de ajustes']].map(([n, k]) => `<div style="border-top:1px solid rgba(255,255,255,0.18);padding-top:12px">${giant(n, 54)}<div style="margin-top:6px;font-family:${ST};font-size:16px;font-weight:300;color:${SOFT}">${k}</div></div>`).join('')}</div><div style="flex:1"></div>${p('Con fichas, fotografías y afirmaciones aprobadas por Intermedica y los fabricantes.', 16)}</div>`, true);
  // Landing ilustrativa
  inner += `<div style="position:absolute;left:1390px;top:130px;width:390px;height:620px;transform:perspective(1800px) rotateY(-16deg);border-radius:18px;overflow:hidden;border:1.5px solid rgba(255,255,255,0.3);box-shadow:0 40px 100px rgba(0,0,0,0.65);background:#f4f6f8">
<div style="height:30px;background:#e3e8ee;display:flex;align-items:center;padding:0 12px;font-family:${ST};font-size:11px;color:#5b6b7b">intermedica.pe/dermatoestetica</div>
<div style="padding:26px 24px;background:linear-gradient(160deg,#0b2a47,#123d63);height:270px;box-sizing:border-box"><div style="font-family:${ST};font-size:11px;font-weight:600;letter-spacing:0.14em;color:#9fb4c8">DERMATOESTÉTICA</div><div style="margin-top:12px;font-family:${ID};font-size:30px;font-weight:760;line-height:1.05;color:#fff">[Titular por necesidad del centro]</div><div style="margin-top:20px;display:inline-block;padding:10px 18px;border-radius:999px;background:#fff;font-family:${ST};font-size:13px;font-weight:600;color:#0b2a47">Agendar demostración</div></div>
<div style="padding:22px 24px"><div style="height:12px;width:80%;border-radius:6px;background:#cfd8e1"></div><div style="margin-top:10px;height:12px;width:62%;border-radius:6px;background:#dde4ea"></div><div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:12px"><div style="height:90px;border-radius:10px;background:#e6ebf0"></div><div style="height:90px;border-radius:10px;background:#e6ebf0"></div></div><div style="margin-top:20px;padding:12px 16px;border-radius:12px;border:1.5px solid #25d366;font-family:${ST};font-size:13px;font-weight:600;color:#0b6b33">Escribir a un asesor por WhatsApp</div></div></div>`;
  inner += `<div style="position:absolute;left:1390px;top:780px;width:390px">${kicker('Conversión web · opcional')}<div style="margin-top:6px;font-family:${ID};font-size:26px;font-weight:760;color:#fff">Una landing por línea</div><div style="margin-top:6px;font-family:${ST};font-size:15px;font-weight:300;color:${MUTE}">Maqueta ilustrativa · proyecto único sobre su sitio</div></div>`;
  slides['13-recomendado'] = page(inner);
}

// 14 · Expansión — escalera de crecimiento
{
  let inner = voice({ eyebrow: '03 · Expansión', question: '¿Y cuando funcione?', answer: ['Crecer'], body: 'Servicios que se suman cuando la operación muestre dónde está la demanda. Cada uno con su propia propuesta y <b>alcance</b>.' });
  const ex = [['talent', 'Formación como captación', 'Cada curso con inscripción medida y seguimiento comercial.'], ['integracion', 'Pipeline comercial en CRM', 'Etapas y devolución de ventas a marketing, en HubSpot o su CRM.'], ['busqueda', 'Contenido técnico y SEO/AEO', 'Que Google y la IA respondan con Intermedica.'], ['ia', 'Piloto en ChatGPT Ads', 'Un canal nuevo, disponible en Perú, para llegar a profesionales mientras investigan.']];
  inner += `<svg width="1920" height="1080" style="position:absolute;inset:0;pointer-events:none"><path d="M 900 860 L 1110 860 L 1110 700 L 1340 700 L 1340 540 L 1560 540 L 1564 380" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2"/></svg>`;
  ex.forEach(([g, t, d], i) => {
    const x = 880 + i * 228, top = 600 - i * 160;
    inner += panel(x, top, 212, 250, `<div style="padding:22px 20px"><div style="height:40px">${icon(g, 40)}</div><div style="margin-top:14px;font-family:${ID};font-size:23px;font-weight:760;letter-spacing:-0.02em;line-height:1.08;color:#fff">${t}</div><div style="margin-top:8px;font-family:${ST};font-size:15px;font-weight:300;line-height:1.38;color:${SOFT}">${d}</div></div>`, i === 3);
  });
  slides['14-expansion'] = page(inner);
}

// 17 · Tarifa mensual — la cifra mensual grande y su composición
{
  let inner = voice({ eyebrow: '04 · Propuesta económica', question: '¿Cuánto cuesta al mes?', answer: ['Por', 'servicio'], body: 'Cada servicio con su equipo y su tarifa. La inversión en medios se paga directo a las plataformas, en cuentas de <b>Intermedica</b>.' });
  const seg = [['performance', 'Performance gestionado', 'Líder de performance · especialista de medios', 'rgba(127,182,255,0.75)'], ['medicion', 'Medición y analítica', 'Analista · implementación de medición', 'rgba(217,227,236,0.85)'], ['creatividad', 'Creatividad de performance', 'Diseñador · redactor', ACC]];
  const total = NUM.performance + NUM.medicion + NUM.creatividad;
  const wpct = (k) => SHOW ? (NUM[k] / total) * 100 : 100 / 3;
  inner += panel(880, 110, 900, 470, `<div style="padding:32px 40px">${kicker('Total mensual recomendado')}<div style="margin-top:10px;display:flex;align-items:flex-end;gap:18px">${giant(mv('mensual'), 168)}<div style="padding-bottom:18px;font-family:${ID};font-size:34px;font-weight:760;color:#fff">${SHOW ? 'USD<br>/ mes' : '/ mes'}</div></div>
  <div style="margin-top:30px;display:flex;gap:6px;height:34px">${seg.map(([k, , , c]) => `<div style="width:${wpct(k)}%;border-radius:8px;background:${c}"></div>`).join('')}</div>
  <div style="margin-top:20px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px">${seg.map(([k, t, e, c]) => `<div><div style="display:flex;align-items:center;gap:10px"><span style="width:12px;height:12px;border-radius:3px;background:${c}"></span><span style="font-family:${ST};font-size:17px;font-weight:600;color:#fff">${t}</span></div><div style="margin-top:6px;font-family:${ID};font-size:34px;font-weight:760;color:#fff;font-variant-numeric:tabular-nums">${m(k)}</div><div style="margin-top:4px;font-family:${ST};font-size:14px;font-weight:300;color:${SOFT}">${e}</div></div>`).join('')}</div></div>`, true);
  const once = [['Preparación', 'Pago único · líder, analista y especialistas de medición y web', m('preparacion')], ['Conversión web · opcional', 'Pago único · dos landings, una por línea', m('landing')]];
  once.forEach(([t, d, v], i) => { inner += panel(880 + i * 460, 606, 440, 200, `<div style="padding:26px 32px">${kicker(t)}<div style="margin-top:10px;font-family:${ID};font-size:52px;font-weight:780;letter-spacing:-0.03em;color:#fff;font-variant-numeric:tabular-nums">${v}</div>${p(d, 16)}</div>`); });
  inner += note(`Valores netos en dólares estadounidenses; los impuestos se aplican según la normativa vigente. Medios sugeridos: hasta ${m('medios')} al mes, pagados directamente a Google, Meta y LinkedIn.`, 880, 830, 900);
  inner += facts([['finanzas', 'Moneda', 'Dólares estadounidenses'], ['contrato', 'Medios', 'Pagados directo por Intermedica'], ['checklist', 'Tarifa', 'Por servicio, no por hora']]);
  slides['17-tarifa'] = page(inner);
}

// 18 · Inversión total — una cifra
{
  let inner = voice({ eyebrow: '04 · Inversión total', question: '¿Cuánto es en total?', answer: ['Todo', 'a la vista'], size: 116, body: 'Preparación y tres meses de operación en una sola cifra, con los <b>medios</b> por separado.' });
  inner += `<div style="position:absolute;left:880px;top:120px;width:900px">${kicker('Preparación + 3 meses con creatividad · USD netos')}${giant(mv('horizonte'), SHOW ? 250 : 200, '#fff', 'margin-top:14px;text-shadow:0 30px 90px rgba(0,0,0,0.55)')}</div>`;
  const prep = SHOW ? (NUM.preparacion / NUM.horizonte) * 100 : 13;
  inner += `<div style="position:absolute;left:880px;top:420px;width:900px"><div style="display:flex;gap:6px;height:30px"><div style="width:${prep}%;border-radius:8px;background:rgba(217,227,236,0.85)"></div>${[0, 1, 2].map(() => `<div style="flex:1;border-radius:8px;background:rgba(127,182,255,0.55)"></div>`).join('')}</div><div style="margin-top:12px;display:flex;justify-content:space-between;font-family:${ST};font-size:16px;color:${SOFT}"><span>Preparación ${m('preparacion')}</span><span>Mes 1</span><span>Mes 2</span><span>Mes 3 · ${m('mensual')} c/u</span></div></div>`;
  const cond = [['Pago', 'Honorarios por adelantado, por bloque de 30 días'], ['Medios', `Techo sugerido de ${m('medios')} al mes, en sus cuentas`], ['Horizonte', 'Tres meses tras la preparación, sin renovación automática'], ['Moneda', 'Valores netos en USD; impuestos según normativa'], ['Vigencia', 'Propuesta válida por 30 días'], ['Aprobación', 'La inversión en medios se aprueba antes de ejecutarse']];
  cond.forEach(([k, v], i) => { inner += panel(880 + (i % 3) * 306, 520 + Math.floor(i / 3) * 176, 290, 160, `<div style="padding:22px 24px">${kicker(k, i === 0 ? '#fff' : MUTE)}<div style="margin-top:8px;font-family:${ST};font-size:18px;font-weight:400;line-height:1.38;color:#fff">${v}</div></div>`, i === 0); });
  slides['18-total'] = page(inner);
}

// 19 · Technogym por separado — dos marcas, dos propuestas
{
  let inner = voice({ eyebrow: '04 · Alcance', question: '¿Y Technogym?', answer: ['Por', 'separado'], body: 'Esta propuesta cubre sólo a Intermedica. Su equipo, su alcance y su tarifa no se comparten ni se descuentan con <b>otra cuenta</b>.' });
  inner += panel(880, 140, 440, 600, `<div style="padding:40px 38px;height:100%;box-sizing:border-box;display:flex;flex-direction:column">${kicker('Esta propuesta', '#fff')}<div style="flex:1;display:flex;align-items:center"><img src="${LOGO}" alt="Intermedica" style="width:360px;height:auto"></div><div style="font-family:${ST};font-size:19px;font-weight:300;line-height:1.45;color:#fff">Cuatro líneas en Perú, con el equipo de la lámina 08 y la tarifa de la lámina 18.</div></div>`, true);
  inner += `<div style="position:absolute;left:1328px;top:400px;width:44px;height:44px;border-radius:50%;background:${BG};border:1.5px solid rgba(255,255,255,0.35);display:flex;align-items:center;justify-content:center;font-family:${ID};font-size:26px;color:#fff;z-index:3">≠</div>`;
  inner += panel(1340, 140, 440, 600, `<div style="padding:40px 38px;height:100%;box-sizing:border-box;display:flex;flex-direction:column">${kicker('Propuesta aparte')}<div style="flex:1;display:flex;align-items:center"><div style="font-family:${ID};font-size:72px;font-weight:780;letter-spacing:-0.04em;color:#fff">Technogym</div></div><div style="font-family:${ST};font-size:19px;font-weight:300;line-height:1.45;color:${SOFT}">Si lo desean, preparamos una propuesta independiente, con diagnóstico, equipo y economía propios.</div></div>`);
  inner += facts([['checklist', 'Alcance', 'Una propuesta por marca'], ['finanzas', 'Economía', 'Tarifas independientes'], ['reunion', 'Equipo', 'Asignado a cada cuenta']]);
  slides['19-technogym'] = page(inner);
}

// 23 · Próximos pasos — tres decisiones grandes
{
  let inner = voice({ eyebrow: 'Próximos pasos', question: '¿Cómo empezamos?', answer: ['Tres', 'decisiones'], size: 116, body: 'Con estas tres definiciones ajustamos el alcance final y emitimos la <b>cotización formal</b>.' });
  const st = [['Líneas y comprador', 'Qué dos líneas abren la operación y a qué profesional le hablamos primero.'], ['Inversión en medios', 'El techo mensual que Intermedica puede sostener durante los tres meses.'], ['Contrapartes y accesos', 'Marketing, ventas y aprobador técnico; cuentas de Google, Meta, sitio y analítica.']];
  st.forEach(([t, d], i) => { inner += panel(880, 110 + i * 206, 900, 186, `<div style="display:flex;gap:34px;align-items:center;height:100%;padding:0 40px">${giant(String(i + 1), 150, i === 0 ? '#fff' : 'rgba(217,227,236,0.32)', 'flex:none;width:110px')}<div>${h3(t, 36)}${p(d, 19)}</div></div>`, i === 0); });
  inner += panel(880, 740, 900, 120, `<div style="display:flex;gap:28px;align-items:center;height:100%;padding:0 40px"><div style="flex:none">${icon('reunion', 40)}</div><div>${kicker('Su contacto en Efeonce')}<div style="margin-top:4px;display:flex;align-items:baseline;gap:18px"><span style="font-family:${ID};font-size:30px;font-weight:760;letter-spacing:-0.02em;color:#fff">Julio Reyes</span><span style="font-family:${ST};font-size:17px;font-weight:300;color:${SOFT}">Managing Director & GTM · jreyes@efeoncepro.com</span></div></div></div>`);
  slides['23-pasos'] = page(inner);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [k, html] of Object.entries(slides)) fs.writeFileSync(`${OUT}/${k}.html`, html);
console.log(Object.keys(slides).join('\n'));
