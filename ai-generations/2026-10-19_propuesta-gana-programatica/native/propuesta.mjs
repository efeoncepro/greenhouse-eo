// Láminas nativas de la propuesta Gana (programática omnicanal, línea Voice). Mismo lenguaje que las nativas del
// brochure «Agencia de Medios» (2026-10-16): voz de la línea a la izquierda, vidrio a la derecha, íconos Trazo oficiales.
// Reglas: el acento #f83902 sólo en trazos, contornos, arcos y la esfera; nunca en texto de menos de 24 px.
// Contenido: RFP Gana (GRD-1541) + propuesta de Basis del 2026-10-19. Efeonce trabaja en partnership con Basis DSP (operador, 2026-10-20): Efeonce presta el servicio y factura.
// Uso: node propuesta.mjs <carpeta-salida>
import fs from 'node:fs';
import { resolveIcon } from '@efeoncepro/axis-graphic-line/icons';

const OUT = process.argv[2];
const ID = "'Bricolage Grotesque', system-ui, sans-serif", ST = "'Poppins', system-ui, sans-serif";
const BUB = 'file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/url-bubble-baked-dark.svg';
const ACC = '#f83902', BG = '#001a33', SOFT = '#d9e3ec', MUTE = '#9fb4c8';
const icon = (glyph, size = 32) => resolveIcon({ glyph, size, line: 'voice', surface: 'dark', state: 'rest', idPrefix: `g-${glyph}-${size}` }).svg;
const sphere = `<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:${ACC};margin-left:0.04em"></span>`;

const voice = ({ eyebrow, question, answer, body, size }) => `
<div style="position:absolute;left:140px;top:110px;width:660px">
<div style="font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">${eyebrow}</div>
<div style="margin-top:44px;display:flex;align-items:flex-start;gap:16px;font-family:${ST};font-size:40px;font-weight:300;line-height:1.25;color:#fff"><span style="flex:none;margin-top:16px;display:inline-block;width:18px;height:18px;border-radius:50%;border:3px solid ${ACC}"></span><span>${question}</span></div>
<div style="margin-top:26px;font-family:${ID};font-size:${size ?? (answer.length > 1 ? 128 : 140)}px;font-weight:760;letter-spacing:-0.045em;line-height:0.92;color:#fff;white-space:nowrap">${answer.join('<br>')}${sphere}</div>
<div style="margin-top:40px;font-family:${ST};font-size:24px;font-weight:300;line-height:1.45;color:#fff;max-width:560px">${body}</div></div>`;

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
const panel = (x, y, w, h, html, lit = false) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;box-sizing:border-box;${glassCss(lit)}">${html}</div>`;
const kicker = (t) => `<div style="font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE}">${t}</div>`;
const h3 = (t, s = 34) => `<div style="margin-top:6px;font-family:${ID};font-size:${s}px;font-weight:760;letter-spacing:-0.025em;line-height:1.02;color:#fff">${t}</div>`;
const p = (t, s = 18) => `<div style="margin-top:10px;font-family:${ST};font-size:${s}px;font-weight:300;line-height:1.45;color:${SOFT}">${t}</div>`;
const note = (t, x = 880, y = 948, w = 900) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;font-family:${ST};font-size:15px;font-weight:300;line-height:1.45;color:${MUTE}">${t}</div>`;

const slides = {};

// 02 · Agenda
{
  const items = [
    ['01', 'Lo que necesita Gana', 'Objetivo, alcance y condiciones del proceso'],
    ['02', 'Modelo y tecnología', 'Efeonce responde por todo; Basis DSP como plataforma'],
    ['03', 'Formatos, audiencias y DOOH', 'Siete formatos y pantallas de alto tráfico en Medellín'],
    ['04', 'Plan, entregables y medición', 'Noventa días, trece entregables y reportes para Gana'],
    ['05', 'Inversión y requisitos', 'Escenarios, propuesta económica y cumplimiento del RFP']
  ];
  let inner = voice({ eyebrow: 'Agenda', question: '¿Qué propone Efeonce?', answer: ['Cinco', 'temas'], body: 'Una propuesta para leer sin presentador: cada tema responde a lo que pide el <b>RFP</b> de Gana.' });
  items.forEach(([n, t, d], i) => {
    const y = 150 + i * 156, lit = i === 0;
    inner += panel(900, y, 880, 128, `<div style="display:flex;align-items:center;gap:36px;height:100%;padding:0 40px"><div style="font-family:${ID};font-size:56px;font-weight:760;letter-spacing:-0.03em;color:${lit ? '#fff' : MUTE}">${n}</div><div>${h3(t, 34)}${p(d, 18)}</div></div>`, lit);
  });
  slides['02-agenda'] = page(inner);
}

