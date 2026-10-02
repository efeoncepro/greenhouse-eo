// Exploración 05 · utilidades compartidas. Texto trazado con fuentes reales (Bricolage del repo, Poppins local);
// logos oficiales de public/branding embebidos sin redibujar.
import {readFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import * as fontkit from 'fontkit';
export const dir=dirname(fileURLToPath(import.meta.url)),root=join(dir,'../../..');
const brico=fontkit.openSync(join(root,'src/assets/fonts/BricolageGrotesque-Variable.ttf'));
const pop={};for(const w of ['Light','Regular','Medium','SemiBold','Bold'])pop[w]=fontkit.openSync(`/Users/jreye/Library/Fonts/Poppins-${w}.ttf`);
export const C={navy:'#023C70',blue:'#0375DB',white:'#FFFFFF',paper:'#F7F8F6',gray:'#848484',ink:'#0B1F33',pale:'#DCE9F7'};
export const svg=(w,h,s,bg)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg?`<rect width="${w}" height="${h}" fill="${bg}"/>`:''}${s}</svg>`;
export const rect=(x,y,w,h,c,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" ${extra}/>`;
function font(o){if(o.family==='poppins')return pop[o.weight||'Regular'];return brico.getVariation({wght:o.wght??760,wdth:o.wdth??96,opsz:o.opsz??88});}
// Mide y traza. anchor: start|middle|end. y = línea base.
export function layout(t,size,o={}){const f=font(o);const run=f.layout(t);const sc=size/f.unitsPerEm;let dx=0;const g=[];const tr=(o.tracking??(o.family==='poppins'?0:-0.03))*size;
 for(let i=0;i<run.glyphs.length;i++){const gl=run.glyphs[i],p=run.positions[i];g.push(`<path d="${gl.path.toSVG()}" transform="translate(${(dx+p.xOffset*sc).toFixed(2)} ${(-p.yOffset*sc).toFixed(2)}) scale(${sc} ${-sc})"/>`);dx+=p.xAdvance*sc+(i<run.glyphs.length-1?tr:0);}
 return {paths:g.join(''),width:dx,capHeight:f.capHeight*sc,xHeight:f.xHeight*sc};}
export function text(t,x,y,size,color,o={}){const l=layout(t,size,o);const ax=o.anchor==='middle'?x-l.width/2:o.anchor==='end'?x-l.width:x;
 const paint=o.stroke?`fill="none" stroke="${color}" stroke-width="${o.stroke}" stroke-linejoin="round"`:`fill="${color}"`;
 return `<g aria-label="${t.replace(/"/g,'')}" transform="translate(${ax.toFixed(2)} ${y.toFixed(2)})" ${paint}${o.opacity?` opacity="${o.opacity}"`:''}>${l.paths}</g>`;}
export const width=(t,size,o={})=>layout(t,size,o).width;
// Tamaño que hace que t mida exactamente w.
export const fit=(t,w,o={})=>w/width(t,100,o)*100;
export const label=(t,x,y,size,color,o={})=>text(t,x,y,size,color,{family:'poppins',weight:'Medium',tracking:0.08,...o});
const logos={logo:'logo-full.svg',negative:'logo-negative.svg'};const data={};
for(const[k,p]of Object.entries(logos))data[k]=(await readFile(join(root,'public/branding',p))).toString('base64');
export const LOGO_RATIO=196.68/837.07;
// Logo oficial; w = ancho. y = borde superior.
export const logo=(x,y,w,neg=false,extra='')=>`<image href="data:image/svg+xml;base64,${data[neg?'negative':'logo']}" x="${x}" y="${y}" width="${w}" height="${w*LOGO_RATIO}" preserveAspectRatio="xMidYMid meet" ${extra}/>`;
export const logoData=k=>data[k];

// Textura cilíndrica de la taza (mismo modelo y UV que tazas-renders-v1): 4096 × 1558, 98 mm de alto,
// circunferencia 2π·41 mm. U=.25 cara de palabra (frente); U=.75 cara opuesta (logo); U=.5 asa.
export const MUG={W:4096,H:1558,circ:2*Math.PI*41,mmH:98};
export const mmx=mm=>mm*MUG.W/MUG.circ; // mm de perímetro → px
export const zy=z=>MUG.H*(1-z/MUG.mmH);  // altura en mm desde la base → y del arte
export const U=u=>u*MUG.W;
