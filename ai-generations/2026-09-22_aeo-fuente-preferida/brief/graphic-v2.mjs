import fs from 'node:fs';
const d='ai-generations/2026-09-22_aeo-fuente-preferida';
fs.mkdirSync(`${d}/v02-grafica`,{recursive:true});
let plan=JSON.parse(fs.readFileSync(`${d}/piezas-texto.json`));
for(const s of plan){
 const v=s.id.endsWith('916'),i=+s.id.slice(0,2);s.plate='../plates/'+s.id+'.png';s.label=null;s.top=v?.08:.13;s.leadSize=v?29:32;s.dominantSize=v?137:143;s.leadGap=.23;s.afterGap=.34;s.afterSize=v?26:29;
 s.after=s.after.replaceAll('**','');
 if(i===1){s.dominant='¿Sales [[tú]]?';s.dominantMax=v?.58:.30;s.selection={variant:'open-brackets',padding:'standard',overlay:'none',scale:v?1.5:1.8,cursors:[{id:'seo',label:'SEO',anchor:'top-end',color:'#12afa2'},{id:'cliente',label:'Cliente',anchor:'bottom-end',color:'#6ec207'}]};s.leadGap=.45;s.afterGap=.54;s.after='Solicita tu diagnóstico.|**SEO + AEO.**';}
 if(i===2){s.dominant=v?'¿Te [[reconoces]]?':'¿Te|[[reconoces]]?';s.dominantMax=v?.65:.29;s.selection={variant:'four-corners',padding:'standard',overlay:'none',scale:v?1.45:1.8,cursors:[{id:'nexa',label:'Nexa',anchor:'bottom-end',color:'#d6246e'}]};s.afterGap=.48;s.after='Revisa cómo interpreta|**tu marca.**';}
 if(i===3){s.dominant=v?'Sé la [[referencia]].':'sé la|[[referencia]].';s.dominantMax=v?.84:.32;s.after='Trabajemos tu **SEO + AEO.**';s.gesture={text:'Que cuente.',size:v?47:59,x:v?.38:.09,y:v?.225:.65,rotate:-5,color:'#ffffff'};}
 if(i===4){s.dominant=v?'Que te [[elijan]].':'que te|[[elijan]].';s.dominantMax=v?.72:.29;s.selection={variant:'open-brackets',padding:'standard',overlay:'none',cursors:[{id:'local',kind:'local',anchor:'end-center',action:'select'}]};s.after='Trabajemos tu **SEO + AEO.**';}
}
fs.writeFileSync(`${d}/v02-grafica/piezas-texto.json`,JSON.stringify(plan,null,2));
