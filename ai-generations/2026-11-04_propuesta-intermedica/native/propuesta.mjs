// Láminas nativas de la propuesta Intermedica (marketing digital y performance, línea Voice, 2026-11-04).
// Gramática de las nativas del brochure «Agencia de Medios» y de la propuesta Gana: voz de la línea a la izquierda,
// vidrio a la derecha, íconos Trazo oficiales. El acento #f83902 sólo en trazos, contornos, arcos y la esfera; nunca
// en texto de menos de 24 px. Registro: «ustedes» formal (Julio, 2026-11-04).
// Fuentes: docs/commercial/accounts/intermedica/ (auditoría 28/10, revalidada el 04/11) y el costeo V3 intermedio
// (docs/commercial/accounts/intermedica/pricing-v3-intermedio-2026-11-04/, requires_review, binding:false).
// Uso: node propuesta.mjs <carpeta-salida>            → montos como [MONTO] (forma para el cliente hasta aprobar)
//      MONTOS=1 node propuesta.mjs <carpeta-salida>   → montos del costeo V3 (borrador interno para Julio)
import fs from 'node:fs';
import { resolveIcon } from '@efeoncepro/axis-graphic-line/icons';

const OUT = process.argv[2];
const SHOW = process.env.MONTOS === '1';
const PRICE = {
  performance: 'USD 3.640', medicion: 'USD 940', nucleo: 'USD 4.580', creatividad: 'USD 590', mensual: 'USD 5.170',
  preparacion: 'USD 2.270', landing: 'USD 2.140', horizonte: 'USD 17.780', medios: 'USD 2.000'
};
const m = (k) => (SHOW || k === 'medios' ? PRICE[k] : '[MONTO]');

const ID = "'Bricolage Grotesque', system-ui, sans-serif", ST = "'Poppins', system-ui, sans-serif";
const NM = 'file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets';
const BUB = `${NM}/url-bubble-baked-dark.svg`;
const ACC = '#f83902', BG = '#001a33', SOFT = '#d9e3ec', MUTE = '#9fb4c8';
const icon = (glyph, size = 32) => resolveIcon({ glyph, size, line: 'voice', surface: 'dark', state: 'rest', idPrefix: `g-${glyph}-${size}` }).svg;
const sphere = `<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:${ACC};margin-left:0.04em"></span>`;

const voice = ({ eyebrow, question, answer, body, size }) => `
<div style="position:absolute;left:140px;top:110px;width:660px">
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
const panel = (x, y, w, h, html, lit = false) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;box-sizing:border-box;${glassCss(lit)}">${html}</div>`;
const kicker = (t) => `<div style="font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE}">${t}</div>`;
const h3 = (t, s = 34) => `<div style="margin-top:6px;font-family:${ID};font-size:${s}px;font-weight:760;letter-spacing:-0.025em;line-height:1.02;color:#fff">${t}</div>`;
const p = (t, s = 18) => `<div style="margin-top:10px;font-family:${ST};font-size:${s}px;font-weight:300;line-height:1.45;color:${SOFT}">${t}</div>`;
const note = (t, x = 900, y = 948, w = 880) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;font-family:${ST};font-size:15px;font-weight:300;line-height:1.45;color:${MUTE}">${t}</div>`;
const chip = (t, lit = false) => `<span style="display:inline-block;font-family:${ST};font-size:14px;font-weight:500;color:#fff;border:1.5px solid ${lit ? ACC : 'rgba(255,255,255,0.35)'};border-radius:999px;padding:4px 14px;white-space:nowrap">${t}</span>`;

const slides = {};

// 02 · Lo que nos pidieron
{
  const items = [
    ['01', 'Análisis de Intermedica', 'Presencia digital, comunicación, campañas y oportunidades', '03 – 07'],
    ['02', 'Equipo de performance', 'Cuántas personas y qué función asume cada una', '08 – 09'],
    ['03', 'Portafolio de servicios', 'Soluciones, alcance, entregables y valor para el negocio', '10 – 16'],
    ['04', 'Propuesta económica', 'Tarifa mensual por servicio y por equipo', '17 – 19']
  ];
  let inner = voice({ eyebrow: 'Propuesta para Intermedica', question: '¿Qué nos pidieron?', answer: ['Cuatro', 'respuestas'], size: 116, body: 'Esta propuesta sigue, en su orden, las cuatro preguntas de su solicitud. Cada capítulo responde a una, con su <b>sustento</b>.' });
  items.forEach(([n, t, d, l], i) => {
    const y = 150 + i * 190, lit = i === 0;
    inner += panel(900, y, 880, 160, `<div style="display:flex;align-items:center;gap:36px;height:100%;padding:0 40px"><div style="font-family:${ID};font-size:60px;font-weight:760;letter-spacing:-0.03em;color:${lit ? '#fff' : MUTE}">${n}</div><div style="flex:1">${h3(t, 36)}${p(d, 19)}</div><div style="font-family:${ST};font-size:15px;font-weight:500;color:${MUTE};white-space:nowrap">Láminas ${l}</div></div>`, lit);
  });
  slides['02-encargo'] = page(inner);
}

