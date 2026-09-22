import fs from 'node:fs';
import {axisAdvertising} from '@efeoncepro/axis-tokens';
import {resolveCollaborationSelectionIntent} from '@efeoncepro/axis-ui-contracts';
const d='ai-generations/2026-09-22_aeo-fuente-preferida/v02-grafica';
const plan=JSON.parse(fs.readFileSync(`${d}/piezas.json`));let evidence=[];
for(const s of plan){
 let intent=null,manifest=null;
 if(s.selection){intent={targetId:'dominante',targetKind:'text',variant:s.selection.variant,padding:s.selection.padding,overlay:s.selection.overlay,cursors:s.selection.cursors.map(c=>c.kind==='local'?{id:c.id,kind:'local',targetId:'dominante',anchor:c.anchor,action:c.action??'select'}:{id:c.id,kind:'collaborator',targetId:'dominante',anchor:c.anchor,action:'select',label:c.label,participantKind:'role'})};manifest=resolveCollaborationSelectionIntent(intent);}
 evidence.push({id:s.id,status:'PILOTO_PENDIENTE_APROBACION',imageRegenerated:false,parent:'v01-Codex',intent,manifest,presentation:s.selection??null,typography:{idea:{family:'Bricolage Grotesque',file:'src/assets/fonts/BricolageGrotesque-Variable.ttf',recipe:axisAdvertising.recipes.ideaImpact,width:78,requestedSize:s.dominantSize,maximumWidthFraction:s.dominantMax,accent:axisAdvertising.color.accentSurface},structure:{family:'Poppins',files:['src/assets/fonts/Poppins-Regular.ttf','src/assets/fonts/Poppins-Bold.ttf'],weights:[400,700],leadSize:s.leadSize,afterSize:s.afterSize},gesture:s.gesture?{family:'Guttery',file:'~/Library/Fonts/Guttery.otf',fontFilesBundled:false,...s.gesture}:null},adviser:{source:'AXIS Lab local source: creative-typography.astro',inputs:{format:s.id.endsWith('916')?'story':'cover',length:'short',intent:'impact'},candidateWeight:[760,800],publicPageRead:'web tool inaccessible; source consulted'},qa:'out/qa.json; out/qa-firma.txt; final390 previews visually reviewed'});
}
fs.writeFileSync(`${d}/evidencia-grafica.json`,JSON.stringify(evidence,null,2));
