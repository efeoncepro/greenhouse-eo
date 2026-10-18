import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
import * as UI from './ui.mjs';
const SHOT='/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-29_deck-seo-aeo-documentos/render-src/shot.cjs';
for (const [n,w,h] of [['avr',1600,1100],['glitch',1080,2340],['manzanitas',1600,1000]]) {
  const html=`ui-${n}.html`;
  fs.writeFileSync(html,`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${UI.FONTS}&display=swap"><style>body{margin:0;background:#000}</style></head><body>${UI[n](w,h)}</body></html>`);
  // ventana del tamaño de la UI
  const shot=fs.readFileSync(SHOT,'utf8').replace('{width:1920,height:1080}',`{width:${w},height:${h}}`); fs.writeFileSync('shot-ui.cjs',shot);
  execFileSync('node',['shot-ui.cjs',process.cwd()+'/'+html,`ui-${n}.png`]); console.log('ok',n);
}