// 03 · Quiénes son hoy
{
  let inner = voice({ eyebrow: '01 · Análisis de Intermedica', question: '¿Desde dónde parten?', answer: ['Marcas de', 'referencia'], size: 112, body: 'Cuatro líneas, tecnología de fabricantes reconocidos, servicio técnico propio y formación clínica: una base sólida para <b>vender mejor</b>.' });
  const lines = [
    ['Dermatoestética', 'Fotona, DEKA, InMode, Hydrafacial, Erchonia, QuantifiCare y Celluma'],
    ['Nutrición y composición corporal', 'InBody: de 270S a 970S, BWA 2.0S e InGrip'],
    ['Rehabilitación', 'EnPuls, Emfield Pro, Sono One, Cryo 07, ASA y camillas Naggura'],
    ['Medicina estética', 'Rellenos de la gama Stylage']
  ];
  lines.forEach(([t, d], i) => {
    const x = 900 + (i % 2) * 450, y = 130 + Math.floor(i / 2) * 300;
    inner += panel(x, y, 430, 276, `<div style="padding:34px 32px">${kicker('Línea ' + (i + 1))}<div style="margin-top:12px;font-family:${ID};font-size:32px;font-weight:760;letter-spacing:-0.02em;line-height:1.05;color:#fff">${t}</div>${p(d, 19)}</div>`, i === 0);
  });
  inner += note('Fuente: sitio intermedica.pe y página de LinkedIn de Intermedica, revisados el 28 de octubre y el 4 de noviembre de 2026. La cartera publicada puede variar según disponibilidad.', 900, 760, 880);
  inner += facts([['checklist', 'Servicio técnico', 'Ingenieros certificados por fábrica'], ['ubicacion', 'Red', 'Socios en Lima, Arequipa, Chiclayo y Trujillo'], ['talent', 'Formación', 'Entrenamiento clínico Fotona 2026']]);
  slides['03-quienes'] = page(inner);
}

// 04 · Presencia digital por canal
{
  let inner = voice({ eyebrow: '01 · Presencia digital', question: '¿Cómo se ve hoy en digital?', answer: ['Buena', 'base'], body: 'El catálogo y las fichas ya explican cada equipo. Falta unir esa información con una <b>conversación comercial</b> que se pueda medir.' });
  const rows = [
    ['Sitio y catálogo', 'Cuatro líneas y una ficha por equipo, con información científica, comercial y localizador de centros', 'Fortaleza', false],
    ['Fichas técnicas', 'La consulta de información científica se registra como solicitud de compra', 'Mejora', true],
    ['WhatsApp', 'Seis asesores de Contacto enlazan a un número genérico y el botón general no lleva prefijo internacional', 'Mejora', true],
    ['Enlaces', 'Academy y Términos y Condiciones llevan a páginas que no existen (error 404)', 'Mejora', true],
    ['LinkedIn', 'Promueve el entrenamiento clínico Fotona 2026 con inscripción por formulario externo', 'Fortaleza', false],
    ['Pauta y búsqueda', 'Sin datos públicos suficientes: se leen con acceso a sus cuentas', 'Por medir', false],
    ['Medición', 'Las etiquetas de analítica no se confirman desde fuera: se auditan con acceso', 'Por medir', false]
  ];
  let t = '';
  rows.forEach(([c, d, s, lit], i) => { t += `<div style="display:grid;grid-template-columns:200px 1fr 130px;gap:22px;align-items:center;padding:15px 0;border-top:${i ? '1px solid rgba(255,255,255,0.12)' : 'none'}"><span style="font-family:${ST};font-size:19px;font-weight:600;color:#fff">${c}</span><span style="font-family:${ST};font-size:16px;font-weight:300;line-height:1.4;color:${SOFT}">${d}</span><span style="text-align:right">${chip(s, lit)}</span></div>`; });
  inner += panel(880, 110, 900, 760, `<div style="padding:22px 40px">${kicker('Canal · lo que vimos · lectura')}<div style="margin-top:6px">${t}</div></div>`, true);
  inner += note('Revisión pública del 28 de octubre de 2026; enlaces, WhatsApp y fichas revalidados el 4 de noviembre. La inversión publicitaria y su rendimiento se revisan con los accesos que Intermedica autorice.', 880, 892, 900);
  slides['04-presencia'] = page(inner);
}

