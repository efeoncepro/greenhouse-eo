const sharp=require('sharp'),fs=require('fs');
const R='2026-09-27_deck-recetas/references/';
const EXCL=new Set(['DeckEquipo','DeckQuienesSomos','DeckPorQue','DeckPorQue2','DeckBrochurePortadaEquipo','DeckPortadaPrincipal4','DeckTexto','DeckVinetas','DeckAgenda']);
let refs=fs.readdirSync(R).filter(f=>f.endsWith('.jpg')).map(f=>f.replace('.jpg','')).filter(f=>!EXCL.has(f));
const prefer=['DeckPortadaLineaBrand','DeckPropuestaCreativaDigital','DeckPortadaPrincipal6','DeckLineasNexaOrbitas','DeckPropuestaAEOCine','DeckBrochureContraOrbitaGigante','DeckPortadaLineaEngine','DeckCaso','DeckTriptico','DeckPropuestaRevOpsCine','DeckBexEscalera','DeckGrader','DeckPortadaLineaVoice','DeckCotizacionEscena','DeckHibridoEscena','DeckPortadaLineaRevenue','DeckBrochurePortadaOrbita','DeckPropuestaWebCine','DeckVivoResultados','DeckStack','DeckPortadaLineaGrowth','DeckSeccionLente','DeckBrochureContraAmanecer','DeckPortadaPrincipal6Sel','DeckContenidoFoco','DeckMosaico','DeckRespiro','DeckTestimonio','DeckPropuestaCreativa','DeckSeguro'];
const extra=['2026-09-17_hoodie-efeonce/out/hoodie-09-detalle-pecho.png','2026-09-17_efeonce-logo-3d/prueba/escritorio-v04-final.png','2026-09-17_polo-efeonce/out/polo-a-navy-bordado-tonal.png','2026-09-17_chaqueta-efeonce/out/chaqueta-a-softshell.png','2026-09-17_efeonce-ship-3d/out/ship-3d-navy-01-frente-heroe.png'];
const tiles=prefer.filter(p=>refs.includes(p)).map(p=>R+p+'.jpg');
// intercalar las piezas de kit/3D
const pos=[3,9,16,22,27];extra.forEach((e,i)=>tiles.splice(pos[i],0,e));
const cols=7,rows=5,W=480,H=270,G=16;
(async()=>{const comps=[];for(let i=0;i<cols*rows&&i<tiles.length;i++){comps.push({input:await sharp(tiles[i]).resize(W,H,{fit:'cover'}).toBuffer(),left:(i%cols)*(W+G),top:Math.floor(i/cols)*(H+G)})}
await sharp({create:{width:cols*(W+G)-G,height:rows*(H+G)-G,channels:3,background:'#001a33'}}).composite(comps).jpeg({quality:86}).toFile('2026-10-06_brochure-creativo/assets/muro-la-orbita.jpg');console.log(tiles.length)})()
