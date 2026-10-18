// Renderiza la lámina índice (IDX) de una versión según el orden real de sus láminas.
// Uso (desde la raíz del repo): node ai-generations/2026-10-12_brochure-efeonce-360/armar-indice.mjs <dirLaminas>
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const dir = path.resolve(process.argv[2]);
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).sort();
const page = codes => { for (const c of [].concat(codes)) { const i = files.findIndex(f => f.split('-')[1] === c); if (i >= 0) return { pagina: i + 1, to: c }; } return null; };
const G = '#e2e2e2';
export const FILAS = [
  { titulo: 'Quiénes somos', sub: 'Un solo equipo', color: G, to: 'QSM' },
  { n: '01', titulo: 'Engine', sub: 'Te encuentran', color: '#0375db', to: 'C01' },
  { n: '02', titulo: 'Brand', sub: 'Te recuerdan', color: '#ff6500', to: 'C02' },
  { sub2: true, titulo: 'Channel & Commerce', sub: 'Trade marketing y BTL', color: '#ff6500', to: 'CC1' },
  { n: '03', titulo: 'Voice', sub: 'Llegas a quien compra', color: '#f83902', to: 'C03' },
  { n: '04', titulo: 'Revenue', sub: 'Te compran', color: '#e86bd0', to: 'C04' },
  { n: '05', titulo: 'Growth', sub: 'Lo mides', color: '#36c8bf', to: 'C05' },
  { titulo: 'Cómo lo vives', sub: 'Equipo, inicio y día a día', color: G, to: ['EQP', 'V17'] },
  { titulo: 'La prueba', sub: 'Clientes, partners y países', color: G, to: 'S25' },
  { titulo: 'Cómo empiezas', sub: 'Capacidad y primer paso', color: G, to: ['S29', 'S30', 'S32'] },
];
const rows = FILAS.map(r => ({ ...r, ...page(r.to) })).filter(r => r.pagina);
fs.writeFileSync(path.join(dir, '.indice.json'), JSON.stringify(rows.map(r => r.to)));
const tmp = fs.mkdtempSync('/tmp/idx-'); const h = path.join(tmp, 'IDX.html'), p = path.join(tmp, 'IDX.png');
execFileSync('node', [path.join(HERE, 'native-growth/indice.mjs'), h, JSON.stringify(rows)]);
execFileSync('node', [path.resolve(HERE, '../2026-09-29_deck-seo-aeo-documentos/render-src/shot.cjs'), h, p]);
const i = files.findIndex(f => f.split('-')[1] === 'IDX');
const dst = path.join(dir, i >= 0 ? files[i] : `05-IDX-indice.jpg`);
await sharp(p).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toFile(dst);
console.log('IDX →', path.basename(dst), rows.map(r => `${r.to}:${r.pagina}`).join(' '));