// 05 · Comunicación y campañas
{
  let inner = voice({ eyebrow: '01 · Comunicación y campañas', question: '¿Qué comunican los demás?', answer: ['Formación', 'y oferta'], size: 112, body: 'En Perú, otros distribuidores convierten cursos, asesoría y promociones en <b>motivos para escribir</b>. Intermedica comunica sobre todo su catálogo.' });
  const comp = [
    ['Estetika Medika', 'Dermatoestética', 'Academy virtual y asesoría para emprender en estética: la formación como puerta de entrada.'],
    ['HM Medical', 'Rehabilitación', 'Cursos con fecha, promociones de temporada y una ruta propia para ventas corporativas.'],
    ['Phymed', 'Rehabilitación', 'Proyectos y soporte técnico como argumento de compra.'],
  ];
  comp.forEach(([n, k, d], i) => { inner += panel(900, 120 + i * 180, 880, 160, `<div style="padding:26px 40px">${kicker(k)}${h3(n, 30)}${p(d, 18)}</div>`); });
  inner += panel(900, 668, 880, 180, `<div style="padding:28px 40px">${kicker('Intermedica')}${h3('La oportunidad', 30)}${p('Tiene el catálogo técnico y la formación clínica. Puede comunicar por necesidad profesional —qué equipo conviene a cada centro, cómo se implementa y qué respaldo tiene— en lugar de por producto.', 18)}</div>`, true);
  inner += note('Sitios públicos consultados el 28 de octubre de 2026. Compara mensajes, no resultados comerciales ni desempeño clínico.', 900, 872, 880);
  slides['05-comunicacion'] = page(inner);
}

// 06 · Cinco oportunidades
{
  let inner = voice({ eyebrow: '01 · Oportunidades de mejora', question: '¿Dónde está la oportunidad?', answer: ['Cinco', 'frentes'], body: 'Tres se resuelven en la preparación. Dos construyen la operación comercial que sostiene la <b>inversión en pauta</b>.' });
  const ops = [
    ['Rápida', 'WhatsApp que llega al asesor', 'Cada tarjeta de Contacto con el número real de su asesor y el botón general con prefijo 51.'],
    ['Rápida', 'Enlaces con destino', 'Academy y Términos y Condiciones vuelven a una página vigente.'],
    ['Rápida', 'Consulta científica separada', 'Una pregunta técnica deja de registrarse como intención de compra, para atenderla y medirla por separado.'],
    ['Estructural', 'Medición hasta la cotización', 'Saber qué campaña trae consultas válidas, demostraciones y cotizaciones, no sólo clics.'],
    ['Estructural', 'Formación que abre ventas', 'Cada inscripción a un curso continúa en una conversación comercial con seguimiento.']
  ];
  ops.forEach(([k, t, d], i) => { inner += panel(900, 110 + i * 150, 880, 132, `<div style="display:flex;gap:30px;align-items:center;height:100%;padding:0 36px"><div style="flex:none;width:118px">${chip(k, k === 'Estructural')}</div><div>${h3(t, 28)}<div style="margin-top:6px;font-family:${ST};font-size:17px;font-weight:300;line-height:1.4;color:${SOFT}">${d}</div></div></div>`, i === 3); });
  inner += facts([['calendario', 'Rápidas', 'En las tres semanas de preparación'], ['medicion', 'Estructurales', 'Desde el primer mes de operación'], ['checklist', 'Evidencia', 'Revalidada el 4 de noviembre']]);
  slides['06-oportunidades'] = page(inner);
}

