// Página «Tu avatar nuevo» por persona y un índice del equipo (operador, 2026-09-29: «pon una página de donde ellos
// vayan y descarguen rápidamente»). Descarga directa del avatar oficial (mismo origen que el bucket público, así que el
// atributo download funciona), enlace a su página de firma y dónde cambiar la foto. Colores desde el token de la línea.
// node paginas-kit.mjs → kit/<nombre-apellido>.html + kit/index.html (se publican en gs://…/team/kit/)
import { writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { efeonceGraphicLine } = require('@efeoncepro/axis-tokens')

const DIR = new URL('./', import.meta.url).pathname
const C = efeonceGraphicLine.color
const BASE = 'https://storage.googleapis.com/efeonce-group-axis-public-media'
const AVATAR = `${BASE}/team/avatars/v1`
const FIRMA = `${BASE}/email-signature/v3.1/instalar`

const EQUIPO = [
  { slug: 'andres-carlosama', nombre: 'Andrés', completo: 'Andrés Carlosama', archivo: 'Andres-Carlosama' },
  { slug: 'daniela-ferreira', nombre: 'Daniela', completo: 'Daniela Ferreira', archivo: 'Daniela-Ferreira' },
  { slug: 'humberly-henriquez', nombre: 'Humberly', completo: 'Humberly Henriquez', archivo: 'Humberly-Henriquez' },
  { slug: 'julio-reyes', nombre: 'Julio', completo: 'Julio Reyes', archivo: 'Julio-Reyes' },
  { slug: 'melkin-hernandez', nombre: 'Melkin', completo: 'Melkin Hernandez', archivo: 'Melkin-Hernandez' },
  { slug: 'valentina-hoyos', nombre: 'Valentina', completo: 'Valentina Hoyos', archivo: 'Valentina-Hoyos' }
]

const DONDE = [
  ['Teams y Outlook', 'En Teams, haz clic en tu foto (arriba a la derecha), elige cambiar la foto de perfil y sube el avatar. Outlook y el resto de Microsoft 365 usan la misma foto; puede tardar unas horas en verse en todas partes.'],
  ['Notion', 'Configuración → Mi cuenta → Foto: sube el avatar.'],
  ['Frame.io', 'Haz clic en tu avatar → Configuración de la cuenta → Perfil, y cambia la foto.'],
  ['HubSpot', 'Haz clic en tu foto (arriba a la derecha) → Perfil y preferencias → Foto de perfil.'],
  ['Cualquier otra herramienta de trabajo', 'Usa este mismo archivo, así nos vemos iguales en todas partes.']
]

const estilos = `
  :root { --navy: ${C.navy}; --dark: ${C.dark}; --teal: ${C.tealDark}; --paper: ${C.paper}; --ink: #3d4f63; --line: #dce2e8; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--navy); font-family: 'Poppins', Arial, sans-serif; line-height: 1.5; }
  main { max-width: 760px; margin: 0 auto; padding: 40px 16px 64px; }
  h1 { font-family: 'Bricolage Grotesque', 'Poppins', sans-serif; font-weight: 800; font-size: clamp(28px, 5vw, 40px); line-height: 1.1; margin: 0 0 8px; letter-spacing: -0.5px; }
  h1 .punto, h2 .punto { color: var(--teal); }
  .bajada { color: var(--ink); margin: 0 0 28px; font-size: 16px; }
  .tarjeta { display: flex; flex-wrap: wrap; gap: 28px; align-items: center; justify-content: center; background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 24px; }
  .retrato { width: 200px; height: 200px; border-radius: 50%; display: block; flex: none; }
  .acciones { display: flex; flex-direction: column; gap: 12px; flex: 1 1 240px; }
  .primario, .secundario { display: inline-block; text-align: center; font: 600 15px 'Poppins', sans-serif; border-radius: 12px; padding: 14px 22px; text-decoration: none; border: 1px solid var(--navy); }
  .primario { background: var(--navy); color: #fff; }
  .secundario { background: #fff; color: var(--navy); }
  .nota { font-size: 14px; color: var(--ink); margin: 4px 0 0; }
  h2 { font-family: 'Bricolage Grotesque', 'Poppins', sans-serif; font-weight: 800; font-size: 22px; margin: 40px 0 12px; }
  dl { margin: 0; }
  dt { font-weight: 600; margin: 16px 0 2px; }
  dd { margin: 0; color: var(--ink); }
  .equipo { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
  .persona { display: flex; flex-direction: column; align-items: center; gap: 10px; background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 20px 16px; text-decoration: none; color: var(--navy); font-weight: 600; }
  .persona img { width: 120px; height: 120px; border-radius: 50%; }
`

const cabeza = titulo => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${titulo}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<style>${estilos}</style>
</head>
<body>
<main>`

const pagina = p => `${cabeza(`Tu avatar Efeonce · ${p.nombre}`)}
  <h1>Tu avatar nuevo, ${p.nombre}<span class="punto">.</span></h1>
  <p class="bajada">El avatar oficial con la nueva línea gráfica de Efeonce. Descárgalo y úsalo como foto de perfil en todas tus herramientas de trabajo.</p>

  <section class="tarjeta" aria-label="Tu avatar">
    <img class="retrato" src="${AVATAR}/800/${p.slug}.png" width="200" height="200" alt="Avatar de ${p.completo}">
    <div class="acciones">
      <a class="primario" href="${AVATAR}/1080/${p.slug}.png" download="EO_Avatar-${p.archivo}.png">Descargar mi avatar</a>
      <a class="secundario" href="${AVATAR}/800/${p.slug}.png" download="EO_Avatar-${p.archivo}-800.png">Versión liviana (800 px)</a>
      <p class="nota">PNG cuadrado de 1080 px; las apps lo recortan en círculo, como ves aquí.</p>
    </div>
  </section>

  <h2>Dónde cambiarlo<span class="punto">.</span></h2>
  <dl>
${DONDE.map(([d, t]) => `    <dt>${d}</dt>\n    <dd>${t}</dd>`).join('\n')}
  </dl>

  <h2>Tu firma de correo<span class="punto">.</span></h2>
  <p class="bajada">Ya lleva este avatar. Si ya la habías pegado en Outlook, cópiala de nuevo para verla con la foto más grande.</p>
  <a class="secundario" href="${FIRMA}/${p.slug}.html">Copiar mi firma</a>
</main>
</body>
</html>
`

const indice = () => `${cabeza('Avatares del equipo Efeonce')}
  <h1>Avatares del equipo<span class="punto">.</span></h1>
  <p class="bajada">Elige tu nombre para descargar tu avatar oficial y ver dónde cambiarlo.</p>
  <div class="equipo">
${EQUIPO.map(p => `    <a class="persona" href="${p.slug}.html"><img src="${AVATAR}/800/${p.slug}.png" width="120" height="120" alt="">${p.completo}</a>`).join('\n')}
  </div>
</main>
</body>
</html>
`

mkdirSync(DIR + 'out', { recursive: true })
for (const p of EQUIPO) writeFileSync(DIR + `out/${p.slug}.html`, pagina(p))
writeFileSync(DIR + 'out/index.html', indice())
console.log('ok', EQUIPO.length + 1)