// 03 · Lo que necesita Gana
{
  let inner = voice({ eyebrow: '01 · Lo que necesita Gana', question: '¿Qué busca Gana?', answer: ['Más', 'alcance'], body: 'Un aliado programático para planear, comprar, optimizar y medir campañas omnicanal que lleven tráfico a sus <b>canales digitales</b> y puntos de venta.' });
  const cards = [
    ['Objetivo', 'Medios basados en datos', 'Estrategias apoyadas en audiencias y automatización que optimicen la inversión y maximicen el impacto de cada campaña.'],
    ['Alcance', 'Siete formatos, un DSP', 'Display, Video, Audio digital, CTV, Native, Mobile y DOOH, con el Metro de Medellín, centros comerciales, aeropuertos, mobiliario urbano y vallas digitales.'],
    ['Resultado', 'Marca y tráfico', 'Más alcance, posicionamiento más fuerte y visitas a los canales digitales y a los puntos de venta de Gana.']
  ];
  cards.forEach(([k, t, d], i) => { inner += panel(900, 130 + i * 226, 880, 200, `<div style="padding:30px 40px">${kicker(k)}${h3(t)}${p(d)}</div>`, i === 1); });
  inner += facts([['finanzas', 'Presupuesto', 'COP 30.000.000 al mes'], ['ubicacion', 'Cobertura', 'Medellín, Antioquia y nacional'], ['reunion', 'Equipo mínimo', 'Dirección, trading y analítica']]);
  slides['03-necesidad'] = page(inner);
}

// 04 · Modelo de servicio
{
  let inner = voice({ eyebrow: '02 · Modelo de servicio', question: '¿Quién responde por la cuenta?', answer: ['Nosotros'], body: 'Presentamos la propuesta, prestamos el servicio y facturamos a Gana. Operamos la compra en <b>Basis DSP</b>, con su equipo de respaldo.' });
  inner += panel(900, 130, 880, 330, `<div style="padding:36px 44px">${kicker('Responsable integral de la cuenta')}<img src="file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/efeonce-logo-negative.svg" alt="Efeonce" style="display:block;margin-top:18px;height:60px;width:auto">${p('Estrategia, planeación de medios, trading, optimización, analítica, reportes y facturación. Un solo interlocutor para Gana y un equipo dedicado a su cuenta.', 20)}
  <div style="margin-top:22px;display:flex;gap:12px;flex-wrap:wrap">${['Estrategia', 'Planeación', 'Trading', 'Analítica', 'Reportes'].map(t => `<span style="font-family:${ST};font-size:15px;font-weight:500;color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:999px;padding:7px 16px">${t}</span>`).join('')}</div></div>`, true);
  inner += panel(900, 488, 880, 250, `<div style="padding:32px 44px">${kicker('Tecnología y apoyo operativo')}<img src="file:///Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-13_brochure-agencia-medios/logos/terceros/basis.svg" alt="Basis" style="display:block;margin-top:18px;height:40px;width:auto">${p('Seat propio de Efeonce en un DSP omnicanal: inventario premium, deals de DOOH, segmentos de data y brand safety. Basis acompaña la implementación, capacita y da soporte.', 19)}</div>`);
  inner += note('Modelo híbrido: Efeonce opera la plataforma con acceso directo y visibilidad total de inversión, optimización y reportería; Basis respalda cada campaña desde operaciones. Efeonce y Basis DSP trabajan en partnership.', 900, 766, 880);
  inner += facts([['contrato', 'Contrato', 'Uno, con Efeonce'], ['reunion', 'Interlocutor', 'Director de Cuenta'], ['informe', 'Visibilidad', 'Inversión y resultados']]);
  slides['04-modelo'] = page(inner);
}

