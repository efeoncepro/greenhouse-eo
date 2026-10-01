import { readFile,writeFile,mkdir,readdir } from 'node:fs/promises';
import { dirname,join } from 'node:path';import {fileURLToPath} from 'node:url';import sharp from 'sharp';
const dir=dirname(fileURLToPath(import.meta.url)),root=join(dir,'../../..');
await mkdir(join(dir,'final'),{recursive:true});await mkdir(join(dir,'individuales'),{recursive:true});
const data={};for(const k of ['logo','ship','globe'])data[k]=(await readFile(join(dir,'art',k+'.png'))).toString('base64');
const im=(k,x,y,w,h,extra='')=>`<image href="data:image/png;base64,${data[k]}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" ${extra}/>`;
const svg=(w,h,b)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${b}</svg>`;
function solve(A,b){const n=b.length;for(let i=0;i<n;i++){let p=i;for(let j=i+1;j<n;j++)if(Math.abs(A[j][i])>Math.abs(A[p][i]))p=j;[A[i],A[p]]=[A[p],A[i]];[b[i],b[p]]=[b[p],b[i]];const d=A[i][i];for(let k=i;k<n;k++)A[i][k]/=d;b[i]/=d;for(let j=0;j<n;j++)if(j!==i){const q=A[j][i];for(let k=i;k<n;k++)A[j][k]-=q*A[i][k];b[j]-=q*b[i];}}return b;}
async function warp(texture,corners,W=1536,H=1024,opacity=1){const {data:src,info}=await sharp(texture).ensureAlpha().raw().toBuffer({resolveWithObject:true});const uv=[[0,0],[info.width-1,0],[info.width-1,info.height-1],[0,info.height-1]];const A=[],b=[];for(let i=0;i<4;i++){const[x,y]=corners[i],[u,v]=uv[i];A.push([x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]);b.push(u,v);}const h=solve(A,b),out=Buffer.alloc(W*H*4);const minx=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[0])))),maxx=Math.min(W-1,Math.ceil(Math.max(...corners.map(p=>p[0])))),miny=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[1])))),maxy=Math.min(H-1,Math.ceil(Math.max(...corners.map(p=>p[1]))));for(let y=miny;y<=maxy;y++)for(let x=minx;x<=maxx;x++){const z=h[6]*x+h[7]*y+1,u=(h[0]*x+h[1]*y+h[2])/z,v=(h[3]*x+h[4]*y+h[5])/z;if(u<0||v<0||u>=info.width-1||v>=info.height-1)continue;const ix=Math.floor(u),iy=Math.floor(v),fx=u-ix,fy=v-iy,dst=(y*W+x)*4;for(let c=0;c<4;c++){let a=0;for(let j=0;j<2;j++)for(let i=0;i<2;i++)a+=src[((iy+j)*info.width+ix+i)*4+c]*(i?fx:1-fx)*(j?fy:1-fy);out[dst+c]=Math.round(a*(c===3?opacity:1));}}return sharp(out,{raw:{width:W,height:H,channels:4}}).png().toBuffer();}
const texture=await sharp(Buffer.from(svg(1000,686,`
<defs><filter id="sticker" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="9" result="edge"/><feFlood flood-color="white"/><feComposite in2="edge" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
${im('ship',90,415,225,160,'filter="url(#sticker)"')}
<g transform="translate(800 77)"><rect width="115" height="96" rx="12" fill="white"/><path d="M7 51 C41 43 78 61 84 89 H7Z" fill="#023C70"/><path d="M84 89 C80 70 72 64 66 59 L108 81 V89Z" fill="#0375DB"/></g>`))).png().toBuffer();
await writeFile(join(dir,'art','mac-sticker-layout.png'),texture);
const macMaps=[[[112,52],[667,52],[667,430],[112,430]],[[794,205],[1233,74],[1472,240],[998,407]],[[92,530],[684,530],[684,899],[92,899]]];
const macOver=[];for(const q of macMaps)macOver.push({input:await warp(texture,q)});
await sharp(join(dir,'renders','06-mac-base.png')).flatten({background:'#fff'}).composite(macOver).png().toFile(join(dir,'final','06-mac-stickers.png'));
const boardTexture=await sharp(Buffer.from(svg(1000,650,im('logo',60,67,280,77)))).png().toBuffer();
const boardMaps=[[[183,29],[620,27],[619,311],[185,311]],[[986,16],[1306,55],[1303,276],[991,303]]];
const boardOver=[];for(const q of boardMaps)boardOver.push({input:await warp(boardTexture,q)});
boardOver.push({input:await warp(await sharp(boardTexture).flop().png().toBuffer(),[[986,481],[1296,523],[1295,769],[990,765]],1536,1024,.45)});
await sharp(join(dir,'renders','07-pizarra-base.png')).flatten({background:'#FFFFFF'}).composite(boardOver).png().toFile(join(dir,'final','07-pizarra.png'));
await sharp(join(dir,'renders','04-agenda-base.png')).flatten({background:'#fff'}).composite([{input:Buffer.from(svg(1536,1024,im('logo',331,849,94,25,'opacity=".88"')))}]).png().toFile(join(dir,'final','04-agenda.png'));
for(const name of ['02-mugs-efeonce.png','03-mugs-globe.png','05-escritorio.png'])await sharp(join(dir,'renders',name)).flatten({background:'#fff'}).png().toFile(join(dir,'final',name));
const jobs=[
['02-mugs-efeonce.png',4,2,['mug-blanco','mug-azul'],['frente','tres-cuartos','reverso','cenital']],
['03-mugs-globe.png',4,2,['mug-globe-magenta','mug-globe-naranja'],['frente','tres-cuartos','reverso','cenital']],
['04-agenda.png',2,2,['agenda'],['frente','tres-cuartos','reverso','abierta']],
['05-escritorio.png',3,3,['lapicero','bandeja','sujetalibros'],['frente','tres-cuartos','superior']],
['06-mac-stickers.png',2,2,['mac'],['cerrado-cenital','cerrado-tres-cuartos','abierto-reverso','abierto-frente']],
['07-pizarra.png',2,2,['pizarra'],['frente','tres-cuartos','perfil','reverso']],
];const manifest=[];
for(const [filename,cols,rows,names,views]of jobs){const file=join(dir,'final',filename),m=await sharp(file).metadata();for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const name=names.length===rows?names[row]:names[0],view=names.length===rows?views[col]:views[row*cols+col];const id=name+'-'+view;const left=Math.floor(col*m.width/cols)+1,top=Math.floor(row*m.height/rows)+1,width=Math.floor((col+1)*m.width/cols)-left-1,height=Math.floor((row+1)*m.height/rows)-top-1;await sharp(file).extract({left,top,width,height}).png().toFile(join(dir,'individuales',id+'.png'));manifest.push({id,object:name,view,file:'individuales/'+id+'.png',width,height,source:'final/'+filename,kind:'concept-generated-reference',approval:'pending'});}}
const shipDir=join(root,'ai-generations/2026-09-17_efeonce-ship-3d/final');
const shipNames=['01-frente-heroe','08-tres-cuartos-derecha','07-tres-cuartos-trasero','05-cenital'];const shipLayers=[];
for(let i=0;i<shipNames.length;i++){const name=shipNames[i],file='efeonce-nave-3d-navy-'+name+'-1x1-1600x1600-v01-transparente.png',path=join(shipDir,file);await sharp(path).flatten({background:'#fff'}).png().toFile(join(dir,'individuales','ship-'+name+'.png'));shipLayers.push({input:await sharp(path).flatten({background:'#fff'}).resize(700,700).png().toBuffer(),left:(i%2)*700,top:Math.floor(i/2)*700});manifest.push({id:'ship-'+name,object:'ship',view:name,file:'individuales/ship-'+name+'.png',width:1600,height:1600,source:path,kind:'reused-approved-shape',approval:'shape-approved-2026-09-17; application-pending'});}
await sharp({create:{width:1400,height:1400,channels:3,background:'#fff'}}).composite(shipLayers).png().toFile(join(dir,'final','08-ship-reutilizado.png'));
await writeFile(join(dir,'manifest.json'),JSON.stringify({status:'proposal-for-approval',line:'Apertura',views:manifest},null,2));
console.log('Prepared '+manifest.length+' individual references plus final sheets.');
