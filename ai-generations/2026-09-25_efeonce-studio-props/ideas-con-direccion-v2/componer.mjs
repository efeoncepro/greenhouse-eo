import {dir,svg,im,coverInk,backInk,cover,muralInk,sticker,wordMug,N,B,W,label,text} from './build.mjs';
import {warp} from './warp.mjs';import sharp from 'sharp';import {readFile,writeFile,copyFile} from 'node:fs/promises';import {join} from 'node:path';
const previous=join(dir,'../apertura-v1');
const png=s=>sharp(Buffer.from(s)).png().toBuffer();
const cov=await png(coverInk),back=await png(backInk);
const agendaLayers=[];
for(const q of [[[253,21],[554,21],[554,423],[253,423]],[[1125,47],[1393,133],[1168,418],[821,300]]])agendaLayers.push({input:await warp(cov,q,1536,1024,.96)});
agendaLayers.push({input:await warp(back,[[219,504],[524,504],[524,910],[219,910]])});
await sharp(join(dir,'bases/agenda.png')).composite(agendaLayers).png().toFile(join(dir,'final/02-agenda.png'));
// Cylindrical transfer of vector lettering to the white ceramic. The rear carries
// a small official wordmark. Blue is deliberately left as a material-only option.
async function cylinder(texture,cx,top,radius,height,angle=0){const{data:a,info}=await sharp(texture).ensureAlpha().raw().toBuffer({resolveWithObject:true});const W=1536,H=1024,out=Buffer.alloc(W*H*4),extent=1.04;for(let y=Math.floor(top);y<top+height+8;y++)for(let x=Math.floor(cx-radius);x<cx+radius;x++){const xx=(x-cx)/radius;if(Math.abs(xx)>=1)continue;const th=Math.asin(xx)-angle,u=(th+extent)/(2*extent)*(info.width-1),v=(y-top-5*(1-Math.cos(th)))/height*(info.height-1);if(u<0||u>=info.width-1||v<0||v>=info.height-1)continue;const ix=Math.floor(u),iy=Math.floor(v),fx=u-ix,fy=v-iy,d=(y*W+x)*4;for(let c=0;c<4;c++){let q=0;for(let j=0;j<2;j++)for(let i=0;i<2;i++)q+=a[((iy+j)*info.width+ix+i)*4+c]*(i?fx:1-fx)*(j?fy:1-fy);out[d+c]=q;}}return sharp(out,{raw:{width:W,height:H,channels:4}}).png().toBuffer();}
const mugTexture=await png(wordMug);
const mugLayers=[{input:await cylinder(mugTexture,165,276,105,70)},{input:await cylinder(mugTexture,542,274,108,72,-.17)},{input:await warp(await png(svg(600,800,im('logo',174,565,250,66))),[[879,167],[1099,167],[1099,404],[879,404]])}];
await sharp(join(previous,'renders/02-mugs-efeonce.png')).flatten({background:W}).composite(mugLayers).png().toFile(join(dir,'final/03-mugs.png'));
// Exact die-cut isotype + a typographic sticker. Both keep generous air around Apple.
const macTexture=await png(svg(1000,686,`<defs><filter id="sticker" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="9" result="edge"/><feFlood flood-color="white"/><feComposite in2="edge" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<g filter="url(#sticker)">${im('ship',90,425,225,155)}</g>
<g transform="translate(674 89) rotate(-8)">${svg(210,94,`<rect width="210" height="94" rx="8" fill="white"/>${text('Hacer.',11,72,67,N,{weight:780,maxWidth:190})}`)}</g>`));
await writeFile(join(dir,'art/mac-stickers.png'),macTexture);
const macLayers=[];for(const q of [[[112,52],[667,52],[667,430],[112,430]],[[794,205],[1233,74],[1472,240],[998,407]],[[92,530],[684,530],[684,899],[92,899]]])macLayers.push({input:await warp(macTexture,q)});
await sharp(join(previous,'renders/06-mac-base.png')).flatten({background:W}).composite(macLayers).png().toFile(join(dir,'final/04-mac.png'));
// The board's frame is useful writing structure; the acrylic remains mostly free.
const boardTexture=await png(svg(1000,650,`${im('logo',60,54,280,77)}
<path d="M70 190H48V524H70 M930 190H952V524H930" stroke="${B}" fill="none" stroke-width="3"/>
${label('ENFOQUE',80,204,17,N,600)}${label('IDEAS',381,204,17,N,600)}${label('ACCIÓN',680,204,17,N,600)}
<path d="M80 224H302M381 224H603M680 224H902" stroke="${B}" stroke-width="2"/>`));
const boardLayers=[];for(const q of [[[183,29],[620,27],[619,311],[185,311]],[[986,16],[1306,55],[1303,276],[991,303]]])boardLayers.push({input:await warp(boardTexture,q)});
boardLayers.push({input:await warp(await sharp(boardTexture).flop().png().toBuffer(),[[986,481],[1296,523],[1295,769],[990,765]],1536,1024,.4)});
await sharp(join(previous,'renders/07-pizarra-base.png')).flatten({background:W}).composite(boardLayers).png().toFile(join(dir,'final/05-pizarra.png'));
for(const [src,dst]of [['05-escritorio.png','06-escritorio.png'],['03-mugs-globe.png','07-globe-colores.png'],['08-ship-reutilizado.png','08-ship.png']])await copyFile(join(previous,'final',src),join(dir,'final',dst));
const officeLayers=[{input:await warp(await png(muralInk),[[58,66],[777,66],[777,725],[58,725]],1672,941,.9),blend:'multiply'},
{input:await warp(await sharp(Buffer.from(cover)).blur(.6).png().toBuffer(),[[1231,531],[1396,536],[1440,611],[1230,612]],1672,941,.97)}];
await sharp(join(dir,'bases/oficina.png')).composite(officeLayers).png().toFile(join(dir,'final/09-estudio.png'));
console.log('Composiciones v2 listas');
