// Tarjeta «anuncio de audio sonando» de la marca de ejemplo, compuesta sobre la lámina F-audio ya compuesta.
import fs from 'node:fs';
import { lockup, VOLT, FONTS, SHOE } from './nortica.mjs';
const R = process.argv[2];
const bars = Array.from({ length: 47 }, (_, i) => { const h = 6 + Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.37)) * 30; return `<rect x="${i * 8}" y="${20 - h / 2}" width="4" height="${h}" rx="2" fill="${i < 18 ? VOLT : '#ffffff'}" opacity="${i < 18 ? 1 : 0.3}"/>`; }).join('');
fs.writeFileSync(`${R}/marca-ejemplo/audio-overlay.html`, `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${FONTS}&family=Poppins:wght@300;400;500;600&display=swap"><style>body{margin:0}</style></head><body>
<div style="position:relative;width:1920px;height:1080px;background:url(${R}/out/F-audio/01-deck-proposal-cinematic.png) 0 0/1920px 1080px">
<div style="position:absolute;left:1440px;top:150px;width:420px;box-sizing:border-box;padding:20px 22px;border-radius:22px;background:linear-gradient(160deg,rgba(255,255,255,0.14),rgba(4,20,40,0.9));border:1.5px solid rgba(255,255,255,0.25);box-shadow:0 30px 70px rgba(0,0,0,0.6),0 0 50px rgba(127,182,255,0.25)">
<div style="display:flex;align-items:center;gap:16px">
<div style="flex:none;width:76px;height:76px;border-radius:12px;border:2px solid #f83902;background:url(${SHOE}) 55% 45%/cover"></div>
<div><div style="font-family:Poppins;font-size:12px;font-weight:600;letter-spacing:0.14em;color:#9fb4c8">ANUNCIO DE AUDIO · 0:15</div>
<div style="margin-top:8px">${lockup(24)}</div>
<div style="font-family:Poppins;font-size:15px;font-weight:300;color:#d9e3ec">Entre dos canciones</div></div></div>
<svg width="376" height="40" style="margin-top:14px;display:block">${bars}</svg>
<div style="margin-top:8px;height:4px;border-radius:2px;background:rgba(255,255,255,0.2)"><div style="width:38%;height:4px;border-radius:2px;background:${VOLT}"></div></div>
<div style="margin-top:6px;display:flex;justify-content:space-between;font-family:Poppins;font-size:12px;color:#9fb4c8"><span>0:06</span><span>Con banner en pantalla</span></div>
</div></div></body></html>`);
