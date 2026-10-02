// Prueba sin logo · taza distractora: mismo modelo, misma palabra y tamaño que f-efeonce, sin esfera y sin el sistema de color.
import sharp from 'sharp';import {writeFile} from 'node:fs/promises';import {join} from 'node:path';
import {dir,svg,rect,text,width,MUG,mmx,zy,U} from './lib.mjs';
const B={family:'brico',wght:760,tracking:-0.035};const size=mmx(66)/width('Hacer',100,B)*100;
const art=rect(0,0,MUG.W,MUG.H,'#F7F8F6')+text('Hacer',U(.25)-width('Hacer',size,B)/2,zy(39),size,'#2B2F36',B);
const s=svg(MUG.W,MUG.H,art);await writeFile(join(dir,'texturas','t-taza-distractor.svg'),s);await sharp(Buffer.from(s)).png().toFile(join(dir,'texturas','t-taza-distractor.png'));
await writeFile(join(dir,'rutas-prueba.json'),JSON.stringify([{id:'t-taza-distractor',base:'#F7F8F6',interior:'#F7F8F6'}],null,2));console.log('ok');
