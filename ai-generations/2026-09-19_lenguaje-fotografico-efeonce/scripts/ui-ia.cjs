const REPO='/Users/jreye/Documents/greenhouse-eo'
const sharp=require(REPO+'/node_modules/sharp'); const fontkit=require(REPO+'/node_modules/fontkit')
const fB=fontkit.openSync(REPO+'/src/assets/fonts/Poppins-Bold.ttf'), fM=fontkit.openSync(REPO+'/src/assets/fonts/Poppins-Medium.ttf')
const t=(s,f,size,x,y,fill)=>{const r=f.layout(s),sc=size/f.unitsPerEm;let cx=0,p='';r.glyphs.forEach((g,i)=>{const d=g.path.toSVG();if(d)p+=`<path d="${d}" transform="translate(${(x+cx).toFixed(1)} ${y}) scale(${sc} ${-sc})"/>`;cx+=r.positions[i].xAdvance*sc});return `<g fill="${fill}">${p}</g>`}
const W=900,H=1900;let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>`
s+=`<rect x="60" y="120" width="780" height="110" rx="55" fill="#f1f3f6"/>`+t('¿Qué pintura dura más en exteriores?',fM,34,105,190,'#263448')
s+=`<circle cx="100" cy="330" r="30" fill="#0375DB"/>`
for(let i=0;i<4;i++) s+=`<rect x="160" y="${310+i*48}" width="${[640,600,660,420][i]}" height="22" rx="11" fill="#dfe4ea"/>`
s+=`<rect x="60" y="560" width="780" height="560" rx="36" fill="#ffffff" stroke="#6EC207" stroke-width="8"/>`
s+=`<rect x="100" y="600" width="300" height="300" rx="24" fill="#eef4fb"/><rect x="170" y="660" width="160" height="200" rx="18" fill="#0375DB"/><rect x="170" y="640" width="160" height="36" rx="10" fill="#9fb4c8"/>`
s+=`<rect x="440" y="620" width="340" height="30" rx="15" fill="#263448"/><rect x="440" y="680" width="280" height="22" rx="11" fill="#c9d2dc"/><rect x="440" y="720" width="310" height="22" rx="11" fill="#c9d2dc"/>`
s+=`<rect x="440" y="800" width="230" height="64" rx="32" fill="#6EC207"/>`+t('Recomendado',fB,26,470,843,'#ffffff')
s+=`<rect x="100" y="940" width="700" height="22" rx="11" fill="#dfe4ea"/><rect x="100" y="985" width="560" height="22" rx="11" fill="#dfe4ea"/>`
for(let i=0;i<3;i++) s+=`<rect x="160" y="${1220+i*48}" width="${[600,640,380][i]}" height="22" rx="11" fill="#dfe4ea"/>`
s+=`<rect x="60" y="1720" width="780" height="100" rx="50" fill="#f1f3f6"/></svg>`
sharp(Buffer.from(s)).png().toFile('ui-ia-ref.png').then(()=>console.log('ok'))
