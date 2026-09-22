import fs from 'node:fs';import sharp from 'sharp';
const root='ai-generations/2026-09-22_aeo-cta-v04',plan=JSON.parse(fs.readFileSync(root+'/piezas-origen-v03.json'));
for(const s of [...plan].filter(s=>s.id.endsWith('916'))) for(const suffix of ['45','11']) {
 const n=structuredClone(s);n.id=s.id.replace('916',suffix);n.plate=`plates/${n.id}.png`;n.final=suffix==='45'?[1080,1350]:[1080,1080];
 const {width:w,height:h}=await sharp(root+'/'+n.plate).metadata();
 n.top=suffix==='11'?.032:.038;n.leadSize=32;n.leadGap=.2;n.dominantSize=105;n.dominantMax=.72;n.textWidth=.8;
 n.cta={...n.cta,gapAfterNote:24,fontSize:34,descriptorSize:27,paddingX:22,paddingY:12,cursorScale:.64,descriptorGap:14};
 n.editorialReserve={maxBottom:Math.floor(h*(suffix==='11'?.245:.27)),maxRight:w-50};
 n.productionNote='Adaptación fotográfica nativa por edición de plate corregido; composición independiente, sin recorte. Revisión local no promueve el catálogo global 1:1.';
 plan.push(n);
}
fs.writeFileSync(root+'/piezas.json',JSON.stringify(plan,null,2)+'\n');
