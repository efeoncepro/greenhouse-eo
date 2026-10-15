import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { efeonceGraphicLine as brand } from '@efeoncepro/axis-tokens';

const root = process.cwd();
const dir = path.dirname(fileURLToPath(import.meta.url));
const uri = (file, mime) => `data:${mime};base64,${fs.readFileSync(path.join(root,file)).toString('base64')}`;
const assetRoot = 'node_modules/@efeoncepro/axis-brand-assets/assets/';
const logo = uri(assetRoot+'efeonce-logo-positive.svg','image/svg+xml');
const bubble = uri(assetRoot+'url-bubble-baked-light.svg','image/svg+xml');
const contact = JSON.parse(fs.readFileSync(path.join(root,'src/lib/artifact-composer/catalogs/deck-axis/back-cover-full.slots.json'),'utf8')).slots.contactDetails.value;
const fonts = [
 ['Poppins',400,'src/assets/fonts/Poppins-Regular.ttf'],
 ['Poppins',600,'src/assets/fonts/Poppins-SemiBold.ttf'],
 ['Bricolage Grotesque','100 900','src/assets/fonts/BricolageGrotesque-Variable.ttf']
].map(([family,weight,file])=>`@font-face{font-family:'${family}';font-weight:${weight};src:url(${uri(file,'font/ttf')}) format('truetype');}`).join('\n');
const footer = i => `<footer><a href="https://efeoncepro.com"><img src="${bubble}" alt="efeoncepro.com"></a><div>${contact.address}<br><a href="tel:${contact.chilePhone.replace(/[^+\d]/g,'')}">${contact.chilePhone}</a></div><span>${i} / 3</span></footer>`;
const header = `<header><img src="${logo}" alt="Efeonce"><div>Channel &amp; Commerce<br><strong>Caso de referencia · 13 octubre 2026</strong></div></header>`;
const pages = [
`<p class="eyebrow">BRIEF DE ACTIVACIÓN · CASO HIPOTÉTICO</p>
<h1>Pastas Carozzi<br>en el punto de venta</h1>
<p class="lead">Un caso concreto para definir proveedores, costos y coordinación de una activación de degustación.</p>
<aside><strong>Sobre este documento.</strong> Escenario creado por Efeonce para preparar y evaluar una primera colaboración operativa. La campaña, los locales, las fechas y los volúmenes son hipotéticos. No existe un encargo ni una aprobación de Carozzi.</aside>
<h2>Objetivo y experiencia</h2>
<p>Acercar las pastas Carozzi a personas que están haciendo sus compras, mostrando una preparación sencilla para la comida cotidiana.</p>
<p>En un módulo de marca se entrega una pequeña degustación, se explica la receta y se indica dónde encontrar el producto dentro del supermercado. Un QR permite acceder a la receta sin exigir datos personales.</p>
<h2>Dimensiones para presupuestar</h2>
<table><tbody>
<tr><th>Ubicación</th><td>Tres supermercados en Santiago: Ñuñoa, La Florida y Maipú. Un local por comuna, por definir.</td></tr>
<tr><th>Duración</th><td>Sábado y domingo de un mismo fin de semana.</td></tr>
<tr><th>Jornada</th><td>Cinco horas de atención al público por día y local, más montaje y desmontaje.</td></tr>
<tr><th>Volumen</th><td>150 degustaciones por día y local; 900 en total. Capacidad referencial cuya viabilidad debe evaluarse.</td></tr>
<tr><th>Fecha</th><td>Noviembre de 2026. Fin de semana por definir según disponibilidad.</td></tr>
<tr><th>Presupuesto</th><td>Por construir desde las necesidades del caso. Sin monto máximo fijado en este brief.</td></tr>
</tbody></table>
<p class="small">Marca de referencia: Carozzi. <a href="https://www.carozzicorp.com/nosotros/historia/">Fuente institucional</a>, consultada el 13 de octubre de 2026. Los parámetros operativos anteriores son supuestos del ejercicio.</p>`,
`<p class="eyebrow">01 · RESPONSABILIDADES Y SUPUESTOS</p>
<h1>Quién aporta<br>y qué falta resolver</h1>
<p class="lead">El diseño debe convertir el escenario en una operación viable, con responsables y dependencias explícitos.</p>
<h2>Distribución inicial</h2>
<table><tbody>
<tr><th>Marca de referencia</th><td>Para el ejercicio, Carozzi proporcionaría los productos y aprobaría la comunicación.</td></tr>
<tr><th>Efeonce</th><td>Desarrollaría el concepto y los archivos gráficos; revisaría alcance, presupuesto y propuesta comercial.</td></tr>
<tr><th>Ornella</th><td>Desarrollaría el flujo operativo, consultaría proveedores y consolidaría cotizaciones, presupuesto, cronograma y contingencias.</td></tr>
<tr><th>Proveedores</th><td>Resolverían fabricación o arriendo del módulo, impresión, transporte, preparación de alimentos y ejecución presencial, según su especialidad.</td></tr>
</tbody></table>
<h2>Decisiones que el caso debe resolver</h2>
<ol>
<li><strong>Recursos por local.</strong> Personal, equipamiento, materiales, insumos y supervisión requeridos para la jornada.</li>
<li><strong>Preparación y servicio.</strong> Dónde y cómo se prepara y sirve el alimento; infraestructura necesaria, condiciones de higiene y responsable de esa operación.</li>
<li><strong>Acceso y montaje.</strong> Quién gestiona la autorización del supermercado, qué condiciones exige y qué costos o restricciones podrían existir.</li>
<li><strong>Coordinación.</strong> Hitos, responsables y aprobaciones desde el brief hasta el retiro del material y el cierre.</li>
<li><strong>Contingencias.</strong> Respuesta a ausencias, atrasos, fallas de equipamiento o falta de producto, con responsable y alternativa.</li>
</ol>
<aside><strong>Condición de trabajo.</strong> Disponibilidad de locales, autorización de la cadena y condiciones de acceso pendientes de validación. Las consultas de proveedores deben identificar el carácter hipotético del ejercicio, sin reservar capacidad ni realizar compras.</aside>`,
`<p class="eyebrow">02 · ENTREGA Y REVISIÓN</p>
<h1>Una base concreta<br>para poder cotizar</h1>
<p class="lead">La entrega debe permitir comprender cómo ejecutar el caso y cuánto costaría, dejando a la vista las decisiones pendientes.</p>
<h2>Entregables esperados</h2>
<ol>
<li><strong>Flujo operativo.</strong> Etapas desde la recepción del brief hasta el cierre, con responsabilidades de Efeonce y de cada proveedor.</li>
<li><strong>Comparación de proveedores.</strong> Alternativas pertinentes, cotizaciones vigentes, disponibilidad y condiciones consultadas; recomendación de selección con su fundamento.</li>
<li><strong>Presupuesto completo.</strong> Materiales, producción, logística, preparación de alimentos y personal. Separar costos únicos, por local y por jornada; indicar qué aporta la marca.</li>
<li><strong>Cronograma.</strong> Preparación, aprobaciones, entregas, montaje, atención, desmontaje y cierre; contingencias con medidas preventivas.</li>
<li><strong>Consolidación.</strong> Documento y respaldo de cotizaciones para revisión conjunta. Distinguir información confirmada, estimaciones y pendientes.</li>
</ol>
<h2>Criterio de revisión</h2>
<p>El equipo debe poder recorrer el caso, entender quién hace cada cosa, cuándo, con qué recursos y a qué costo, y preparar una cotización comercial sin reconstruir la investigación.</p>
<p>Si algún proveedor no puede confirmar disponibilidad o una condición depende del local, debe quedar declarado con el siguiente paso para resolverlo.</p>
<h2>Qué registraríamos al ejecutar</h2>
<p>Cobertura efectiva, degustaciones realizadas, interacciones, accesos al QR, incidentes y costo por degustación. Una eventual lectura de ventas requeriría datos proporcionados por el cliente y un método acordado; este ejercicio no promete incremento de ventas.</p>
<aside><strong>Antes del inicio.</strong> Acordar dedicación estimada, alcance, plazo, honorarios y condiciones de revisión. Este brief no acepta una propuesta económica ni autoriza una activación real.</aside>`
];
const html = `<!doctype html><html lang="es-CL"><head><meta charset="utf-8"><title>Brief de activación · Pastas Carozzi · Caso de referencia · Efeonce</title><style>${fonts}
:root{--ink:${brand.color.dark};--navy:${brand.color.navy};--paper:${brand.color.paper};--gray:${brand.urlBubble.bakedOnLight};}
*{box-sizing:border-box}body{margin:0;color:var(--ink);font:11pt/1.48 'Poppins',sans-serif;print-color-adjust:exact;-webkit-print-color-adjust:exact}a{color:var(--navy)}
@page{size:A4;margin:0}.sheet{position:relative;width:210mm;height:297mm;background:white;break-after:page;overflow:hidden}.sheet:last-child{break-after:auto}
header{position:absolute;top:13mm;left:18mm;right:18mm;display:flex;justify-content:space-between;align-items:center;padding-bottom:4mm;border-bottom:1px solid color-mix(in srgb,var(--navy) 18%,white)}header img{width:34mm}header div{text-align:right;font-size:7.6pt;line-height:1.6}header strong{font-weight:400}
.content{position:absolute;top:37mm;bottom:26mm;left:18mm;right:18mm;overflow:hidden}.eyebrow{font-size:8pt;font-weight:600;letter-spacing:.07em;margin:0 0 3mm}h1{font:700 30pt/1.06 'Bricolage Grotesque',sans-serif;letter-spacing:-.02em;margin:0 0 4mm}h2{font:700 16pt/1.2 'Bricolage Grotesque',sans-serif;margin:5mm 0 2mm}p{margin:0 0 3mm}.lead{font-size:11.5pt;line-height:1.48;margin-bottom:4mm}aside{font-size:9pt;line-height:1.5;background:var(--paper);border-left:2px solid var(--navy);padding:3mm 4mm;margin:3mm 0 4mm}strong{font-weight:600}table{width:100%;border-collapse:collapse;font-size:9.4pt;line-height:1.45}th,td{text-align:left;vertical-align:top;padding:2.2mm 0;border-bottom:1px solid color-mix(in srgb,var(--navy) 16%,white)}th{width:30mm;font-weight:600;padding-right:4mm}ol{padding-left:5mm;margin:0}li{padding-left:1mm;margin-bottom:3mm;font-size:10pt;line-height:1.5}.small{font-size:7.8pt;line-height:1.45;margin-top:3mm}
footer{position:absolute;bottom:8mm;left:18mm;right:18mm;border-top:1px solid color-mix(in srgb,var(--navy) 18%,white);padding-top:3mm;display:flex;gap:5mm;align-items:center;color:var(--ink);font-size:6.8pt;line-height:1.6}footer img{width:28mm;display:block}footer a{color:inherit;text-decoration:none}footer span{margin-left:auto;font-size:8pt}
</style></head><body>${pages.map((p,i)=>`<section class="sheet">${header}<main class="content">${p}</main>${footer(i+1)}</section>`).join('')}</body></html>`;
const htmlPath = path.join(dir,'Efeonce-Brief-Activacion-Carozzi.html');
const pdfPath = path.join(dir,'Efeonce-Brief-Activacion-Carozzi.pdf');
fs.writeFileSync(htmlPath,html);
const browser = await chromium.launch();
try {
 const page = await browser.newPage({viewport:{width:794,height:1123}});
 await page.emulateMedia({media:'print',reducedMotion:'reduce'});
 await page.setContent(html,{waitUntil:'load'});
 const qa = await page.evaluate(async()=>{
  await document.fonts.ready;
  await Promise.all([...document.images].map(x=>x.decode()));
  return {fonts:['400 12px Poppins','600 12px Poppins','700 12px "Bricolage Grotesque"'].every(x=>document.fonts.check(x)),images:[...document.images].every(x=>x.naturalWidth>0),overflow:[...document.querySelectorAll('.content')].map((x,i)=>({page:i+1,dy:x.scrollHeight-x.clientHeight,dx:x.scrollWidth-x.clientWidth})).filter(x=>x.dy>1||x.dx>1)};
 });
 if(!qa.fonts||!qa.images||qa.overflow.length) throw new Error(JSON.stringify(qa));
 await page.pdf({path:pdfPath+'.tmp',preferCSSPageSize:true,printBackground:true,tagged:true,outline:true});
 fs.renameSync(pdfPath+'.tmp',pdfPath);
 fs.writeFileSync(path.join(dir,'render-qa.json'),JSON.stringify({...qa,renderer:await browser.version(),pdfBytes:fs.statSync(pdfPath).size},null,2));
 console.log(JSON.stringify({html:htmlPath,pdf:pdfPath,...qa,bytes:fs.statSync(pdfPath).size}));
} finally {await browser.close();}
