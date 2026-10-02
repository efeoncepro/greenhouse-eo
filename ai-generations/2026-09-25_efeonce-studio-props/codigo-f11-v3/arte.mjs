import {dir,svg,rect,text,label,im,N,B,W} from './types.mjs';import sharp from 'sharp';import {writeFile} from 'node:fs/promises';import{join}from'node:path';
export {dir,svg,rect,text,label,im,N,B,W};
// Original secondary graphic exploration: custom lower-case f and two matching 1s.
// Official Efeonce wordmark/isotype are separately embedded without alteration.
export const paths=`<path d="M88 540 132 344H48L72 241H155L165 202Q197 50 330 50H370L348 149H330Q270 149 258 211L252 241H340L316 344H229L187 540Z"/><path d="M500 85H607L504 540H398L472 214L367 250L391 143Z"/><path d="M738 85H845L742 540H636L710 214L605 250L629 143Z"/>`;
export const code=(x,y,w,color=N,opacity=1)=>`<svg x="${x}" y="${y}" width="${w}" height="${w*540/845}" viewBox="0 0 845 540"><g fill="${color}" opacity="${opacity}">${paths}</g></svg>`;
export const motif=svg(845,540,`<g fill="${N}">${paths}</g>`);
export const motifWhite=svg(845,540,`<g fill="white">${paths}</g>`);
export const agendaInk=svg(600,800,`${label('CUADERNO DE ESTUDIO',45,62,11,W,600)}${label('01',536,62,11,W)}
${text('Ideas con',45,170,68,W,{weight:420,maxWidth:505})}${text('dirección.',42,254,86,W,{weight:740,maxWidth:513})}
${code(-17,355,620,W,.93)}
`);
export const agendaBack=svg(600,800,im('negative',201,694,198,52));
export const agendaCover=svg(600,800,rect(0,0,600,800,B)+agendaInk.replace(/^.*?<svg[^>]*>/s,'').replace(/<\/svg>$/,''));
let pattern='';for(let r=0;r<6;r++)for(let c=0;c<5;c++)pattern+=code(c*225-(r%2)*112-85,r*157-100,210,N,.16);
export const texture=svg(900,800,rect(0,0,900,800,B)+pattern);
export const mural=svg(850,780,`${im('logo',39,660,211,57)}${label('ESTRATEGIA × CREATIVIDAD × DIGITAL',39,750,12,N,600)}
${code(-20,40,810,N)}${text('Ideas con dirección.',39,607,67,N,{weight:420,maxWidth:740})}`);
for(const[name,s]of Object.entries({'f11-master':motif,'f11-negativo':motifWhite,'agenda-tinta':agendaInk,'agenda-portada':agendaCover,'agenda-reverso':agendaBack,'trama-f11':texture,'mural-tinta':mural})){await writeFile(join(dir,'art',name+'.svg'),s);await sharp(Buffer.from(s)).png().toFile(join(dir,'art',name+'.png'));}
const small=code(1125,650,86,N),medium=code(1294,610,165,N),large=code(1511,558,210,N);
const board=svg(1800,1160,`${rect(0,0,1800,1160,'#F5F4EF')}${im('logo',60,48,224,60)}${label('ESTUDIO 03 / FIRMA SECUNDARIA CANDIDATA',1160,85,13,N,600)}
${text('Una señal que se repite.',55,216,102,N,{maxWidth:1670})}${label('f11 · exploración tipográfica del nombre Efeonce',60,264,22,N)}
${rect(60,322,968,650,N)}${code(96,371,900,W)}
${label('UNA FORMA FIJA',1100,361,13,N,600)}${text('f + 1 + 1',1094,450,84,N,{maxWidth:640})}
${label('Mismo dibujo, inclinación y proporciones.',1100,498,19,N)}
${small}${medium}${large}
${label('PEQUEÑA',1125,756,11,N,600)}${label('MEDIA',1294,756,11,N,600)}${label('PROTAGONISTA',1511,756,11,N,600)}
${label('Firma oficial',1100,837,14,N,600)}${im('logo',1100,867,220,60)}
${label('Aplicación pequeña y baja.',1360,894,16,N)}${label('Se conserva el gesto elegante.',1360,923,16,N)}
${label('Candidata a construir asociación con Efeonce. Reconocimiento y confusión aún sin medir.',60,1047,20,N)}
${label('La exploración no cambia el logotipo ni atribuye un origen histórico al nombre.',60,1107,14,N)}
`);
await writeFile(join(dir,'01-firma.svg'),board);await sharp(Buffer.from(board)).png().toFile(join(dir,'01-firma.png'));
console.log(dir);
