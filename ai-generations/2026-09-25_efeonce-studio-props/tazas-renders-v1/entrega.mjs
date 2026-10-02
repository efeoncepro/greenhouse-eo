import sharp from 'sharp';import{readFile,mkdir,writeFile}from'node:fs/promises';import{dirname,join}from'node:path';import{fileURLToPath}from'node:url';
import{svg,rect,label,im,N,W}from'../exploracion-v4/types.mjs';
const D=dirname(fileURLToPath(import.meta.url));const views=JSON.parse(await readFile(join(D,'renders.json')));const colors=JSON.parse(await readFile(join(D,'colores.json')));const titles=['01 · Palabra / frente','02 · Palabra / tres cuartos con asa','03 · Palabra / tres cuartos opuesto','04 · Perfil del asa','05 · Perfil sin asa','06 · Logo / reverso','07 · Logo / tres cuartos con asa','08 · Logo / tres cuartos opuesto','09 · Superior','10 · Base inferior'];
await mkdir(join(D,'contactos'),{recursive:true});
for(const c of colors){await mkdir(join(D,'blanco',c.id),{recursive:true});const files=views.filter(v=>v.color===c.id);const layers=[];
for(let i=0;i<files.length;i++){const v=files[i],src=join(D,'rgba',v.file),dest=join(D,'blanco',v.file);await sharp(src).flatten({background:W}).png().toFile(dest);layers.push({input:await sharp(dest).resize(520,520).png().toBuffer(),left:35+(i%5)*530,top:180+Math.floor(i/5)*610});}
let s=rect(0,0,2720,1490,W)+im('logo',50,45,250,65)+label('TAZA / '+c.id.toUpperCase()+' / DIEZ VISTAS',1620,91,27,N,600);
for(let i=0;i<10;i++)s+=label(titles[i],50+(i%5)*530,756+Math.floor(i/5)*610,16,N);
s+=label('Referencia de objeto · Mismo modelo 3D y textura · Línea gráfica abierta, no aprobada',50,1443,21,N);
await sharp(Buffer.from(svg(2720,1490,s))).composite(layers).png().toFile(join(D,'contactos',c.id+'.png'));
}
let summary=rect(0,0,2000,1160,W)+im('logo',55,35,218,58)+label('TAZAS / KIT DE REFERENCIAS MULTIVISTA',1070,77,22,N,600);const layers=[];
for(let i=0;i<colors.length;i++){const c=colors[i];for(let j=0;j<2;j++){const file=views.find(v=>v.color===c.id&&v.view.startsWith(j===0?'01-':'06-'));layers.push({input:await sharp(join(D,'blanco',file.file)).resize(475,475).png().toBuffer(),left:20+i*495,top:120+j*470});}summary+=label(c.id.toUpperCase(),75+i*495,1118,22,N,600);}
await sharp(Buffer.from(svg(2000,1160,summary))).composite(layers).png().toFile(join(D,'00-familia.png'));
await writeFile(join(D,'manifest.json'),JSON.stringify({status:'reference_renders_for_review',brand_line_approved:false,method:'Blender Cycles path traced; one invariant 3D mesh, four material variants, official wordmark and source-font texture',dimensions_px:[1600,1600],background:'white',count:views.length,variants:colors,views,design:{word:'Hacer.',word_face:'-Y',logo_face:'+Y',logo_width_mm:34,logo_center_height_mm:18},notes:'Physical dimensions are modeling decisions for consistent references, not manufacturer specifications.'},null,2));
console.log('Exportados '+views.length+' PNG blancos y contactos.');
