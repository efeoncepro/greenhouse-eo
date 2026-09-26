import fs from 'node:fs';
import {construirPrompt} from '../../scripts/foto/build-prompt.mjs';
const root='ai-generations/2026-09-22_aeo-cta-v04';
const originals=['01-fuera-916','02-reconoces-916-v2','03-referencia-916','04-elegida-916'];
for (const orig of originals) for (const [suffix,ratio] of [['45','4:5'],['11','1:1']]) {
 const f=JSON.parse(fs.readFileSync(`${root}/brief-origen/${orig}.json`));
 const base=orig.split('-').slice(0,2).join('-');
 f.id=base+'-'+suffix;f.formato=ratio;
 if(base==='03-referencia') f.lecho={objeto:'the very near pale review table seen in the edit target, optically defocused across the bottom',tono:'near white softly defocused physical tabletop, with no dark seams in the signature area'};
 f.escena=`EDIT THE PROVIDED PHOTOGRAPH, keeping its exact character identity, wardrobe, material palette, lighting character, physical screen orientation, anatomically correct hand grip and visual story. Output a native ${ratio} photograph, NOT a crop or letterbox. Re-stage the framing for this ratio. The edit target is the already corrected campaign photograph, not a generic inspiration. Keep the upper 36% as the existing real graphite wall in deep even shadow, with no head, projection, screen or bright beam in that area. The storytelling action must be clear and impactful, placed between 42% and 80% of image height. The bottom 18% is the natural defocused foreground object described below. No baked headline, CTA, signature or logos. `+
 ({'01-fuera':'Preserve the blue Codex character next to the physical monitor with AI response and exactly three source slots, the third conspicuously empty. Keep the inclined blue monitor support and the dark foreground chair. No floating interface.',
 '02-reconoces':'Preserve Nexa in side/rear view, exact navy polo, curly hair, naturally holding the tablet with both hands at waist height. Screen faces up and inward toward HER, never presented to camera or backward. No pointing finger. The physical wall monitor shows a warehouse, the tablet a modern tower. Preserve contrast between those representations. Foreground is dark defocused windowsill.',
 '03-referencia':'Preserve exact Nexa in side/rear view, navy polo, naturally holding tablet and looking toward the physically projected answer and one large blue source card on real concrete. Projector beam terminates below the reserved wall. Keep the bright nearly white physical table blurred across bottom. No pointing fingers or screen facing away from user.',
 '04-elegida':'Preserve close-up of one natural index finger hovering just before selecting a source card on a real inclined glass touchscreen, visible reflection, blue physical frame and canonical blue Codex character farther behind. Screen and character remain large and readable as shapes. Dark softly defocused foreground housing.'}[base]);
 fs.writeFileSync(`${root}/brief/${f.id}.json`,JSON.stringify(f,null,2)+'\n');
 const built=construirPrompt(f);fs.writeFileSync(`${root}/brief/${f.id}.prompt.txt`,built.prompt);
 fs.writeFileSync(`${root}/brief/${f.id}.input.json`,JSON.stringify({mode:'built-in image edit',editTarget:`ai-generations/2026-09-22_aeo-cta-v03/plates/${base}-916.png`,requestedSize:built.size,formatCanonSinValidar:built.sinValidar},null,2)+'\n');
}