// 07 · El recorrido
{
  let inner = voice({ eyebrow: '01 · El recorrido propuesto', question: '¿Qué cambia?', answer: ['El', 'recorrido'], body: 'Del interés de un profesional a una cotización, con un responsable en cada paso y una <b>métrica</b> que lo prueba.' });
  const steps = [['Descubre', 'Búsqueda, LinkedIn y Meta'], ['Evalúa', 'Ficha y contenido técnico'], ['Conversa', 'WhatsApp o formulario al asesor'], ['Demuestra', 'Demo o visita al showroom'], ['Cotiza', 'Propuesta y seguimiento']];
  const x0 = 900, w = 160, gap = 20;
  inner += `<svg width="1920" height="1080" style="position:absolute;inset:0;pointer-events:none"><line x1="${x0 + 40}" y1="300" x2="${x0 + 5 * (w + gap) - gap - 40}" y2="300" stroke="rgba(255,255,255,0.25)" stroke-width="2"/><line x1="${x0 + 40}" y1="300" x2="${x0 + 4 * (w + gap) + w / 2}" y2="300" stroke="${ACC}" stroke-width="3"/><circle cx="${x0 + 4 * (w + gap) + w / 2}" cy="300" r="11" fill="${ACC}"/></svg>`;
  steps.forEach(([t, d], i) => { inner += panel(x0 + i * (w + gap), 140, w, 120, `<div style="padding:18px 16px"><div style="font-family:${ST};font-size:13px;font-weight:600;letter-spacing:0.14em;color:${MUTE}">0${i + 1}</div><div style="margin-top:4px;font-family:${ID};font-size:24px;font-weight:760;letter-spacing:-0.02em;color:#fff">${t}</div></div>`, i === 4); inner += `<div style="position:absolute;left:${x0 + i * (w + gap)}px;top:326px;width:${w}px;font-family:${ST};font-size:15px;font-weight:300;line-height:1.35;color:${SOFT}">${d}</div>`; });
  const lines = [['Dermatoestética', 'Formación clínica → asesoría → demostración del equipo'], ['Nutrición · InBody', 'Necesidad del centro → modelo adecuado → evaluación'], ['Rehabilitación', 'Proyecto del centro → criterios técnicos → demostración']];
  inner += panel(900, 430, 880, 400, `<div style="padding:28px 40px">${kicker('Tres recorridos candidatos, uno por línea')}${lines.map(([t, d], i) => `<div style="display:grid;grid-template-columns:260px 1fr;gap:20px;align-items:baseline;padding:20px 0;border-top:${i ? '1px solid rgba(255,255,255,0.12)' : 'none'};margin-top:${i ? 0 : 10}px"><span style="font-family:${ID};font-size:28px;font-weight:760;letter-spacing:-0.02em;color:#fff">${t}</span><span style="font-family:${ST};font-size:18px;font-weight:300;color:${SOFT}">${d}</span></div>`).join('')}<div style="margin-top:10px;font-family:${ST};font-size:16px;font-weight:300;color:${MUTE}">Las dos líneas de arranque se eligen con ustedes según margen, stock, capacidad de demostración y ciclo de venta.</div></div>`, true);
  slides['07-recorrido'] = page(inner);
}

// 08 · El equipo
{
  let inner = voice({ eyebrow: '02 · Equipo de performance', question: '¿Cuántas personas?', answer: ['Cinco', 'personas'], body: 'Un equipo asignado a su cuenta, con un solo responsable frente a ustedes. La preparación suma especialistas de <b>medición y web</b> durante su fase.' });
  const roles = [
    ['Referente de la cuenta', 'Líder de performance', 'Define prioridades y plan de pruebas, opera las campañas clave y presenta resultados en el comité mensual.'],
    ['Operación diaria', 'Especialista de medios pagados', 'Configura y optimiza Google, Meta y LinkedIn: audiencias, pujas, presupuesto y chequeos programados.'],
    ['Datos', 'Analista de datos y medición', 'Mantiene eventos y tablero, y cruza la inversión con consultas válidas, demostraciones y cotizaciones.'],
    ['Creatividad', 'Diseñador de performance', 'Produce las piezas maestras y sus adaptaciones para cada hipótesis de prueba.'],
    ['Creatividad', 'Redactor', 'Escribe mensajes por necesidad profesional, validados por su aprobador técnico.']
  ];
  roles.forEach(([k, t, d], i) => { inner += panel(900, 104 + i * 156, 880, 140, `<div style="padding:22px 40px">${kicker(k)}${h3(t, 28)}<div style="margin-top:6px;font-family:${ST};font-size:17px;font-weight:300;line-height:1.4;color:${SOFT}">${d}</div></div>`, i === 0); });
  inner += facts([['reunion', 'Interlocutor', 'Un responsable de cuenta'], ['calendario', 'Ritmo', 'Chequeos dos veces por semana'], ['talent', 'Respaldo', '+89 profesionales en Latinoamérica']]);
  slides['08-equipo'] = page(inner);
}

