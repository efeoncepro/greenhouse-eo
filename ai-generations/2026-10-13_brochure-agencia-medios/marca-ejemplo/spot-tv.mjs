import fs from 'node:fs';
import { nortAd, FONTS } from './nortica.mjs';
fs.writeFileSync(new URL('./spot-tv.html', import.meta.url), `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${FONTS}&display=swap"><style>body{margin:0}</style></head><body><div style="position:relative;width:1718px;height:1080px;overflow:hidden">${nortAd(1718, 1080, { pos: '30% 40%', kind: 'wide', label: null })}</div></body></html>`);
