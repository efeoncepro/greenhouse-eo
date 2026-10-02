import {dir,svg,rect,text,label,im,N,B,W}from'./types.mjs';import sharp from'sharp';import{writeFile}from'node:fs/promises';import{join}from'node:path';export{dir,svg,rect,text,label,im,N,B,W};
// The repeat is a surface system: one curved turn and one angular termination.
// None of the official isotypes is clipped, recomposed or used as a patch.
export const elbow=`<path d="M0 225V160C0 72 72 0 160 0H305L225 80H160C116 80 80 116 80 160V305Z"/>`;
export function link(x,y,w,color=N,opacity=1){return `<svg x="${x}" y="${y}" width="${w}" height="${w}" viewBox="0 0 470 470"><g fill="${color}" opacity="${opacity}">${elbow}<g transform="translate(470 470) rotate(180)">${elbow}</g></g></svg>`;}
export function pattern(w,h,color=N,opacity=1,step=235){let b='';const u=step/470;for(let r=-1;r<Math.ceil(h/step)+1;r++)for(let c=-1;c<Math.ceil(w/step)+1;c++)b+=link(c*step+(r%2)*step/2,r*step,step,color,opacity);return b;}
export const motif=svg(470,470,link(0,0,470));
export const repeat=svg(900,800,rect(0,0,900,800,B)+pattern(900,800,N,.48,235));
export const agendaInk=svg(600,800,`<svg x="0" y="300" width="600" height="500" viewBox="0 0 600 500">${pattern(600,500,N,.48,205)}</svg>
${label('CUADERNO DE ESTUDIO',61,81,11,W,600)}
${text('Ideas con',57,157,61,W,{weight:420,maxWidth:480})}${text('dirección.',56,225,74,W,{maxWidth:480})}`);
export const agendaBack=svg(600,800,im('negative',201,694,198,52));
export const agendaCover=svg(600,800,rect(0,0,600,800,B)+agendaInk.replace(/^.*?<svg[^>]*>/s,'').replace(/<\/svg>$/,''));
export const mural=svg(850,780,`<svg x="0" y="0" width="850" height="475" viewBox="0 0 850 475">${pattern(850,475,N,.85,255)}</svg>${text('Ideas con dirección.',39,607,67,N,{weight:420,maxWidth:740})}${im('logo',39,660,211,57)}${label('ESTRATEGIA × CREATIVIDAD × DIGITAL',39,750,12,N,600)}`);
for(const[name,s]of Object.entries({'modulo-enlace':motif,'trama-enlace':repeat,'agenda-tinta':agendaInk,'agenda-portada':agendaCover,'agenda-reverso':agendaBack,'mural-tinta':mural})){await writeFile(join(dir,'art',name+'.svg'),s);await sharp(Buffer.from(s)).png().toFile(join(dir,'art',name+'.png'));}
const board=svg(1800,1160,`${rect(0,0,1800,1160,'#F5F4EF')}${im('logo',60,48,224,60)}${label('ESTUDIO 03 / RECURSO DE SUPERFICIE CANDIDATO',1090,85,13,N,600)}
${text('Enlace.',55,216,108,N)}${label('Un patrón estable. Distintas intensidades.',60,264,23,N)}
${rect(60,320,760,620,N)}${link(169,375,510,W)}
<svg x="880" y="320" width="860" height="620" viewBox="0 0 860 620">${rect(0,0,860,620,B)}${pattern(860,620,N,.72,210)}</svg>
${label('CURVA + PLIEGUE + SEPARACIÓN DIAGONAL',60,987,14,N,600)}${label('REPETICIÓN CON LA MISMA GEOMETRÍA',880,987,14,N,600)}
${label('Firma oficial pequeña y baja · Trama puntual o tonal · Ship como símbolo principal',60,1050,22,N)}
${label('Propuesta para construir asociación. Reconocimiento y confusión pendientes de prueba.',60,1110,16,N)}
`);await writeFile(join(dir,'01-recurso.svg'),board);await sharp(Buffer.from(board)).png().toFile(join(dir,'01-recurso.png'));
