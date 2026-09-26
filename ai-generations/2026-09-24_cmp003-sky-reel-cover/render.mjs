import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { axisAdvertising as axis } from '@efeoncepro/axis-tokens';
import { compositeLuminosity } from '../../scripts/creative/layout-compiler/compiler.mjs';
const D=path.dirname(new URL(import.meta.url).pathname),root=path.resolve(D,'../..');
const source={bricolage:'src/assets/fonts/BricolageGrotesque-Variable.ttf',poppins:'src/assets/fonts/Poppins-Regular.ttf',poppinsMedium:'src/assets/fonts/Poppins-Medium.ttf',guttery:'/Users/jreye/Library/Fonts/Guttery.otf',efeonce:'public/branding/logo-negative.svg',sky:'ai-generations/2026-09-23_cmp003-sky-video/seedance/v17-refinement-plan/sky-white-separated.svg',skyColor:'src/lib/artifact-composer/catalogs/deck-axis/assets/clients/sky-on-dark.svg',url:'src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg'};
const file=k=>path.isAbsolute(source[k])?source[k]:path.join(root,source[k]);
const data=(k,type)=>`data:${type};base64,${fs.readFileSync(file(k)).toString('base64')}`;
const rec=axis.recipes;
const cssRecipe=r=>`font-weight:${r.weight};letter-spacing:${r.tracking};line-height:${r.lineHeight};${r.width?`font-variation-settings:'wdth' ${r.width},'opsz' ${r.opticalSize};`:''}`;
const green=fs.readFileSync(file('skyColor'),'utf8').match(/#46DC28/i)[0];
const html=`<!doctype html><html lang="es"><meta charset="utf-8"><title>SKY nos eligió. De nuevo. — Portada</title><style>
@font-face{font-family:Bricolage;src:url('${data('bricolage','font/ttf')}');font-weight:200 800;font-display:block}
@font-face{font-family:Poppins;src:url('${data('poppins','font/ttf')}');font-weight:400;font-display:block}
@font-face{font-family:Poppins;src:url('${data('poppinsMedium','font/ttf')}');font-weight:500;font-display:block}
@font-face{font-family:Guttery;src:url('${data('guttery','font/otf')}');font-weight:400;font-display:block}
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;background:#023c70;overflow:hidden}body{font-synthesis:none;color:white}
#art{width:1080px;height:1920px;position:relative;isolation:isolate;overflow:hidden}
#background{position:absolute;inset:0;background:radial-gradient(ellipse at 4% 24%,#07548c 0%,transparent 54%),radial-gradient(ellipse at 108% 84%,#690479 0%,transparent 57%),linear-gradient(148deg,#023c70 10%,#08294f 42%,#32165b 65%,#50015c 90%)}
#grain{position:absolute;inset:0;opacity:.028;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.86' numOctaves='3' stitchTiles='stitch' seed='31'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' opacity='.6' filter='url(%23n)'/%3E%3C/svg%3E")}
#copy{position:absolute;top:380px;left:108px;width:864px}
#skyTitle{font-family:Bricolage;font-size:310px;${cssRecipe(rec.ideaImpact)}margin-left:-9px}
#chosen{font-family:Bricolage;font-size:165px;${cssRecipe(rec.ideaFocus)}margin-top:6px;white-space:nowrap}
#gesture{position:relative;display:table;font-family:Guttery;font-size:190px;${cssRecipe(rec.gesture)}color:${green};transform:rotate(-7deg);margin-top:33px;margin-left:220px;white-space:nowrap}
#underline{position:absolute;left:25px;top:157px;width:520px;height:45px;overflow:visible}
#support{position:absolute;left:113px;top:1084px;font-family:Poppins;font-size:39px;${cssRecipe(rec.structureCopy)}}
#support strong{display:block;font-size:51px;font-weight:500;line-height:1.35;margin-top:3px}
#lockup{position:absolute;top:1400px;left:234px;display:flex;align-items:center;gap:33px;height:83px}
#efeonce{width:329px;height:auto;display:block}
#divider{width:2px;height:80px;background:white;opacity:.8}
#skyMark{width:215px;height:auto;display:block}
.noink #copy,.noink #support,.noink #lockup{visibility:hidden}
</style><div id="art"><div id="background"></div><div id="grain"></div><div id="copy"><div id="skyTitle">SKY</div><div id="chosen">nos eligió.</div><div id="gesture">de nuevo.<svg id="underline" viewBox="0 0 520 45"><path d="M8 24 C135 5 300 9 504 17" fill="none" stroke="${green}" stroke-width="7" stroke-linecap="round"/></svg></div></div><div id="support">Ahora, también para<strong>SEO y AEO.</strong></div><div id="lockup"><img id="efeonce" src="${data('efeonce','image/svg+xml')}"/><div id="divider"></div><img id="skyMark" src="${data('sky','image/svg+xml')}"/></div></div></html>`;
fs.writeFileSync(D+'/cover.html',html);
const b=await chromium.launch({headless:true});const page=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:2});
await page.setContent(html);await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()))});
const layout=await page.evaluate(()=>Object.fromEntries(['skyTitle','chosen','gesture','support','efeonce','skyMark','lockup'].map(id=>{const el=document.getElementById(id),r=el.getBoundingClientRect(),s=getComputedStyle(el);return [id,{x:r.x,y:r.y,w:r.width,h:r.height,font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,color:s.color}]})));
await page.screenshot({path:D+'/qa/composed-before-url.png'});await page.evaluate(()=>document.body.classList.add('noink'));await page.screenshot({path:D+'/qa/background.png'});await b.close();
const url=await sharp(file('url')).resize({width:600}).png().toBuffer();
const blend=await compositeLuminosity({backdropBytes:fs.readFileSync(D+'/qa/composed-before-url.png'),sourceBytes:url,left:780,top:3110,width:600,opacity:.72});
if(blend.evidence.method!=='non-separable-luminosity')throw new Error('Wrong URL blend');
await sharp(blend.output).withIccProfile('srgb').png().toFile(D+'/sky-reel-cover-2160x3840.png');
await sharp(blend.output).resize(1080,1920).withIccProfile('srgb').png().toFile(D+'/sky-reel-cover-1080x1920.png');
await sharp(blend.output).resize(1080,1920).withIccProfile('srgb').jpeg({quality:97,chromaSubsampling:'4:4:4'}).toFile(D+'/sky-reel-cover-1080x1920.jpg');
await sharp(blend.output).resize(390,693).png().toFile(D+'/qa/mobile-390.png');
await sharp(blend.output).extract({left:0,top:480,width:2160,height:2880}).resize(300,400).png().toFile(D+'/qa/central-crop-3x4.png');
const manifest={date:'2026-09-24',campaign:'CMP-003',scope:'Organic reel static cover; no publication',copy:['SKY nos eligió.','de nuevo.','Ahora, también para SEO y AEO.'],palette:{blue:'#023c70',purple:'#50015c',green},recipes:{hero:rec.ideaImpact,verb:rec.ideaFocus,gesture:rec.gesture,support:rec.structureCopy},layout,url:blend.evidence,assets:Object.fromEntries(Object.keys(source).map(k=>[k,{path:file(k),sha256:crypto.createHash('sha256').update(fs.readFileSync(file(k))).digest('hex')}]))};
fs.writeFileSync(D+'/manifest.json',JSON.stringify(manifest,null,2));
console.log(JSON.stringify({layout,urlMethod:blend.evidence.method,output:D},null,2));
