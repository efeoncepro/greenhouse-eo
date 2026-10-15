import fs from 'node:fs'; import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js';
const S=process.argv[2]; const B=`${S}/v9/base`; const BUB='file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/url-bubble-baked-dark.svg';
const ID="'Bricolage Grotesque', system-ui, sans-serif", ST="'Poppins', system-ui, sans-serif";
const head=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Poppins:wght@300;400;500;600&display=swap"><style>body{margin:0}b{font-weight:600}</style></head><body>`;
const sphere=a=>`<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:${a};margin-left:0.04em"></span>`;
const text=(c)=>`<div style="position:absolute;left:140px;top:${c.top||120}px;width:${c.W-170}px;display:flex;flex-direction:column">
<div style="font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">${c.eyebrow}</div>
<div style="margin-top:64px;font-family:${ID};font-size:${c.px}px;font-weight:760;letter-spacing:-0.045em;line-height:0.94;color:#fff">${c.lines.join('<br>')}${sphere(c.acc)}</div>
<div style="margin-top:44px;font-family:${ST};font-size:24px;font-weight:300;line-height:1.45;color:#fff;max-width:${Math.min(c.W-200,560)}px">${c.body}</div></div>
<img src="${BUB}" style="position:absolute;left:135px;top:990px;width:162px;height:38px">`;
async function bg(file){const {data,info}=await sharp(file).extract({left:20,top:300,width:60,height:480}).raw().toBuffer({resolveWithObject:true});let r=0,g=0,b=0,n=0;for(let i=0;i<data.length;i+=info.channels){r+=data[i];g+=data[i+1];b+=data[i+2];n++;}return [r/n|0,g/n|0,b/n|0];}
const C=[
 {id:'V02',base:'N02',W:620,solid:592,eyebrow:'La idea',lines:['Tu cliente','da vueltas','alrededor de','tu marca'],px:70,acc:'#36c8bf',body:'Te busca, te compara, te compra y vuelve. Ya no baja por un embudo: cada vuelta pasa por <b>cinco momentos</b>.'},
 {id:'V03',base:'N01',W:760,eyebrow:'Por qué 360°',lines:['Hoy, cada momento','lo atiende otro','proveedor'],px:66,acc:'#36c8bf',body:'Cinco proveedores son cinco verdades y ningún dueño del resultado. Nosotros operamos la vuelta completa y respondemos por el <b>número final</b>.'},
 {id:'V06',base:'E03',W:830,solid:805,eyebrow:'01 · Te encuentran · Engine',lines:['La IA ya','recomienda a tu','competencia'],px:80,acc:'#0375db',body:'Cuando tu comprador le pregunta por tu categoría, la IA ya tiene favoritas. Hacemos que la <b>próxima</b> respuesta te nombre.'},
 {id:'V07',base:'E04',W:780,eyebrow:'01 · Te encuentran · Engine',lines:['El SEO termina','en ingresos,','no en visitas'],px:78,acc:'#0375db',body:'SEO, AEO y web conectados a tus indicadores de negocio: tráfico calificado, leads, pipeline e <b>ingresos</b>.'},
 {id:'V11',base:'S15',W:800,solid:705,photo:true,eyebrow:'03 · Le hablas a quien compra · Voice',lines:['Tu inversión','llega a quien','decide la compra'],px:76,acc:'#f83902',body:'Pauta en redes, medios y creadores, con audiencias y presupuesto medidos para llegar a quien <b>compra</b>.'},
 {id:'V13',base:'R19',W:754,solid:748,photo:true,eyebrow:'04 · Te compran · Revenue',lines:['Tu CRM','se llena solo'],px:88,acc:'#e86bd0',body:'Llamadas, emails y reuniones entran solos al CRM y los datos quedan <b>en orden</b>: tu equipo vende con información confiable, en HubSpot o Salesforce.'},
 {id:'V15',base:'S22',W:760,solid:745,eyebrow:'05 · Lo mides · Growth',lines:['Cada mes ves','qué movió','el negocio'],px:82,acc:'#36c8bf',body:'Cinco métricas, cada una con su fórmula, su fuente y su <b>dueño</b>. Sin cifras de promesa: la línea base sale del diagnóstico.'},
 {id:'V16',base:'G22',W:830,solid:805,ptop:90,mask:true,top:180,eyebrow:'05 · Lo mides · Growth',lines:['La lectura','te llega lista','y empieza la','siguiente vuelta'],px:68,acc:'#36c8bf',body:'Cada mes la IA cruza tus datos y escribe la lectura; nuestro equipo la revisa. La abres como la necesites y decide qué movemos <b>en la vuelta siguiente</b>.'},
 {id:'V17',base:'S24',W:792,solid:782,eyebrow:'Quién opera la vuelta',lines:['Personas con','nombre, con','agentes a su lado'],px:68,acc:'#ff6500',body:'Un squad multidisciplinario orbita tu marca, con <b>un solo</b> interlocutor: tu Account Manager. Los agentes suman capacidad; las personas deciden y responden.'},
 {id:'V18',base:'S20',W:563,solid:556,fadeEnd:563,eyebrow:'Tu día a día con Efeonce',lines:['Trabajas','con nosotros','en vivo'],px:70,acc:'#ff6500',body:'Cada cosa en su herramienta y todo a la vista en tu panel de Greenhouse, <b>sin esperar</b> el informe.'},
];
const PLATE={V02:'N02',V03:'N01',V06:'E03',V07:'E04',V15:'S22',V18:'S20'};
const S24BG='radial-gradient(ellipse 800px 520px at 1330px 560px, rgba(3, 117, 219, 0.42), rgba(3, 117, 219, 0.1) 52%, rgba(0, 26, 51, 0) 78%), #001a33';
for(const c of C){if(c.id==='V11'||c.id==='V13'||c.id==='V16')continue;const file=`${B}/${c.base}.jpg`;
 const bgImg=PLATE[c.id]?`url(file://${S}/plate/${PLATE[c.id]}/stage-bg.png) 0 0 / 1920px 1080px no-repeat`:S24BG;
 const mask=`linear-gradient(90deg,#000 0,#000 ${c.solid??(c.W-12)}px,transparent ${c.fadeEnd??(c.W+40)}px)`;
 const html=head+`<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:#001a33"><img src="file://${file}" style="position:absolute;left:0;top:0;width:1920px;height:1080px">
<div style="position:absolute;left:0;top:0;width:1920px;height:1080px;background:${bgImg};-webkit-mask-image:${mask};mask-image:${mask}"></div>${text(c)}</div></body></html>`;
 fs.writeFileSync(`${S}/v9/html/${c.id}.html`,html);}
