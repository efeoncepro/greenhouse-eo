// Versión corta (25 láminas) del brochure 360, armada desde laminas-v9 por código. Criterio en LEEME (2026-10-16).
// Uso: node armar-corto.cjs   (desde esta carpeta)
const fs = require('fs'), path = require('path');
const CORTO = ['Main', 'V02', 'V03', 'V04', 'IDX', 'QSM',
  'C01', 'V06', 'BIC',            // Engine: portada, la IA ya recomienda a tu competencia, caso BICECORP
  'C02', 'K13', 'CC1',            // Brand: portada, seis capacidades, activación (Channel & Commerce)
  'C03', 'D03',                   // Voice: portada, todo el ciclo
  'C04', 'R19', 'ANM',            // Revenue: portada, el CRM se llena solo, caso ANAM
  'C05', 'INSG',                  // Growth: portada, cada dato su gráfico
  'V17', 'V18',                   // Cómo lo vives: sabes quién hace qué, trabajas en vivo
  'S25',                          // La prueba: +90 empresas
  'S30', 'S32', 'S33'];           // Cómo empiezas: empiezas chico, empecemos, contraportada
const L = 'laminas-v9', O = 'laminas-corto';
const byCode = Object.fromEntries(fs.readdirSync(L).filter(f => f.endsWith('.jpg')).map(f => [f.split('-')[1], f]));
fs.rmSync(O, { recursive: true, force: true }); fs.mkdirSync(O);
CORTO.forEach((c, i) => { const f = byCode[c]; if (!f) throw new Error('falta ' + c);
  fs.copyFileSync(path.join(L, f), path.join(O, String(i + 1).padStart(2, '0') + '-' + f.split('-').slice(1).join('-'))); });
console.log(CORTO.length, 'láminas en', O);
