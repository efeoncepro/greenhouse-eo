import fs from 'node:fs';
const dir='ai-generations/2026-09-22_aeo-fuente-preferida';
const manifest=JSON.parse(fs.readFileSync(`${dir}/brief/generated-manifest.json`));
const copies=[['La IA responde.','¿Sales tú?','**Solicita tu diagnóstico SEO + AEO.**'],['La IA describe tu negocio.','¿Te|reconoces?','**Revisa cómo interpreta tu marca.**'],['En la respuesta de la IA,','sé la|referencia.','**Trabajemos tu SEO + AEO.**'],['Entre las fuentes de la respuesta,','que te|elijan.','**Trabajemos tu SEO + AEO.**']];
let plan=[];
for(const m of manifest){
 fs.copyFileSync(m.path,`${dir}/plates/${m.id}.png`);
 const v=m.id.endsWith('916'),i=Number(m.id.slice(0,2))-1,[lead,dominant,after]=copies[i];
 plan.push({id:m.id,plate:`plates/${m.id}.png`,align:v?'center':'left',top:v?.07:.15,textWidth:v?.83:.30,label:'SEO + AEO',labelSize:v?22:27,labelGap:.13,lead,leadFamily:'poppins',leadFill:'#ffffff',leadSize:v?28:32,leadGap:.15,dominant:v&&i===1?'¿Te reconoces?':dominant,dominantSize:v?135:138,dominantMax:v?.84:.32,after,afterFamily:'poppins',afterFill:'#ffffff',afterSize:v?26:29,afterGap:.2,logo:{width:.2,x:.5},final:v?[1080,1920]:[1920,1080]});
}
fs.writeFileSync(`${dir}/piezas.json`,JSON.stringify(plan,null,2));