// V16: se edita la voz en el HTML nativo de Insights (sin panel)
{const c=C.find(x=>x.id==='V16');let n=fs.readFileSync('/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-12_brochure-efeonce-360/native-growth/Insights-Llega.html','utf8');
 const a=n.indexOf('<div style="position: absolute; left: 140px; top: 230px; width: 640px');const b=n.indexOf('</p>',a)+'</p>\n</div>'.length;
 const blk=`<div style="position:absolute;left:140px;top:180px;width:640px;display:flex;flex-direction:column">
<div style="font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">${c.eyebrow}</div>
<div style="margin-top:64px;font-family:${ID};font-size:${c.px}px;font-weight:760;letter-spacing:-0.045em;line-height:0.94;color:#fff">${c.lines.join('<br>')}${sphere(c.acc)}</div>
<div style="margin-top:44px;font-family:${ST};font-size:24px;font-weight:300;line-height:1.45;color:#fff;max-width:560px">${c.body}</div></div>`;
 n=n.slice(0,a)+blk+n.slice(b);if(!n.includes('family=Bricolage'))n=n.replace('<head>','<head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Poppins:wght@300;400;500;600&display=swap">');
 fs.writeFileSync(`${S}/v9/html/V16.html`,n);}
// V04 a mano
const rows=[['Te encuentran','Engine','Web, SEO y AEO: que Google y la IA te encuentren, con una web que convierte.'],['Te recuerdan','Brand','Creatividad y contenido: un squad que produce tu marca en cada formato.'],['Le hablas a quien compra','Voice','Medios y distribución: tu inversión, en la audiencia que decide.'],['Te compran','Revenue','CRM y RevOps en HubSpot o Salesforce: ventas, servicio y datos en orden.'],['Lo mides','Growth','Estrategia y medición: qué movió el negocio y qué sigue.']];
const rowsHtml=rows.map((r,i)=>`<div style="display:flex;gap:30px;align-items:baseline;padding:24px 0;border-top:1px solid rgba(114,222,216,0.16)${i==4?';border-bottom:1px solid rgba(114,222,216,0.16)':''}"><div style="font-family:${ID};font-size:40px;font-weight:300;color:#36c8bf;width:60px">0${i+1}</div><div style="display:flex;flex-direction:column;gap:6px"><div style="display:flex;align-items:baseline;gap:18px"><span style="font-family:${ID};font-size:36px;font-weight:740;letter-spacing:-0.02em;color:#fff">${r[0]}</span><span style="font-family:${ST};font-size:15px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#72ded8">${r[1]}</span></div><div style="font-family:${ST};font-size:20px;font-weight:300;line-height:1.4;color:#cfe4fa">${r[2]}</div></div></div>`).join('');
fs.writeFileSync(`${S}/v9/html/V04.html`,head+`<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:#001a33"><div style="position:absolute;inset:0;background:radial-gradient(ellipse 900px 640px at 1380px 540px,rgba(54,200,191,0.16),rgba(54,200,191,0.04) 55%,rgba(0,26,51,0) 80%)"></div>
${text({W:830,eyebrow:'Cinco momentos, un equipo',lines:['Una vuelta,','cinco líneas,','un equipo'],px:84,acc:'#36c8bf',body:'Cada momento de la vuelta tiene su línea de servicio. Las cinco las opera el mismo equipo, con <b>un solo</b> interlocutor.'})}
<div style="position:absolute;left:900px;top:150px;width:880px;display:flex;flex-direction:column">${rowsHtml}<div style="margin-top:26px;font-family:${ST};font-size:18px;font-weight:500;color:#72ded8">↻ y la vuelta empieza de nuevo</div></div></div></body></html>`);
console.log('html ok');