// 05 · Basis DSP
{
  let inner = voice({ eyebrow: '02 · Plataforma', question: '¿Con qué plataforma compramos?', answer: ['Omnicanal'], size: 124, body: 'Basis DSP: un DSP propio, omnicanal y con foco en la región, equivalente a <b>DV360</b> y The Trade Desk para lo que pide Gana.' });
  const stats = [['2001', 'año de fundación'], ['150+', 'clientes en Latinoamérica'], ['40K+', 'campañas ejecutadas'], ['250B', 'impresiones diarias'], ['40+', 'exchanges y SSPs'], ['25K+', 'segmentos de data']];
  stats.forEach(([v, k], i) => {
    const x = 900 + (i % 3) * 300, y = 130 + Math.floor(i / 3) * 190;
    inner += panel(x, y, 280, 170, `<div style="padding:28px 30px"><div style="font-family:${ID};font-size:64px;font-weight:760;letter-spacing:-0.03em;line-height:1;color:#fff">${v}</div><div style="margin-top:12px;font-family:${ST};font-size:17px;font-weight:300;color:${SOFT}">${k}</div></div>`);
  });
  const caps = [['ia', 'Optimización con IA', 'SmartBid ajusta las pujas según el desempeño'], ['seguridad', 'Brand safety', 'DoubleVerify, IAS, Peer39 y Comscore'], ['integracion', 'Integraciones', 'Google CM360, adservers y tableros externos'], ['finanzas', 'Moneda local', 'Campañas en pesos colombianos']];
  caps.forEach(([g, t, d], i) => {
    const x = 900 + (i % 2) * 450, y = 530 + Math.floor(i / 2) * 150;
    inner += panel(x, y, 430, 130, `<div style="display:flex;gap:18px;padding:26px 28px"><div style="flex:none">${icon(g, 34)}</div><div><div style="font-family:${ST};font-size:21px;font-weight:600;color:#fff">${t}</div><div style="margin-top:4px;font-family:${ST};font-size:16px;font-weight:300;line-height:1.4;color:${SOFT}">${d}</div></div></div>`);
  });
  inner += note('Cifras de Basis (propuesta del 19 de octubre de 2026). Basis permite campañas de categorías sensibles como apuestas a nivel de plataforma.', 900, 838, 880);
  inner += facts([['medios', 'Formatos', 'Los siete del RFP'], ['ubicacion', 'Región', 'Foco en Latinoamérica'], ['checklist', 'Mínimos', 'Sin mínimo en plataforma']]);
  slides['05-basis'] = page(inner);
}