// 09 · Cómo trabajamos
{
  let inner = voice({ eyebrow: '02 · Forma de trabajo', question: '¿Cómo trabajamos juntos?', answer: ['Con', 'ritmo'], body: 'Un calendario fijo de revisión y decisión, y tres contrapartes de Intermedica con <b>roles claros</b>.' });
  const cad = [['Dos veces por semana', 'Chequeo de campañas y ajustes registrados en la bitácora'], ['Cada quince días', 'Lectura de consultas válidas junto al equipo de ventas'], ['Cada mes', 'Reporte de inversión y avance comercial, y comité de 60 minutos'], ['Cada tres meses', 'Recomendación de inversión para el siguiente ciclo']];
  inner += panel(900, 120, 880, 400, `<div style="padding:26px 40px">${kicker('Efeonce')}${cad.map(([t, d], i) => `<div style="display:grid;grid-template-columns:250px 1fr;gap:20px;align-items:baseline;padding:16px 0;border-top:${i ? '1px solid rgba(255,255,255,0.12)' : 'none'};margin-top:${i ? 0 : 8}px"><span style="font-family:${ST};font-size:20px;font-weight:600;color:#fff">${t}</span><span style="font-family:${ST};font-size:17px;font-weight:300;color:${SOFT}">${d}</span></div>`).join('')}</div>`, true);
  const cp = [['Marketing', 'Aprueba mensajes, materiales y accesos'], ['Ventas', 'Atiende consultas y devuelve su avance'], ['Aprobador técnico', 'Valida las afirmaciones de producto']];
  cp.forEach(([t, d], i) => { inner += panel(900 + i * 300, 548, 280, 200, `<div style="padding:26px 26px">${kicker('Intermedica')}<div style="margin-top:8px;font-family:${ID};font-size:28px;font-weight:760;letter-spacing:-0.02em;color:#fff">${t}</div>${p(d, 17)}</div>`); });
  inner += note('Las tres funciones pueden recaer en una misma persona, siempre que pueda responder y decidir en los plazos del calendario.', 900, 772, 880);
  inner += facts([['reunion', 'Canal', 'Microsoft Teams y WhatsApp'], ['informe', 'Tablero', 'Compartido, con acceso de su equipo'], ['contrato', 'Bitácora', 'Cada decisión con su motivo']]);
  slides['09-ritmo'] = page(inner);
}

// 10 · Portafolio en tres capas
{
  let inner = voice({ eyebrow: '03 · Portafolio de servicios', question: '¿Qué podemos hacer?', answer: ['Tres', 'capas'], body: 'Un núcleo que opera desde el primer mes, servicios que lo potencian y una expansión que se activa cuando los <b>datos</b> lo justifiquen.' });
  const cols = [
    ['Núcleo', 'Desde el mes 1', [['Performance gestionado', 'Campañas que traen compradores profesionales'], ['Medición y analítica', 'Inversión conectada con demos y cotizaciones']]],
    ['Recomendado', 'Lo potencia', [['Creatividad de performance', 'Argumentos que se prueban cada mes'], ['Conversión web por línea', 'Menos pasos hasta pedir una demo']]],
    ['Expansión', 'Cuando haya datos', [['Contenido técnico y SEO/AEO', 'Que Google y la IA respondan con Intermedica'], ['Pipeline comercial en CRM', 'Ventas y marketing con los mismos datos'], ['Formación como captación', 'Cursos que abren conversaciones']]]
  ];
  cols.forEach(([k, s, items], i) => {
    inner += panel(880 + i * 306, 120, 290, 640, `<div style="padding:30px 26px">${kicker(s)}<div style="margin-top:8px;font-family:${ID};font-size:33px;font-weight:760;letter-spacing:-0.03em;color:#fff">${k}</div>${items.map(([t, d]) => `<div style="margin-top:28px;padding-top:22px;border-top:1px solid rgba(255,255,255,0.14)"><div style="font-family:${ST};font-size:22px;font-weight:600;line-height:1.25;color:#fff">${t}</div><div style="margin-top:6px;font-family:${ST};font-size:17px;font-weight:300;line-height:1.4;color:${SOFT}">${d}</div></div>`).join('')}</div>`, i === 0);
  });
  slides['10-portafolio'] = page(inner);
}

