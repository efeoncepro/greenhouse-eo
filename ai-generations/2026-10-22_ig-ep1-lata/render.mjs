import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const dir = process.cwd();
const frames = JSON.parse(fs.readFileSync('frames.json','utf8'));
const L=(r,g,b)=>{const c=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*c(r)+0.7152*c(g)+0.0722*c(b)};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
fs.mkdirSync('f',{recursive:true});
for (const f of frames) {
  const measure = f.measure ? `
   <div class="ml" style="left:270px;top:765px;height:480px"></div><div class="chip" style="left:96px;top:985px">15,7 cm</div>
   <div class="ml" style="left:905px;top:352px;height:308px"></div><div class="chip" style="left:760px;top:680px">~23 cm</div>` : '';
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:B;src:url('file:///Users/jreye/Library/Fonts/BricolageGrotesque-VariableFont_opsz,wdth,wght.ttf');font-weight:200 800}
  @font-face{font-family:P;src:url('file:///Users/jreye/Library/Fonts/Poppins-SemiBold.ttf');font-weight:600}
  body{margin:0;width:1080px;height:1920px;position:relative;overflow:hidden;background:#000}
  img{position:absolute;inset:0;width:1080px;height:1920px}
  .t{position:absolute;top:296px;left:${f.left}px;width:${f.width}px;color:#fff}
  .e{font-family:P;font-weight:600;font-size:28px;letter-spacing:.06em;text-transform:uppercase;line-height:1.2;margin-bottom:14px}
  .h{font-family:B;font-weight:760;font-size:68px;line-height:1.0;letter-spacing:-.025em}
  .ml{position:absolute;width:4px;background:#36c8bf}
  .chip{position:absolute;padding:8px 16px;border-radius:12px;background:#36c8bf;color:#001a33;font-family:P;font-weight:600;font-size:30px}
  </style></head><body><img src="file://${dir}/b/${f.base}">${f.inline?`<div class="t" style="display:flex;align-items:baseline;gap:22px"><div class="h" id="h">${f.head}</div><div class="e" id="e" style="margin:0">${f.eyebrow}</div></div>`:`<div class="t">${f.eyebrow?`<div class="e" id="e">${f.eyebrow}</div>`:''}<div class="h" id="h">${f.head}</div></div>`}${measure}</body></html>`;
  fs.writeFileSync(`f/${f.id}.html`, html);
  await page.goto(`file://${dir}/f/${f.id}.html`); await page.evaluate(()=>document.fonts.ready);
    // tight text width via range
  const tight = await page.evaluate(()=>['e','h'].filter(id=>document.getElementById(id)).map(id=>{const el=document.getElementById(id);const rg=document.createRange();rg.selectNodeContents(el);const rs=[...rg.getClientRects()];const x0=Math.min(...rs.map(r=>r.left)),x1=Math.max(...rs.map(r=>r.right)),y0=Math.min(...rs.map(r=>r.top)),y1=Math.max(...rs.map(r=>r.bottom));return {id,x:x0,y:y0,w:x1-x0,h:y1-y0}}));
  await page.screenshot({ path: `f/${f.id}.png` });
  const {data,info}=await sharp(`b/${f.base}`).raw().toBuffer({resolveWithObject:true});
  const rep=[];
  for(const b of tight){let v=[];for(let y=Math.floor(b.y);y<b.y+b.h;y+=2)for(let x=Math.floor(b.x);x<b.x+b.w;x+=2){const i=(y*1080+x)*info.channels;v.push(L(data[i],data[i+1],data[i+2]))}
    v.sort((a,c)=>a-c);const p95=v[Math.floor(v.length*0.95)];const cr=1.05/(p95+0.05);
    const safe=b.x>=65&&b.x+b.w<=929&&b.y>=288&&b.y+b.h<=1536;
    const c=f.can;const over=!(b.x+b.w<c[0]||b.x>c[2]||b.y+b.h<c[1]||b.y>c[3]);
    rep.push(`${b.id} ${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}x${Math.round(b.h)} contraste ${cr.toFixed(1)} ${safe?'zona-segura':'FUERA-ZONA'} ${over?'TOCA-SUJETO':'libre'}`)}
  console.log(f.id, rep.join(' | '));
}
await browser.close();
