import fs from 'node:fs';
import {construirPrompt} from '../../../scripts/foto/build-prompt.mjs';
const d='ai-generations/2026-09-22_aeo-fuente-preferida/brief';let jobs=[];
for(const suffix of ['916','169']){
 let id='03-referencia-'+suffix,f=JSON.parse(fs.readFileSync(`${d}/${id}-v2.json`));
 f.lecho={objeto:'the near edge of the real pale review table between the camera and the projection work area, extremely close to lens',tono:'VERY LIGHT almost white matte surface, naturally illuminated by soft daylight, completely defocused'};
 f.escena='Localized photographic correction ONLY of the existing pale foreground surface in the supplied photo. Preserve every other feature: Nexa, hands, tablet, projection, wall and camera composition. The existing foreground is the pale review table from which the viewer observes. It must be ALMOST WHITE, neutral warm off-white, evenly illuminated by soft daylight. Its entire bottom central area needs to be nearly white with no grey patches, no brown tint, no dark reflections. Preserve real optical gradual defocus over at least5% image height, no flat graphic strip or overlay. Do not enlarge its existing extent. Do not change light or colour anywhere else. No logo or text added.';
 const b=construirPrompt(f);fs.writeFileSync(`${d}/${id}-v3.json`,JSON.stringify(f,null,2));fs.writeFileSync(`${d}/${id}-v3.prompt.txt`,b.prompt);jobs.push({id,prompt:b.prompt});
}
fs.writeFileSync(`${d}/bright-jobs.json`,JSON.stringify(jobs));