// 11 · Núcleo
{
  let inner = voice({ eyebrow: '03 · Núcleo', question: '¿Qué incluye el núcleo?', answer: ['Operar', 'y medir'], body: 'La operación mensual de campañas y la medición que conecta cada peso de la inversión con su <b>avance comercial</b>.' });
  const svc = [
    ['Performance gestionado', ['2 líneas de negocio en Perú', 'Hasta 3 canales: Google Search, Meta y LinkedIn', 'Hasta 6 campañas activas en total', '3 hipótesis de prueba nuevas al mes', '8 chequeos programados al mes'], 'Plan de medios y de pruebas, campañas configuradas, bitácora de decisiones y reporte mensual', 'La inversión se concentra en consultas de compradores profesionales'],
    ['Medición y analítica', ['Eventos de formulario, WhatsApp y llamadas', 'Tablero con inversión, consultas y avance', 'Revisión mensual de la medición'], 'Diccionario de etapas, tablero compartido y lectura quincenal con ventas', 'Saber qué campaña trae demostraciones y cotizaciones, no sólo clics']
  ];
  svc.forEach(([t, alc, ent, val], i) => {
    inner += panel(880, 110 + i * 400, 900, 380, `<div style="padding:28px 40px;display:grid;grid-template-columns:1.1fr 1fr;gap:34px"><div>${kicker('Servicio ' + (i + 1))}${h3(t, 32)}<div style="margin-top:14px">${alc.map(a => `<div style="display:flex;gap:12px;align-items:baseline;margin-top:8px;font-family:${ST};font-size:17px;font-weight:400;color:#fff"><span style="flex:none;width:8px;height:8px;border-radius:50%;border:2px solid ${ACC};transform:translateY(-2px)"></span>${a}</div>`).join('')}</div></div><div>${kicker('Entregables')}${p(ent, 17)}<div style="margin-top:20px">${kicker('Valor para el negocio')}</div>${p(val, 17)}</div></div>`, i === 0);
  });
  slides['11-nucleo'] = page(inner);
}

// 13 · Recomendado
{
  let inner = voice({ eyebrow: '03 · Recomendado', question: '¿Qué lo potencia?', answer: ['Piezas', 'y páginas'], size: 116, body: 'Creatividad hecha para probar argumentos y páginas que facilitan <b>pedir una demo</b>.' });
  const svc = [
    ['Creatividad de performance', 'Mensual', ['6 conceptos con mensaje y copy', '6 piezas maestras, una por concepto', '12 adaptaciones de formato', '2 rondas de ajustes por lote'], 'Se trabaja con fichas, fotografías y afirmaciones aprobadas por Intermedica y los fabricantes.', 'Aprender qué argumento mueve a cada comprador'],
    ['Conversión web por línea', 'Proyecto único · opcional', ['Una landing por cada línea prioritaria', 'Formulario, WhatsApp y medición integrados', 'Sobre su sitio actual'], 'Diseño, redacción, implementación y prueba de medición.', 'Menos pasos entre el interés y la demostración']
  ];
  svc.forEach(([t, k, alc, ent, val], i) => {
    inner += panel(880, 110 + i * 400, 900, 380, `<div style="padding:28px 40px;display:grid;grid-template-columns:1.1fr 1fr;gap:34px"><div>${kicker(k)}${h3(t, 32)}<div style="margin-top:14px">${alc.map(a => `<div style="display:flex;gap:12px;align-items:baseline;margin-top:8px;font-family:${ST};font-size:17px;font-weight:400;color:#fff"><span style="flex:none;width:8px;height:8px;border-radius:50%;border:2px solid ${ACC};transform:translateY(-2px)"></span>${a}</div>`).join('')}</div></div><div>${kicker('Cómo se produce')}${p(ent, 17)}<div style="margin-top:20px">${kicker('Valor para el negocio')}</div>${p(val, 17)}</div></div>`, i === 0);
  });
  slides['13-recomendado'] = page(inner);
}

// 14 · Expansión
{
  let inner = voice({ eyebrow: '03 · Expansión', question: '¿Y cuando funcione?', answer: ['Crecer'], body: 'Servicios que se suman cuando la operación muestre dónde está la demanda. Cada uno con su propia propuesta y <b>alcance</b>.' });
  const ex = [
    ['busqueda', 'Contenido técnico y SEO/AEO', 'Que Google y los asistentes de IA respondan con Intermedica cuando un profesional pregunta por una tecnología.'],
    ['integracion', 'Pipeline comercial en CRM', 'Etapas, responsables y devolución de ventas a marketing, en HubSpot o en su CRM actual.'],
    ['talent', 'Formación como captación', 'Cada curso con inscripción medida, seguimiento comercial y contenido que lo prolonga.'],
    ['ia', 'Piloto en ChatGPT Ads', 'Un canal nuevo, disponible en Perú, para llegar a profesionales mientras investigan.']
  ];
  ex.forEach(([g, t, d], i) => {
    const x = 900 + (i % 2) * 450, y = 130 + Math.floor(i / 2) * 330;
    inner += panel(x, y, 430, 300, `<div style="padding:34px 32px"><div style="height:40px">${icon(g, 40)}</div><div style="margin-top:20px;font-family:${ID};font-size:30px;font-weight:760;letter-spacing:-0.02em;line-height:1.05;color:#fff">${t}</div>${p(d, 18)}</div>`, i === 0);
  });
  slides['14-expansion'] = page(inner);
}

