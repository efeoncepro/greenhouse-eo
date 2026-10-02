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
// Twelve open trajectories. The circle supplies a turning radius; the fold a change
// of direction; cadence carries the digital character. No isotype is cut or altered.
export function flow(color=W,n=12){let s='';for(let i=0;i<n;i++){const y=720+i*13;const shift=i*9;s+=`<path d="M-100 ${y} H${115+shift} C${260+shift} ${y} ${185+shift} ${570+i*7} ${338+shift} ${490+i*7} L720 ${275+i*13}" fill="none" stroke="${color}" stroke-width="${i===0?5:1.7}"/>`;}return s;}
export const coverInk=svg(600,800,`
${label('CUADERNO DE IDEAS',50,55,11,W,600)}${label('01',531,55,11,W)}
${text('Ideas',40,230,182,W,{weight:780,opsz:88,maxWidth:522})}
${text('con',48,324,99,W,{weight:420,opsz:68})}
${text('dirección.',44,422,107,W,{weight:740,maxWidth:517})}
<g opacity=".93">${flow(W)}</g>

`);
export const cover=svg(600,800,rect(0,0,600,800,B)+coverInk.replace(/^.*?<svg[^>]*>/s,'').replace('</svg>',''));
export const backInk=svg(600,800,`${im('negative',201,694,198,52)}`);
export const muralInk=svg(850,780,`${im('logo',40,38,212,57)}
${label('ESTRATEGIA × CREATIVIDAD × DIGITAL',41,143,12,N,600)}
${text('Ideas',25,373,267,N,{weight:780,opsz:88,maxWidth:760})}
${text('con',39,512,150,N,{weight:420,opsz:68})}
${text('dirección.',34,656,155,N,{maxWidth:754})}
<path d="M52 701H647Q762 701 762 575V452" stroke="${B}" stroke-width="6" fill="none"/><path d="M747 468L762 452L777 468" stroke="${B}" stroke-width="6" fill="none"/>`);
export const sticker=svg(400,178,`${rect(0,0,400,178,W)}${text('Hacer.',19,134,119,N,{weight:780,opsz:88,maxWidth:362})}`);
export const wordMug=svg(640,240,`${text('Hacer.',15,191,190,N,{weight:780,opsz:88,maxWidth:610})}`);
const p2=svg(600,800,`${rect(0,0,600,800,W)}${label('EFEONCE / ENFOQUE ABIERTO',45,54,11,N,600)}
<path d="M88 130H40V604H88M512 130H560V604H512" stroke="${B}" stroke-width="4" fill="none"/>
${text('Pensar',67,251,120,N,{maxWidth:462})}
${text('fuera.',67,361,120,N,{maxWidth:462,weight:420})}
${text('Hacer',67,480,120,B,{maxWidth:462})}
${text('posible.',67,590,120,B,{maxWidth:462})}
${im('logo',45,698,196,53)}${label('DEL CRITERIO A LA ACCIÓN.',45,778,11,N)}
`);
const p3=svg(600,800,`${rect(0,0,600,800,N)}${label('EFEONCE / CAMPO DE IDEAS',45,54,11,W,600)}
${[0,1,2,3].map(i=>text('Ideas',38+i*24,275+i*105,182,'#4196E1',{stroke:true,maxWidth:550})).join('')}
<defs><clipPath id="focus"><circle cx="286" cy="400" r="170"/></clipPath></defs>
<circle cx="286" cy="400" r="170" fill="${B}"/>
<g clip-path="url(#focus)">${[0,1,2,3].map(i=>text('Ideas',38+i*24,275+i*105,182,W,{maxWidth:550})).join('')}</g>
${im('negative',45,695,196,54)}${label('ABRIR. ELEGIR. DESARROLLAR.',45,777,11,W)}
`);
for(const[name,body]of Object.entries({'agenda-tinta':coverInk,'agenda-portada':cover,'agenda-reverso':backInk,'mural-tinta':muralInk,'sticker-hacer':sticker,'mug-hacer':wordMug,'poster-enfoque':p2,'poster-campo':p3})){await writeFile(join(dir,'art',name+'.svg'),body);await sharp(Buffer.from(body)).png().toFile(join(dir,'art',name+'.png'));}
const embed=(s,x,y,scale)=>`<svg x="${x}" y="${y}" width="${600*scale}" height="${800*scale}" viewBox="0 0 600 800">${s.replace(/^.*?<svg[^>]*>/s,'').replace('</svg>','')}</svg>`;
const board=svg(1800,1220,`${rect(0,0,1800,1220,'#F5F4EF')}
${im('logo',60,44,226,60)}${label('DIRECCIÓN CREATIVA 02 / PROPUESTA PARA APROBACIÓN',1020,82,13,N,600)}
${text('Ideas con dirección.',55,213,105,N,{weight:740,maxWidth:1660})}
${label('Una identidad que abre posibilidades, toma posición y convierte el criterio en acción.',60,264,20,N)}
${embed(cover,60,310,.87)}${embed(p2,639,310,.87)}${embed(p3,1218,310,.87)}
${label('01 / DIRECCIÓN',60,1051,13,N,600)}${label('El trazo conecta y transforma el campo.',60,1084,17,N)}
${label('02 / ENCUADRE',639,1051,13,N,600)}${label('La composición deja entrar nuevas ideas.',639,1084,17,N)}
${label('03 / ENFOQUE',1218,1051,13,N,600)}${label('El círculo revela una elección.',1218,1084,17,N)}
${label('Bricolage Grotesque + Poppins  ·  Azul Efeonce + blanco  ·  Escala, ritmo, vacío y contraste',60,1172,16,N)}
`);
await writeFile(join(dir,'01-linea-grafica.svg'),board);await sharp(Buffer.from(board)).png().toFile(join(dir,'01-linea-grafica.png'));
console.log(dir);
