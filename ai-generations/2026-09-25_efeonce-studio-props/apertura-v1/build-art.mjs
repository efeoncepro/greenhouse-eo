import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
const dir=dirname(fileURLToPath(import.meta.url)); const root=join(dir,'../../..');
await mkdir(join(dir,'art'),{recursive:true});
const files={logo:'logo-full.svg',negative:'logo-negative.svg',ship:'SVG/isotipo-full-efeonce.svg',globe:'SVG/isotipo-goble-full.svg',wave:'SVG/isotipo-wave.svg',reach:'SVG/isotipo-reach-full.svg'};
const raw={},data={};for(const [k,p] of Object.entries(files)){raw[k]=await readFile(join(root,'public/branding',p));data[k]=raw[k].toString('base64');await sharp(raw[k]).resize({width:k==='logo'||k==='negative'?1000:600}).png().toFile(join(dir,'art',k+'.png'));}
const img=(k,x,y,w,h)=>`<image href="data:image/svg+xml;base64,${data[k]}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
const tx=(x,y,s,t,c='#023C70',w=500)=>`<text x="${x}" y="${y}" font-family="Poppins,Arial,sans-serif" font-size="${s}" font-weight="${w}" fill="${c}">${t}</text>`;
const rect=(x,y,w,h,c,r=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" rx="${r}"/>`;
const svg=(w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
// One full-bleed solid field, an opening cut into it and a short diagonal blue plane.
// This is a new composition resource, not a fragment cut out of any logo.
const aperture=`<path d="M0 465 C152 435 356 566 398 840 H0Z" fill="#023C70"/><path d="M398 840 C380 733 335 655 283 596 L600 766 V840Z" fill="#0375DB"/>`;
const front=svg(600,840,rect(0,0,600,840,'#F5F3EE')+aperture);
await writeFile(join(dir,'art','agenda-front.svg'),front);await sharp(Buffer.from(front)).png().toFile(join(dir,'art','agenda-front.png'));
const motif=svg(600,840,rect(0,0,600,840,'#FFFFFF')+aperture);
await writeFile(join(dir,'art','apertura-master.svg'),motif);
const system=svg(1800,1200,`
${rect(0,0,1800,1200,'#F5F3EE')}${rect(0,0,1800,178,'#FFFFFF')}
${img('logo',65,54,300,75)}${tx(440,90,47,'Apertura', '#023C70',700)}${tx(442,133,18,'Línea de estudio · propuesta 01 para aprobación','#647581',400)}
${rect(65,220,650,860,'#FFFFFF',18)}
<g transform="translate(90 237) scale(.95)">${rect(0,0,600,840,'#F5F3EE')}${aperture}</g>
${tx(768,258,14,'01 / UNA FORMA DE COMPONER','#0375DB',700)}
${tx(768,308,33,'Curva + encuentro + apertura','#023C70',700)}
${tx(768,349,19,'La curva da espacio; el corte conecta planos.','#526877',400)}
${tx(768,379,19,'El gesto nace del borde y forma parte de la superficie.','#526877',400)}
${tx(768,448,14,'02 / UN SISTEMA CON DISTINTAS INTENSIDADES','#0375DB',700)}
${tx(768,494,24,'Firma · lenguaje · silencio','#023C70',600)}
${tx(768,533,18,'Pizarra y recepción: identificación. Agenda: composición.','#526877',400)}
${tx(768,563,18,'Mug, lapicero y bandeja: material, color y función.','#526877',400)}
${tx(768,632,14,'03 / EFEONCE LIDERA','#0375DB',700)}
${img('ship',770,662,170,121)}
${img('globe',1038,691,55,67)}${img('wave',1210,703,94,50)}${img('reach',1403,693,65,65)}
${tx(774,817,17,'Marca principal','#023C70',600)}${tx(1040,817,17,'Acentos de submarca según contexto','#526877',400)}
${rect(768,883,230,88,'#023C70',8)}${rect(1016,883,230,88,'#0375DB',8)}${rect(1264,883,230,88,'#FFFFFF',8)}
${tx(784,934,18,'#023C70','#FFFFFF',600)}${tx(1032,934,18,'#0375DB','#FFFFFF',600)}${tx(1280,934,18,'BLANCO','#023C70',600)}
${tx(768,1018,18,'Porcelana · tela · aluminio · acrílico · roble claro','#526877',400)}
${tx(768,1048,17,'Los colores de submarca se activan por pieza, con moderación.','#526877',400)}
${tx(65,1151,16,'Geometría, colores y aplicaciones propuestos para revisión. La identidad oficial permanece en sus SVG originales.','#526877',400)}
`);
await writeFile(join(dir,'01-sistema.svg'),system);await sharp(Buffer.from(system)).png().toFile(join(dir,'01-sistema.png'));
const ref=svg(1800,1200,`${rect(0,0,1800,1200,'#FFFFFF')}${tx(60,80,44,'EFEONCE — APERTURA / DESIGN SOURCE','#023C70',700)}
<g transform="translate(60 150) scale(.8)">${rect(0,0,600,840,'#F5F3EE')}${aperture}</g>
${tx(60,895,22,'Notebook front: edge-to-edge printed color planes')}${tx(60,933,18,'Ivory cloth; no logo on the front; royal blue page edges.')}
${img('logo',670,170,475,130)}${img('ship',1280,165,275,195)}
${tx(680,360,22,'Official masterbrand assets — keep intact')}
${img('globe',720,443,125,150)}${img('wave',978,476,190,106)}${img('reach',1320,456,140,142)}
${tx(705,640,20,'Globe: magenta')}${tx(984,640,20,'Wave: angular folds')}${tx(1318,640,20,'Reach: direction')}
${rect(665,725,245,112,'#023C70',8)}${rect(932,725,245,112,'#0375DB',8)}${rect(1199,725,245,112,'#BB1954',8)}${rect(1466,725,245,112,'#FF6500',8)}
${tx(690,789,22,'#023C70','#FFFFFF',600)}${tx(958,789,22,'#0375DB','#FFFFFF',600)}${tx(1224,789,22,'#BB1954','#FFFFFF',600)}${tx(1490,789,22,'#FF6500','#FFFFFF',600)}
${tx(670,932,24,'Objects: clean white background, multiple consistent views.')}
${tx(670,979,22,'Materials: porcelain / ivory linen / brushed aluminum / acrylic.')}
${tx(670,1027,22,'Restrained brand presence. Never put every symbol on one item.')}
${tx(670,1075,22,'No orbit decal. No space theme. Use curves and folds functionally.')}`);
await writeFile(join(dir,'art','design-source.svg'),ref);await sharp(Buffer.from(ref)).png().toFile(join(dir,'art','design-source.png'));
console.log(dir);