// 10 · DOOH en Medellín
{
  let inner = voice({ eyebrow: '03 · DOOH para Gana', question: '¿Cómo se compra el DOOH?', answer: ['Por', 'deals'], body: 'Compramos pantallas de alto tráfico con deals programáticos y elegimos las que cruzan audiencia, horario y cercanía a los <b>puntos de venta</b>.' });
  const venues = [['Sistema Metro', 'Metro, Metrocable, tranvía y Metroplús'], ['Aeropuertos', 'José María Córdova y Olaya Herrera'], ['Centros comerciales', 'Santafé, El Tesoro, Oviedo, Viva Envigado'], ['Mobiliario urbano', 'Paraderos y mupis del Valle de Aburrá'], ['Vallas digitales', 'Corredores de alto tráfico']];
  inner += panel(900, 130, 880, 500, `<div style="padding:30px 40px">${kicker('Zonas objetivo en Medellín')}${venues.map(([t, d], i) => `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:16px 0;border-top:${i ? '1px solid rgba(255,255,255,0.14)' : 'none'};margin-top:${i ? 0 : 10}px"><span style="font-family:${ID};font-size:32px;font-weight:760;letter-spacing:-0.02em;color:#fff">${t}</span><span style="font-family:${ST};font-size:17px;font-weight:300;color:${SOFT}">${d}</span></div>`).join('')}</div>`, true);
  const trio = [['8 días', 'implementación estimada'], ['20 %', 'fee sobre la inversión por deal'], ['Testigos', 'de emisión por pantalla']];
  trio.forEach(([v, k], i) => { inner += panel(900 + i * 300, 656, 280, 150, `<div style="padding:26px 28px"><div style="font-family:${ID};font-size:48px;font-weight:760;letter-spacing:-0.03em;line-height:1;color:#fff">${v}</div><div style="margin-top:10px;font-family:${ST};font-size:16px;font-weight:300;color:${SOFT}">${k}</div></div>`); });
  inner += note('Zonas objetivo, no inventario confirmado: la disponibilidad, los mínimos para testigos y la aprobación de la categoría se confirman con cada circuito. Si Gana activa cobertura nacional, se suman TransMilenio y El Dorado en Bogotá.', 900, 830, 880);
  inner += facts([['ubicacion', 'Se elige', 'Circuito y horario'], ['checklist', 'Se valida', 'Categoría por pantalla'], ['medicion', 'Se mide', 'Impresiones por pantalla']]);
  slides['10-dooh-gana'] = page(inner);
}

// 13 · Entregables
{
  const del = [
    ['Plan estratégico de medios', 'objetivos, audiencias, canales e inversión'], ['Plan de medios por campaña', 'presupuesto, cronograma y segmentación'], ['Configuración en el DSP', 'campañas, píxeles y audiencias'],
    ['Activación omnicanal', 'los siete formatos, DOOH cuando aplique'], ['Optimización continua', 'audiencias, pujas, ubicaciones y presupuesto'], ['Dashboard con acceso', 'para el equipo de Gana'],
    ['Informe ejecutivo mensual', 'KPI, cumplimiento y recomendaciones'], ['Reporte de inversión', 'por canal, formato, plataforma y campaña'], ['Reporte de métricas', 'alcance, CPM, CTR, viewability, VTR'],
    ['Indicadores por objetivo', 'conversiones y ROAS cuando aplique'], ['Optimización y aprendizajes', 'qué cambiamos y por qué'], ['Reuniones de seguimiento', 'resultados y nuevas oportunidades'],
    ['Informe de cierre', 'resultados frente a objetivos']
  ];
  let inner = voice({ eyebrow: '04 · Entregables', question: '¿Qué recibe Gana?', answer: ['Trece', 'entregables'], size: 116, body: 'Los mismos que pide el RFP, en su orden, con un responsable en el equipo de <b>Efeonce</b>.' });
  del.forEach(([t, d], i) => {
    const col = i % 3, row = Math.floor(i / 3), x = 880 + col * 300, y = 120 + row * 160;
    inner += panel(x, y, 284, 144, `<div style="padding:20px 22px"><div style="font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;color:${MUTE}">${String(i + 1).padStart(2, '0')}</div><div style="margin-top:6px;font-family:${ST};font-size:19px;font-weight:600;line-height:1.2;color:#fff">${t}</div><div style="margin-top:6px;font-family:${ST};font-size:14px;font-weight:300;line-height:1.35;color:${SOFT}">${d}</div></div>`, i === 5);
  });
  slides['13-entregables'] = page(inner);
}

// 16 · Equipo
{
  let inner = voice({ eyebrow: '04 · Equipo asignado', question: '¿Quién opera la cuenta?', answer: ['Tu', 'equipo'], body: 'Los tres roles que exige el RFP, asignados a Gana, con el respaldo de operaciones y capacitación de <b>Basis</b>.' });
  const roles = [['Julio Reyes · Managing & GTM Director, Efeonce', 'Director de Cuenta', 'Contraparte de Gana: estrategia, planes de medios, presupuesto y presentación de resultados.'], ['Especialista de Efeonce · con operaciones de Basis', 'Especialista programático · Trader', 'Opera Basis DSP junto al equipo de operaciones de Basis: audiencias, pujas, deals, frecuencia, brand safety y optimización diaria.'], ['Andrés Carlosama · Efeonce', 'Analista de Datos y Performance', 'Dashboard, análisis de KPI, informes mensuales y registro de aprendizajes.']];
  roles.forEach(([k, t, d], i) => { inner += panel(900, 130 + i * 190, 880, 170, `<div style="padding:28px 40px">${kicker(k)}${h3(t, 32)}${p(d)}</div>`, i === 0); });
  inner += panel(900, 714, 880, 120, `<div style="display:flex;gap:28px;align-items:center;height:100%;padding:0 40px"><div style="flex:none">${icon('integracion', 34)}</div><div>${kicker('Respaldo de Basis')}<div style="margin-top:6px;font-family:${ST};font-size:18px;font-weight:300;line-height:1.4;color:${SOFT}">Operaciones, asesoría técnica, Basis DSP Academy y soporte por correo, Teams, Meet y WhatsApp.</div></div></div>`);
  inner += facts([['reunion', 'Dedicación', 'Equipo asignado a Gana'], ['calendario', 'Ritmo', 'Seguimiento periódico'], ['talent', 'Formación', 'Basis DSP Academy']]);
  slides['15-equipo'] = page(inner);
}

// 17 · Escenarios de inversión
{
  let inner = voice({ eyebrow: '05 · Escenarios de inversión', question: '¿Qué compra COP 30 M?', answer: ['2,1 M', 'impresiones'], size: 116, body: 'El escenario base concentra la inversión en tres formatos para lograr <b>masa crítica</b>. El ampliado suma DOOH en Medellín.' });
  const rows = [['Display', '$10.000.000', '$11.000', '909.091'], ['Audio digital', '$10.000.000', '$28.000', '357.143'], ['Video', '$10.000.000', '$12.000', '833.333']];
  const th = (c, a = 'right') => `<div style="text-align:${a};font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE}">${c}</div>`;
  const td = (c, a = 'right', b = false) => `<div style="text-align:${a};font-family:${ST};font-size:20px;font-weight:${b ? 600 : 400};color:#fff;font-variant-numeric:tabular-nums">${c}</div>`;
  const grid = 'display:grid;grid-template-columns:1.4fr 1.3fr 1fr 1.1fr;gap:16px;padding:14px 0';
  let table = `<div style="${grid};border-bottom:1px solid rgba(255,255,255,0.18)">${th('Formato', 'left')}${th('Inversión')}${th('CPM')}${th('Impresiones')}</div>`;
  rows.forEach(r => { table += `<div style="${grid};border-bottom:1px solid rgba(255,255,255,0.10)">${td(r[0], 'left', true)}${td(r[1])}${td(r[2])}${td(r[3])}</div>`; });
  table += `<div style="${grid}">${td('Total base', 'left', true)}${td('$30.000.000', 'right', true)}${td('—')}${td('2.099.567', 'right', true)}</div>`;
  inner += panel(900, 120, 880, 400, `<div style="padding:28px 40px">${kicker('Escenario base · COP 30 M al mes')}${table}<div style="margin-top:6px;font-family:${ST};font-size:15px;font-weight:300;color:${SOFT}">Video: 416.667 vistas completas estimadas (VTR 50 %). CTR estimado 0,3 %: 6.299 clics.</div></div>`, true);
  const bar = (w, c) => `<div style="height:30px;width:${w}%;border-radius:8px;background:${c}"></div>`;
  inner += panel(900, 548, 880, 280, `<div style="padding:28px 40px">${kicker('Escenario ampliado · COP 55 M al mes')}
  <div style="margin-top:18px;display:grid;grid-template-columns:120px 1fr 120px;gap:18px;align-items:center;font-family:${ST};font-size:17px;color:${SOFT}">
  <span>Base</span><div style="display:flex">${bar(54.5, 'rgba(127,182,255,0.45)')}</div><span style="text-align:right;color:#fff;font-weight:600">COP 30 M</span>
  <span>Ampliado</span><div style="display:flex;gap:6px">${bar(54.5, 'rgba(127,182,255,0.45)')}${bar(45.5, 'rgba(217,227,236,0.85)')}</div><span style="text-align:right;color:#fff;font-weight:600">COP 55 M</span></div>
  <div style="margin-top:22px;font-family:${ST};font-size:18px;font-weight:300;line-height:1.45;color:${SOFT}">Suma <b style="color:#fff">COP 25 M en DOOH</b> (CPM estimado $230.000, 108.696 impresiones): 2.208.263 impresiones en total.</div></div>`);
  inner += note('Estimación de Basis DSP sobre audiencias en Medellín (alto poder adquisitivo; deportes, apuestas, eventos deportivos y streaming), compra por CPM en pesos colombianos. Los costos reales dependen de la subasta y se optimizan en campaña.', 900, 852, 880);
  slides['16-escenarios'] = page(inner);
}

// 18 · Propuesta económica
{
  let inner = voice({ eyebrow: '05 · Propuesta económica', question: '¿Cuánto va a medios?', answer: ['Todo', 'desglosado'], size: 116, body: 'Honorarios, comisiones y costos tecnológicos por separado, como pide el RFP, para que Gana sepa cuánto llega a <b>medios</b>.' });
  const items = [['Fee de gestión Efeonce', 'Estrategia, trading, analítica y reportes', 'COP 4.500.000 / mes'], ['Implementación inicial', 'Campañas, píxeles, audiencias y QA', 'Incluida'], ['Inversión en medios', 'Inventario según el plan aprobado', 'COP 30.000.000 / mes'], ['Plataforma DSP', 'Compra, inventario y reportería', '5 % de medios'], ['Inventario premium', 'Pantallas DOOH y mercados privados', '20 % por deal'], ['Audiencias de datos', 'Segmentos de terceros, con aprobación', 'Al activarse'], ['Verificación', 'Brand safety y viewability', 'Al activarse'], ['IVA', 'Sobre los conceptos facturables', '19 %']];
  let rows = '';
  items.forEach(([t, d, v], i) => { rows += `<div style="display:grid;grid-template-columns:1.15fr 1.45fr 1.05fr;gap:20px;align-items:baseline;padding:13px 0;border-top:${i ? '1px solid rgba(255,255,255,0.12)' : 'none'}"><span style="font-family:${ST};font-size:20px;font-weight:600;color:#fff">${t}</span><span style="font-family:${ST};font-size:16px;font-weight:300;color:${SOFT}">${d}</span><span style="text-align:right;white-space:nowrap;font-family:${ST};font-size:19px;font-weight:600;color:#fff">${v}</span></div>`; });
  inner += panel(900, 110, 880, 590, `<div style="padding:24px 40px">${kicker('Concepto · qué incluye · valor')}<div style="margin-top:8px">${rows}</div></div>`, true);
  inner += note('Todos los conceptos los contrata y factura Efeonce. El fee es fijo: no cambia con la inversión en medios y sólo se revisa si cambia el alcance (mercados o campañas simultáneas). Pago a 30 días desde la recepción de la factura.', 900, 724, 880);
  inner += facts([['finanzas', 'Moneda', 'Pesos colombianos'], ['contrato', 'Facturación', 'Efeonce a Gana'], ['calendario', 'Pago', '30 días desde factura']]);
  slides['17-economica'] = page(inner);
}

// 19 · Cumplimiento
{
  let inner = voice({ eyebrow: '05 · Requisitos habilitantes', question: '¿Cumple lo que pide Gana?', answer: ['Punto', 'por punto'], size: 116, body: 'Dónde responde esta propuesta a cada requisito de la hoja técnica del <b>RFP</b>.' });
  const req = [['1', 'Experiencia en programática', 'Anexo', '07 · Anexo'], ['3', 'DSP: DV360, The Trade Desk o equivalente', 'Cumple', '04 · 05 · 06 · 08'], ['4', 'Display, Video, Audio, CTV, Mobile, Native y DOOH', 'Cumple', '10 a 13 · 15 a 18'], ['5', 'Medellín, Antioquia y nacional', 'Cumple', '16 · 17 · 18 · 25'], ['6', 'Director de Cuenta, Trader y Analista', 'Cumple', '23 · 24'], ['7', 'Monitoreo, optimización, reportes y dashboards', 'Cumple', '20 · 21 · 22'], ['9', 'Económica discriminada', 'Cumple', '26']];
  let rows = `<div style="display:grid;grid-template-columns:50px 1.9fr 0.7fr 0.8fr;gap:16px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.18)">${['N.º', 'Requisito', 'Estado', 'Lámina'].map((c, i) => `<span style="text-align:${i === 3 ? 'right' : 'left'};font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE}">${c}</span>`).join('')}</div>`;
  req.forEach(([n, t, s, l]) => { rows += `<div style="display:grid;grid-template-columns:50px 1.9fr 0.7fr 0.8fr;gap:16px;align-items:baseline;padding:16px 0;border-bottom:1px solid rgba(255,255,255,0.10)"><span style="font-family:${ST};font-size:18px;color:${MUTE}">${n}</span><span style="font-family:${ST};font-size:19px;font-weight:500;color:#fff">${t}</span><span style="font-family:${ST};font-size:19px;font-weight:600;color:#fff">${s}</span><span style="text-align:right;font-family:${ST};font-size:18px;color:${SOFT};font-variant-numeric:tabular-nums">${l}</span></div>`; });
  inner += panel(900, 120, 880, 640, `<div style="padding:24px 40px">${rows}</div>`, true);
  inner += note('Numeración de la hoja «Requisitos técnicos» del RFP. Las dos experiencias certificadas, el RUT y la Cámara de Comercio se adjuntan como documentos aparte en la plataforma del proceso.', 900, 784, 880);
  slides['18-cumplimiento'] = page(inner);
}


const LOG = 'file:///Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-19_propuesta-gana-programatica/logos/basis-clientes';

// 06 · Por qué Basis DSP para Gana
{
  let inner = voice({ eyebrow: '02 · Por qué esta plataforma', question: '¿Por qué Basis DSP para Gana?', answer: ['Admite', 'apuestas'], size: 116, body: 'A diferencia de otros DSP, Basis permite campañas de categorías sensibles. Además tiene equipo en <b>Bogotá</b> y foco en la región.' });
  const cards = [
    ['seguridad', 'Categorías sensibles permitidas', 'Alcohol, tabaco, apuestas y política. En DOOH, cada dueño de pantalla aprueba la categoría.'],
    ['ubicacion', 'Presencia en la región', 'Ciudad de México, Ciudad de Guatemala, Bogotá, Lima, Santiago y Buenos Aires. Más de 900 personas.'],
    ['multimedia', 'DOOH en toda Latinoamérica', 'Global, JCDecaux, Promo Espacio y Grupo IMU, por PMP y deals garantizados.'],
    ['codigo', 'Tecnología 100 % propia', 'Innovación, estabilidad y control. API enterprise para conectar tableros y datos, y API de edición.']
  ];
  cards.forEach(([g, t, d], i) => {
    const x = 900 + (i % 2) * 450, y = 130 + Math.floor(i / 2) * 330;
    inner += panel(x, y, 430, 300, `<div style="padding:34px 32px"><div style="height:40px">${icon(g, 40)}</div><div style="margin-top:20px;font-family:${ID};font-size:30px;font-weight:760;letter-spacing:-0.02em;line-height:1.05;color:#fff">${t}</div>${p(d, 18)}</div>`, i === 0);
  });
  inner += note('Fuente: Basis DSP, partner programático de Efeonce, 19 de octubre de 2026.', 900, 812, 880);
  inner += facts([['medios', 'Canales', 'Display, Native, Audio, Video, CTV y DOOH'], ['finanzas', 'Operación', 'En pesos colombianos'], ['integracion', 'Conexión', 'API enterprise']]);
  slides['06-ventajas'] = page(inner);
}

// 07 · Clientes de Basis en la categoría
{
  let inner = voice({ eyebrow: '02 · Experiencia en la categoría', question: '¿Conocen la categoría?', answer: ['La', 'conocemos'], body: 'Esta es una oferta conjunta de Efeonce y Basis DSP. Estas marcas de <b>apuestas</b> ya compran su programática con nosotros en la región.' });
  const logos = [['rushbet', 'Rushbet', 300], ['betplay', 'BetPlay', 200], ['caliente', 'Caliente', 240], ['betfred', 'Betfred', 260], ['betano', 'Betano', 260], ['superbet', 'Superbet', 260], ['coolbet', 'Coolbet', 170], ['bet', 'bet', 210]];
  logos.forEach(([f, alt, w], i) => {
    const x = 900 + (i % 2) * 450, y = 130 + Math.floor(i / 2) * 180;
    inner += panel(x, y, 430, 160, `<div style="display:flex;align-items:center;justify-content:center;height:100%"><img src="${LOG}/${f}-blanco.png" alt="${alt}" style="max-width:${w}px;max-height:96px;width:auto;height:auto;display:block"></div>`);
  });
  inner += note('Clientes de la alianza Efeonce · Basis DSP en la categoría apuestas. Los soportes de experiencia certificada se adjuntan aparte.', 900, 860, 880);
  inner += facts([['checklist', 'Categoría', 'Apuestas, en varios mercados'], ['ubicacion', 'Región', 'Latinoamérica'], ['seguridad', 'Política', 'Categorías sensibles admitidas']]);
  slides['07-clientes-basis'] = page(inner);
}

// 09 · Integraciones
{
  let inner = voice({ eyebrow: '02 · Integraciones', question: '¿Con qué se conecta?', answer: ['Con el', 'ecosistema'], size: 116, body: 'Basis DSP está integrado con los principales exchanges, DMPs, adservers y herramientas de verificación, y su equipo de producto desarrolla <b>integraciones</b> nuevas.' });
  const cols = [
    ['Exchanges y SSPs', '40+ integrados', 'Google, Criteo, Equativ, Taboola, Magnite, OpenX, Place Exchange y Vistar'],
    ['DMPs', '30+ proveedores', 'Comscore, Epsilon, Lotame y Retargetly'],
    ['Adservers', 'Google CM360 nativo', 'Acepta tags de Celtra, Adform, Flashtalking e Innovid'],
    ['Brand safety', 'Verificación', 'Comscore, DoubleVerify, IAS y Peer39'],
    ['Cross-device y viewability', 'Medición', 'Tapad · Pixalate y DoubleVerify'],
    ['Dashboards externos', 'Reportería', 'Tapclicks, Datorama, NinjaCat, DOMO, Funnel.io, Singular y Tableau']
  ];
  cols.forEach(([t, k, d], i) => {
    const x = 900 + (i % 2) * 450, y = 120 + Math.floor(i / 2) * 230;
    inner += panel(x, y, 430, 210, `<div style="padding:28px 32px">${kicker(k)}<div style="margin-top:8px;font-family:${ID};font-size:30px;font-weight:760;letter-spacing:-0.02em;line-height:1.05;color:#fff">${t}</div>${p(d, 17)}</div>`, i === 0);
  });
  inner += note('Integraciones nativas de Basis DSP informadas en su propuesta del 19 de octubre de 2026.', 900, 836, 880);
  slides['09-integraciones'] = page(inner);
}

// 19 · Respaldo de Basis para la operación
{
  let inner = voice({ eyebrow: '04 · Respaldo de la plataforma', question: '¿Quién respalda al equipo?', answer: ['Basis'], body: 'Además del equipo de Efeonce, cada campaña cuenta con el respaldo técnico, la capacitación y la <b>documentación</b> de Basis.' });
  const srv = [['Seat dedicado', 'Audiencias y campañas de Efeonce en su propio portal'], ['Inventarios PMP', 'Contenido premium con seguimiento de Basis'], ['Implementación en paralelo', 'Basis apoya la puesta en marcha y comparte reportería'], ['Integraciones', 'Inventario, data, brand safety y adserving'], ['Asesoría continua', 'Acompañamiento técnico y estratégico'], ['Capacitación y certificación', 'Basis DSP Academy, cursos on-demand']];
  srv.forEach(([t, d], i) => {
    const x = 900 + (i % 3) * 300, y = 120 + Math.floor(i / 3) * 170;
    inner += panel(x, y, 280, 150, `<div style="padding:24px 24px"><div style="font-family:${ST};font-size:20px;font-weight:600;line-height:1.2;color:#fff">${t}</div><div style="margin-top:8px;font-family:${ST};font-size:15px;font-weight:300;line-height:1.4;color:${SOFT}">${d}</div></div>`, i === 0);
  });
  const docs = [['Comercial', 'Showroom Basis DSP LATAM · guía de usuario'], ['Técnica', 'Help Center · documentación API · roadmap'], ['Especificaciones', 'Specs de formatos · políticas de categorías sensibles'], ['Seguimiento', 'Correo, Microsoft Teams, Google Meet y WhatsApp']];
  inner += panel(900, 470, 880, 340, `<div style="padding:28px 40px">${kicker('Documentación y canales de soporte')}${docs.map(([k, v], i) => `<div style="display:grid;grid-template-columns:220px 1fr;gap:20px;align-items:baseline;padding:14px 0;border-top:${i ? '1px solid rgba(255,255,255,0.12)' : 'none'};margin-top:${i ? 0 : 8}px"><span style="font-family:${ST};font-size:19px;font-weight:600;color:#fff">${k}</span><span style="font-family:${ST};font-size:17px;font-weight:300;color:${SOFT}">${v}</span></div>`).join('')}</div>`);
  inner += note('Servicios y documentación que Basis entrega a Efeonce según su propuesta del 19 de octubre de 2026.', 900, 834, 880);
  inner += facts([['talent', 'Formación', 'Basis DSP Academy'], ['reunion', 'Soporte', 'Durante toda la operación'], ['informe', 'Documentación', 'Técnica y comercial']]);
  slides['19-respaldo-basis'] = page(inner);
}


// 14b · Gana en el Metro (simulación)
{
  let inner = voice({ eyebrow: '03 · Así se vería', question: '¿Y Gana en el Metro?', answer: ['En el', 'andén'], body: 'Una pantalla de gran formato sobre el andén, con la campaña vigente de Gana adaptada al <b>formato</b> de la pantalla.' });
  inner += `<div style="position:absolute;left:880px;top:120px;width:900px;height:675px;border-radius:22px;overflow:hidden;border:1.5px solid rgba(255,255,255,0.22);box-shadow:0 30px 80px rgba(0,0,0,0.55)"><img src="file:///Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-19_propuesta-gana-programatica/metro/metro-bello-gana-1600.jpg" alt="Andén de la Estación Bello con una pantalla de Gana" style="width:900px;height:675px;object-fit:cover;display:block"></div>`;
  inner += note('Simulación ilustrativa: pantalla agregada digitalmente a una foto de la Estación Bello del Metro de Medellín (foto: Minoh09, CC BY 4.0). La pieza adapta la campaña vigente de Gana (12 al 18 de octubre de 2026). Ubicación sujeta a inventario y a la aprobación de la categoría.', 880, 818, 900);
  inner += facts([['multimedia', 'Formato', 'Pantalla LED de gran formato'], ['ubicacion', 'Lugar', 'Andenes del Metro'], ['contenido', 'Pieza', 'Adaptada por pantalla']]);
  slides['14-metro-gana'] = page(inner);
}


// 14c · Más ubicaciones en Medellín (simulación)
{
  const E = 'file:///Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-19_propuesta-gana-programatica/metro';
  let inner = voice({ eyebrow: '03 · Así se vería', question: '¿Dónde más en Medellín?', answer: ['Donde', 'pasa'], body: 'Metro, estadio y centros comerciales: la misma campaña adaptada a cada <b>superficie</b> real de la ciudad.' });
  const img = (src, x, y, w, h, alt) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:18px;overflow:hidden;border:1.5px solid rgba(255,255,255,0.22);box-shadow:0 24px 60px rgba(0,0,0,0.5)"><img src="${src}" alt="${alt}" style="width:${w}px;height:${h}px;object-fit:cover;display:block"></div>`;
  const cap = (x, y, w, t, d) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px"><span style="font-family:${ST};font-size:18px;font-weight:600;color:#fff">${t}</span><span style="font-family:${ST};font-size:15px;font-weight:300;color:${SOFT}"> · ${d}</span></div>`;
  inner += img(`${E}/esc-estadio.jpg`, 880, 110, 900, 400, 'Vallas LED y videomarcador del estadio Atanasio Girardot con Gana');
  inner += cap(880, 520, 900, 'Estadio Atanasio Girardot', 'vallas LED de cancha y videomarcador en día de partido');
  inner += img(`${E}/esc-aguacatala.jpg`, 880, 566, 440, 293, 'Pantalla de Gana sobre los torniquetes de la estación Aguacatala');
  inner += img(`${E}/esc-santafe.jpg`, 1340, 566, 440, 293, 'Pendón de Gana en el atrio del Centro Comercial Santafé');
  inner += cap(880, 868, 440, 'Estación Aguacatala', 'sobre los torniquetes');
  inner += cap(1340, 868, 440, 'C. C. Santafé', 'pendón del atrio');
  inner += note('Simulaciones ilustrativas sobre fotos de Wikimedia Commons: estadio (User34790, CC BY-SA 4.0), Aguacatala (Jorge Láscar, CC BY-SA 2.0) y Santafé (Xemenendura, CC BY-SA 4.0); las imágenes intervenidas se comparten bajo la misma licencia. Ubicaciones sujetas a inventario y a la aprobación de la categoría.', 880, 905, 900);
  inner += facts([['ubicacion', 'Ciudad', 'Medellín'], ['multimedia', 'Superficies', 'LED, pantallas y gran formato'], ['contenido', 'Pieza', 'Adaptada a cada una']]);
  slides['14c-mas-ubicaciones'] = page(inner);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [k, html] of Object.entries(slides)) fs.writeFileSync(`${OUT}/${k}.html`, html);
console.log(Object.keys(slides).join('\n'));
