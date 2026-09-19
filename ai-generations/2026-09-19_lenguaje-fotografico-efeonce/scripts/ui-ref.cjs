const REPO='/Users/jreye/Documents/greenhouse-eo'
const sharp=require(REPO+'/node_modules/sharp'); const fontkit=require(REPO+'/node_modules/fontkit')
const fB=fontkit.openSync(REPO+'/src/assets/fonts/Poppins-Bold.ttf'), fM=fontkit.openSync(REPO+'/src/assets/fonts/Poppins-Medium.ttf')
const t=(s,f,size,x,y,fill)=>{const r=f.layout(s),sc=size/f.unitsPerEm;let cx=0,p='';r.glyphs.forEach((g,i)=>{const d=g.path.toSVG();if(d)p+=`<path d="${d}" transform="translate(${(x+cx).toFixed(1)} ${y}) scale(${sc} ${-sc})"/>`;cx+=r.positions[i].xAdvance*sc});return `<g fill="${fill}">${p}</g>`}
const W=1600,H=900; let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#f4f6f9"/><rect width="${W}" height="70" fill="#ffffff"/>`
s+=t('Pipeline · Q4',fB,26,40,46,'#022A4E')
const cols=['Calificado','Propuesta','Negociación','Ganado'], cw=360, gap=24
cols.forEach((c,i)=>{const x=40+i*(cw+gap); s+=t(c,fB,22,x+12,120,'#263448'); const n=[4,3,2,2][i]
 for(let k=0;k<n;k++){const y=145+k*170; const win=i===3&&k===0; s+=`<rect x="${x}" y="${y}" width="${cw}" height="150" rx="14" fill="${win?'#6EC207':'#ffffff'}" stroke="${win?'#6EC207':'#dde3ea'}" stroke-width="2"/>`
  s+=`<rect x="${x+20}" y="${y+26}" width="${[200,160,230,180][k%4]}" height="16" rx="8" fill="${win?'#ffffff':'#c9d2dc'}"/>`
  s+=`<rect x="${x+20}" y="${y+58}" width="${[120,150,100,140][k%4]}" height="12" rx="6" fill="${win?'#e8f6d6':'#e1e7ee'}"/>`
  s+=`<circle cx="${x+cw-40}" cy="${y+110}" r="18" fill="${win?'#ffffff':'#0375DB'}" opacity="${win?1:0.85}"/>`
  if(win) s+=t('Ganado',fB,24,x+20,y+122,'#ffffff')
  else s+=`<rect x="${x+20}" y="${y+104}" width="90" height="14" rx="7" fill="#0375DB" opacity="0.25"/>` } })
s+='</svg>'
sharp(Buffer.from(s)).png().toFile('ui-pipeline-ref.png').then(()=>console.log('ok'))