// 17 · Tarifa mensual desglosada
{
  let inner = voice({ eyebrow: '04 · Propuesta económica', question: '¿Cuánto cuesta al mes?', answer: ['Por', 'servicio'], body: 'Cada servicio con su equipo y su tarifa. La inversión en medios se paga directo a las plataformas, en cuentas de <b>Intermedica</b>.' });
  const rows = [
    ['Performance gestionado', 'Líder de performance · especialista de medios', `${m('performance')} / mes`, false],
    ['Medición y analítica', 'Analista de datos · implementación de medición', `${m('medicion')} / mes`, false],
    ['Núcleo mensual', '', `${m('nucleo')} / mes`, true],
    ['Creatividad de performance', 'Diseñador · redactor', `${m('creatividad')} / mes`, false],
    ['Total mensual recomendado', 'Núcleo + creatividad', `${m('mensual')} / mes`, true],
    ['Preparación · pago único', 'Líder, analista y especialistas de medición y web', m('preparacion'), false],
    ['Conversión web · opcional', 'Dos landings, una por línea · pago único', m('landing'), false]
  ];
  let t = '';
  rows.forEach(([s, e, v, b], i) => { t += `<div style="display:grid;grid-template-columns:1.25fr 1.35fr 0.9fr;gap:20px;align-items:baseline;padding:${b ? 18 : 14}px 0;border-top:${i ? `1px solid rgba(255,255,255,${b ? 0.3 : 0.12})` : 'none'}"><span style="font-family:${b ? ID : ST};font-size:${b ? 24 : 20}px;font-weight:${b ? 760 : 600};letter-spacing:${b ? '-0.01em' : '0'};color:#fff">${s}</span><span style="font-family:${ST};font-size:16px;font-weight:300;color:${SOFT}">${e}</span><span style="text-align:right;white-space:nowrap;font-family:${ST};font-size:${b ? 24 : 20}px;font-weight:600;color:#fff;font-variant-numeric:tabular-nums">${v}</span></div>`; });
  inner += panel(880, 110, 900, 640, `<div style="padding:24px 40px">${kicker('Servicio · equipo · tarifa')}<div style="margin-top:8px">${t}</div></div>`, true);
  inner += note(`Valores netos en dólares estadounidenses; los impuestos se aplican según la normativa vigente. Medios sugeridos: hasta ${m('medios')} al mes, pagados directamente a Google, Meta y LinkedIn.`, 880, 774, 900);
  inner += facts([['finanzas', 'Moneda', 'Dólares estadounidenses'], ['contrato', 'Medios', 'Pagados directo por Intermedica'], ['checklist', 'Tarifa', 'Por servicio, no por hora']]);
  slides['17-tarifa'] = page(inner);
}

// 18 · Inversión del horizonte y condiciones
{
  let inner = voice({ eyebrow: '04 · Inversión total', question: '¿Cuánto es en total?', answer: ['Todo', 'a la vista'], size: 116, body: 'Preparación y tres meses de operación en una sola cifra, con los <b>medios</b> por separado.' });
  inner += panel(880, 110, 900, 330, `<div style="padding:30px 40px">${kicker('Preparación + 3 meses con creatividad')}<div style="margin-top:10px;font-family:${ID};font-size:112px;font-weight:760;letter-spacing:-0.04em;line-height:1;color:#fff;font-variant-numeric:tabular-nums">${m('horizonte')}</div>
  <div style="margin-top:26px;display:flex;gap:6px;height:30px"><div style="width:13%;border-radius:8px;background:rgba(217,227,236,0.85)"></div><div style="width:87%;border-radius:8px;background:rgba(127,182,255,0.5)"></div></div>
  <div style="margin-top:12px;display:flex;justify-content:space-between;font-family:${ST};font-size:16px;font-weight:400;color:${SOFT}"><span>Preparación ${m('preparacion')}</span><span>3 meses × ${m('mensual')}</span></div></div>`, true);
  const cond = [['Pago', 'Honorarios mensuales por adelantado, por bloque de 30 días'], ['Medios', `Techo sugerido de ${m('medios')} al mes, en cuentas de Intermedica y aprobado antes de invertirse`], ['Horizonte', 'Tres meses de operación tras la preparación, sin renovación automática'], ['Moneda e impuestos', 'Valores netos en USD; impuestos según la normativa vigente'], ['Vigencia', 'Esta propuesta es válida por 30 días']];
  inner += panel(880, 464, 900, 400, `<div style="padding:24px 40px">${kicker('Condiciones')}${cond.map(([k, v], i) => `<div style="display:grid;grid-template-columns:230px 1fr;gap:20px;align-items:baseline;padding:13px 0;border-top:${i ? '1px solid rgba(255,255,255,0.12)' : 'none'};margin-top:${i ? 0 : 6}px"><span style="font-family:${ST};font-size:19px;font-weight:600;color:#fff">${k}</span><span style="font-family:${ST};font-size:17px;font-weight:300;color:${SOFT}">${v}</span></div>`).join('')}</div>`);
  slides['18-total'] = page(inner);
}

