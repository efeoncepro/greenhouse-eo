import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import sharp from 'sharp';import * as fontkit from 'fontkit';
export const dir=dirname(fileURLToPath(import.meta.url)),root=join(dir,'../../..');
const bf=fontkit.openSync(join(root,'src/assets/fonts/BricolageGrotesque-Variable.ttf'));
const pf=fontkit.openSync('/Users/jreye/Library/Fonts/Poppins-Regular.ttf');const ps=fontkit.openSync('/Users/jreye/Library/Fonts/Poppins-SemiBold.ttf');
export const N='#023C70',B='#0375DB',W='#FFFFFF';
export const svg=(w,h,s)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`;
export const rect=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
export function text(t,x,y,size,c=W,{weight=740,width=96,opsz=76,tracking=-.03,role='idea',maxWidth,stroke=false}={}){const f=role==='idea'?bf.getVariation({wght:weight,wdth:width,opsz}):weight>=600?ps:pf;const run=f.layout(t);const sc=size/f.unitsPerEm;let dx=0;const glyphs=[];for(let i=0;i<run.glyphs.length;i++){const g=run.glyphs[i],p=run.positions[i];glyphs.push(`<path d="${g.path.toSVG()}" transform="translate(${dx+p.xOffset*sc} ${-p.yOffset*sc}) scale(${sc} ${-sc})"/>`);dx+=p.xAdvance*sc+tracking*size;}const fit=maxWidth&&dx>maxWidth?maxWidth/dx:1;return `<g aria-label="${t}" transform="translate(${x} ${y}) scale(${fit})" ${stroke?`fill="none" stroke="${c}" stroke-width="6"`:`fill="${c}"`}>${glyphs.join('')}</g>`;}
export const label=(t,x,y,size=13,c=N,weight=400)=>text(t,x,y,size,c,{role:'structure',tracking:.015,weight});
const assets={logo:'logo-full.svg',negative:'logo-negative.svg',ship:'SVG/isotipo-full-efeonce.svg',shipWhite:'SVG/isotipo-efeonce-negativo.svg',globe:'SVG/isotipo-goble-full.svg',wave:'SVG/isotipo-wave.svg',reach:'SVG/isotipo-reach-full.svg'};export const data={};for(const[k,p]of Object.entries(assets))data[k]=(await readFile(join(root,'public/branding',p))).toString('base64');
export const im=(k,x,y,w,h)=>`<image href="data:image/svg+xml;base64,${data[k]}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
