const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const fontkit = require('fontkit');
const { efeonceGraphicLine: tokens } = require('@efeoncepro/axis-tokens');
const root = __dirname;
const repo = path.resolve(root, '../../..');
const out = path.join(root, 'export');
const qa = path.join(root, 'qa');
const src = path.join(root, 'fuentes');
const fontPath = path.resolve(repo, '../axis-design-system/apps/lab/public/fonts/Poppins-500.ttf');
const fontStrongPath = path.resolve(repo, '../axis-design-system/apps/lab/public/fonts/Poppins-600.ttf');
const font = fontkit.openSync(fontPath);
const fontStrong = fontkit.openSync(fontStrongPath);
const logoPath = path.join(repo,'node_modules/@efeoncepro/axis-brand-assets/assets/efeonce-logo-negative.svg');
const googlePath = path.join(src, 'google-wordmark-official-light.png');
const data = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
function letters(text, size, center, baseline, color=tokens.color.paper, tracking=0, type=font) {
  const run = type.layout(text); const scale = size/type.unitsPerEm;
  const width = run.positions.reduce((s,p)=>s+p.xAdvance*scale,0)+Math.max(0,run.glyphs.length-1)*tracking;
  let x = center-width/2; let markup='';
  for(let i=0;i<run.glyphs.length;i++){
    const p=run.positions[i];
    markup+=`<path d="${run.glyphs[i].path.toSVG()}" transform="translate(${x+p.xOffset*scale} ${baseline-p.yOffset*scale}) scale(${scale} ${-scale})" fill="${color}"/>`;
    x+=p.xAdvance*scale+tracking;
  }
  return {markup,width};
}
const svg=(w,h,body)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const luminance=(r,g,b)=>{const f=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};return .2126*f(r)+.7152*f(g)+.0722*f(b);};
async function writeJpegUnder(input,file,max=300000){
 for(let q=92;q>=64;q-=2){const b=await sharp(input).jpeg({quality:q,chromaSubsampling:'4:4:4',mozjpeg:true}).toBuffer();if(b.length<max){fs.writeFileSync(file,b);return {quality:q,bytes:b.length};}}
 throw new Error('JPEG weight budget not reached');
}
async function cardPreview(plate,w,h,file){
 // Exact CSS object-position 84% 30%, as documented by the blog inventory.
 const info=await sharp(plate).metadata();const scale=h/info.height;const rw=Math.round(info.width*scale);
 const left=Math.round(Math.max(0,rw-w)*.84);
 const crop=await sharp(plate).resize(rw,h).extract({left,top:0,width:w,height:h}).toBuffer();
 const grad=`<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tokens.color.dark}" stop-opacity="0"/><stop offset=".36" stop-color="${tokens.color.dark}" stop-opacity=".05"/><stop offset=".70" stop-color="${tokens.color.dark}" stop-opacity=".95"/><stop offset="1" stop-color="${tokens.color.dark}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>`;
 const title1=letters('Efeonce es partner',w*.067,w/2,h*.73);
 const title2=letters('de Google Cloud',w*.067,w/2,h*.79);
 const label=letters('NOVEDAD',w*.032,w/2,h*.085,tokens.color.paper,1.5,fontStrong);
 const who=letters('Julio Reyes',w*.032,w/2,h*.91);
 await sharp(crop).composite([{input:svg(w,h,grad+label.markup+title1.markup+title2.markup+who.markup)}]).png().toFile(file);
}
async function main(){
 fs.mkdirSync(out,{recursive:true});fs.mkdirSync(qa,{recursive:true});
 const plate=path.join(out,'efeonce-google-cloud-partner-plate.png');
 await sharp(path.join(src,'plate-generado-original.png')).resize(2560,1440,{fit:'cover'}).png().toFile(plate);
 const base=await sharp(path.join(src,'portada-sin-texto-original-v2.png')).resize(2400,1260,{fit:'cover'}).png().toBuffer();
 fs.writeFileSync(path.join(src,'portada-fondo-2400x1260.png'),base);
 // All production assets stay textless; title and identity belong to the host UI.
 const composed=base;
 fs.writeFileSync(path.join(src,'portada-master-sin-texto-v2.png'),composed);
 const cover=path.join(out,'efeonce-google-cloud-partner-portada-og.jpg');
 const compression=await writeJpegUnder(composed,cover);
 const opening=path.join(out,'efeonce-google-cloud-partner-apertura.webp');
 await sharp(composed).resize(1600,900,{fit:'cover'}).webp({quality:84}).toFile(opening);
 const hero=path.join(out,'efeonce-google-cloud-partner-hero.webp');
 await sharp(plate).resize(2400,1200,{fit:'cover'}).webp({quality:88}).toFile(hero);
 await sharp(cover).extract({left:570,top:0,width:1260,height:1260}).resize(630,630).png().toFile(path.join(qa,'portada-recorte-cuadrado.png'));
 await sharp(cover).resize(1200,630).png().toFile(path.join(qa,'portada-preview.png'));
 await sharp(cover).resize(390,205).png().toFile(path.join(qa,'portada-miniatura-390.png'));
 await cardPreview(plate,440,600,path.join(qa,'tarjeta-escritorio-440x600.png'));
 await cardPreview(plate,304,540,path.join(qa,'tarjeta-movil-304x540.png'));
 const boardW=1800,boardH=1460;
 const boardTitles=svg(boardW,boardH,
  letters('EFEONCE / GOOGLE',35,900,54,tokens.color.paper,3,fontStrong).markup+
  letters('PORTADA + OPEN GRAPH',23,590,105,tokens.color.paper,1,fontStrong).markup+
  letters('RECORTE CUADRADO',23,1480,105,tokens.color.paper,1,fontStrong).markup+
  letters('HERO SIN TEXTO / RESERVADO',23,565,810,tokens.color.paper,1,fontStrong).markup+
  letters('TARJETAS / SIMULACION',23,1450,810,tokens.color.paper,1,fontStrong).markup+
  letters('2400 x 1260 / JPEG / <300 KB',20,590,725,tokens.color.paper).markup+
  letters('FOCO 84% 30% / PLATE SIN TEXTO',18,1450,1410,tokens.color.paper).markup);
 await sharp({create:{width:boardW,height:boardH,channels:3,background:tokens.color.dark}}).composite([
  {input:await sharp(cover).resize(1100,578).toBuffer(),left:40,top:125},
  {input:await sharp(path.join(qa,'portada-recorte-cuadrado.png')).resize(540,540).toBuffer(),left:1210,top:125},
  {input:await sharp(hero).resize(1050,525).toBuffer(),left:40,top:845},
  {input:await sharp(path.join(qa,'tarjeta-movil-304x540.png')).toBuffer(),left:1150,top:845},
  {input:await sharp(path.join(qa,'tarjeta-escritorio-440x600.png')).resize(242,330).toBuffer(),left:1505,top:845},
  {input:boardTitles,left:0,top:0}
 ]).jpeg({quality:88}).toFile(path.join(qa,'revision-paquete.jpg'));
 const alt={
  'efeonce-google-cloud-partner-plate.png':'Símbolos tridimensionales de Gemini y Google Cloud iluminados sobre un fondo azul cinematográfico, con espacio libre para el título de la tarjeta.',
  'efeonce-google-cloud-partner-portada-og.jpg':'Símbolos tridimensionales de Gemini y Google Cloud con luz multicolor sobre un fondo azul cinematográfico, sin texto.',
  'efeonce-google-cloud-partner-apertura.webp':'Gemini y Google Cloud como esculturas luminosas en un entorno azul con profundidad cinematográfica, sin texto.',
  'efeonce-google-cloud-partner-hero.webp':'Símbolos de Gemini y Google Cloud con iluminación azul y profundidad cinematográfica, sobre un fondo oscuro sin texto.'
 };
 const files=[];
 for(const name of Object.keys(alt)){
  const file=path.join(out,name);const m=await sharp(file).metadata();
  files.push({file:`export/${name}`,width:m.width,height:m.height,format:m.format,bytes:fs.statSync(file).size,sha256:hash(file),alt:alt[name]});
  fs.writeFileSync(path.join(out,name.replace(/\.[^.]+$/,'.alt.txt')),alt[name]+'\n');
 }
 const report={version:2,status:'produced-local-awaiting-visual-approval',bannerActivation:false,wordpressUpload:false,textInProductionImages:false,wordmarksInProductionImages:false,method:'Built-in Imagegen cinematic raster adaptations; Sharp export sizing and compression. Typography exists only in labelled QA simulations, never in production assets.',reference:'ai-generations/2026-10-19_google-partner-freeze/export/efeonce-google-feed-4x5.png',referenceSha256:hash(path.join(repo,'ai-generations/2026-10-19_google-partner-freeze/export/efeonce-google-feed-4x5.png')),fontsInProductionAssets:[],coverCompression:compression,qa:{squareSafe:{left:570,right:1830,method:'Visual review of complete Gemini/Cloud pair in central square'},inkContrast:'Not applicable: no production typography or wordmarks.',squarePreview:'qa/portada-recorte-cuadrado.png',cardFocus:'84% 30%',cardPreviewsAre:'Local visual simulations, not live site screenshots'},files};
 report.nativeSources=[];
 for(const n of ['plate-generado-original.png','portada-sin-texto-original-v2.png']){const p=path.join(src,n);const m=await sharp(p).metadata();report.nativeSources.push({file:`fuentes/${n}`,width:m.width,height:m.height,sha256:hash(p),exportResize:'Production dimensions are resized exports; source pixels preserved separately.'});}
 fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({files,qa:report.qa},null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