// 19 · Technogym por separado
{
  let inner = voice({ eyebrow: '04 · Alcance', question: '¿Y Technogym?', answer: ['Por', 'separado'], body: 'Esta propuesta cubre sólo a Intermedica. Su equipo, su alcance y su tarifa no se comparten ni se descuentan con <b>otra cuenta</b>.' });
  inner += panel(900, 150, 430, 400, `<div style="padding:36px 34px">${kicker('Esta propuesta')}<img src="file:///Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-04_propuesta-intermedica/logos/intermedica-blanco.png" alt="Intermedica" style="display:block;margin-top:24px;height:62px;width:auto">${p('Cuatro líneas de negocio en Perú, con el equipo de la lámina 08 y la tarifa de la lámina 17.', 19)}</div>`, true);
  inner += panel(1350, 150, 430, 400, `<div style="padding:36px 34px">${kicker('Propuesta aparte')}<div style="margin-top:22px;font-family:${ID};font-size:44px;font-weight:760;letter-spacing:-0.03em;color:#fff">Technogym</div>${p('Si lo desean, preparamos una propuesta independiente, con diagnóstico, equipo y economía propios. Así cada marca evalúa su inversión con números limpios.', 19)}</div>`);
  inner += facts([['checklist', 'Alcance', 'Una propuesta por marca'], ['finanzas', 'Economía', 'Tarifas independientes'], ['reunion', 'Equipo', 'Asignado a cada cuenta']]);
  slides['19-technogym'] = page(inner);
}

// 23 · Próximos pasos
{
  let inner = voice({ eyebrow: 'Próximos pasos', question: '¿Cómo empezamos?', answer: ['Tres', 'decisiones'], size: 116, body: 'Con estas tres definiciones ajustamos el alcance final y emitimos la <b>cotización formal</b>.' });
  const st = [['Líneas y comprador prioritarios', 'Qué dos líneas abren la operación y a qué profesional le hablamos primero.'], ['Inversión en medios', 'El techo mensual que Intermedica puede sostener durante los tres meses.'], ['Contrapartes y accesos', 'Marketing, ventas y aprobador técnico; cuentas de Google, Meta, sitio y analítica.']];
  st.forEach(([t, d], i) => { inner += panel(900, 120 + i * 180, 880, 160, `<div style="display:flex;gap:30px;align-items:center;height:100%;padding:0 40px"><div style="font-family:${ID};font-size:56px;font-weight:760;letter-spacing:-0.03em;color:${i === 0 ? '#fff' : MUTE}">0${i + 1}</div><div>${h3(t, 30)}${p(d, 18)}</div></div>`, i === 0); });
  inner += panel(900, 680, 880, 150, `<div style="display:flex;gap:28px;align-items:center;height:100%;padding:0 40px"><div style="flex:none">${icon('reunion', 40)}</div><div>${kicker('Su contacto en Efeonce')}<div style="margin-top:6px;font-family:${ID};font-size:30px;font-weight:760;letter-spacing:-0.02em;color:#fff">Julio Reyes</div><div style="margin-top:2px;font-family:${ST};font-size:17px;font-weight:300;color:${SOFT}">Managing Director & GTM · jreyes@efeoncepro.com</div></div></div>`);
  slides['23-pasos'] = page(inner);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [k, html] of Object.entries(slides)) fs.writeFileSync(`${OUT}/${k}.html`, html);
console.log(Object.keys(slides).join('\n'));
