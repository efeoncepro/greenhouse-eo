// Página «Copiar mi firma» por persona (operador, 2026-09-29: «al menos yo no sé cómo poner una firma en HTML»).
// La persona abre su enlace, aprieta un botón y pega en Outlook: la firma viaja como texto enriquecido (text/html),
// con las imágenes alojadas en el bucket público. Colores desde el token de la línea.
// node paginas-instalar.mjs → instalar/<nombre-apellido>.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { efeonceGraphicLine } = require('@efeoncepro/axis-tokens')

const DIR = new URL('./', import.meta.url).pathname
const C = efeonceGraphicLine.color
const EQUIPO = {
  'julio-reyes': 'Julio',
  'daniela-ferreira': 'Daniela',
  'andres-carlosama': 'Andrés',
  'melkin-hernandez': 'Melkin',
  'humberly-henriquez': 'Humberly',
  'valentina-hoyos': 'Valentina'
}

mkdirSync(DIR + 'instalar', { recursive: true })

const pagina = (slug, nombre) => {
  const a = readFileSync(DIR + `out/${slug}/outlook-a.html`, 'utf8')
  const b = readFileSync(DIR + `out/${slug}/outlook-b.html`, 'utf8')
  const r = readFileSync(DIR + `out/${slug}/outlook-respuesta.html`, 'utf8')

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Tu firma Efeonce · ${nombre}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root { --navy: ${C.navy}; --dark: ${C.dark}; --teal: ${C.tealDark}; --paper: ${C.paper}; --ink: #3d4f63; --line: #dce2e8; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--navy); font-family: 'Poppins', Arial, sans-serif; line-height: 1.5; }
  main { max-width: 760px; margin: 0 auto; padding: 40px 16px 64px; }
  h1 { font-family: 'Bricolage Grotesque', 'Poppins', sans-serif; font-weight: 800; font-size: clamp(28px, 5vw, 40px); line-height: 1.1; margin: 0 0 8px; letter-spacing: -0.5px; }
  h1 .punto { color: var(--teal); }
  .bajada { color: var(--ink); margin: 0 0 28px; font-size: 16px; }
  .version { display: inline-flex; gap: 4px; background: #fff; border: 1px solid var(--line); border-radius: 999px; padding: 4px; margin-bottom: 16px; }
  .version button { border: 0; background: transparent; font: 500 14px 'Poppins', sans-serif; color: var(--ink); padding: 8px 16px; border-radius: 999px; cursor: pointer; }
  .version button[aria-pressed="true"] { background: var(--navy); color: #fff; }
  .lienzo { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 24px; overflow-x: auto; }
  .lienzo.oscuro { background: ${C.dark}; border-color: ${C.dark}; }
  .acciones { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 20px 0 8px; }
  .primario, .secundario { font: 600 15px 'Poppins', sans-serif; border-radius: 12px; padding: 14px 22px; cursor: pointer; border: 1px solid var(--navy); }
  .primario { background: var(--navy); color: #fff; }
  .secundario { background: #fff; color: var(--navy); }
  .estado { font-size: 14px; color: var(--teal); min-height: 21px; margin: 0; }
  h2 { font-family: 'Bricolage Grotesque', 'Poppins', sans-serif; font-weight: 800; font-size: 22px; margin: 40px 0 12px; }
  ol { margin: 0; padding-left: 22px; color: var(--ink); }
  ol li { margin: 0 0 8px; }
  details { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 14px 18px; margin: 12px 0 0; color: var(--ink); }
  summary { cursor: pointer; font-weight: 600; color: var(--navy); }
  .nota { font-size: 14px; color: var(--ink); margin-top: 24px; }
  kbd { font: 500 13px 'Poppins', sans-serif; background: #fff; border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 6px; padding: 1px 6px; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<main>
  <h1>Tu firma de correo, ${nombre}<span class="punto">.</span></h1>
  <p class="bajada">La firma con la nueva línea gráfica de Efeonce. Elige la versión, aprieta el botón y pégala en Outlook.</p>

  <div class="version" role="group" aria-label="Versión de la firma">
    <button type="button" data-version="a" aria-pressed="true">Fondo blanco</button>
    <button type="button" data-version="b" aria-pressed="false">Fondo navy</button>
  </div>

  <div class="lienzo" id="lienzo-a"><div id="firma-a">${a}</div></div>
  <div class="lienzo oscuro" id="lienzo-b" hidden><div id="firma-b">${b}</div></div>

  <div class="acciones">
    <button type="button" class="primario" id="copiar">Copiar mi firma</button>
    <button type="button" class="secundario" id="copiar-respuesta">Copiar firma para respuestas</button>
  </div>
  <p class="estado" id="estado" role="status" aria-live="polite"></p>
  <div id="firma-r" hidden>${r}</div>

  <h2>Cómo pegarla en Outlook</h2>
  <ol>
    <li>Aprieta <strong>Copiar mi firma</strong>.</li>
    <li>En Outlook abre <strong>Configuración</strong> (el engranaje) → <strong>Cuentas</strong> → <strong>Firmas</strong> → <strong>Nueva firma</strong>. Ponle un nombre, por ejemplo «Efeonce».</li>
    <li>Pega con <kbd>Cmd</kbd> + <kbd>V</kbd> en Mac o <kbd>Ctrl</kbd> + <kbd>V</kbd> en Windows y guarda.</li>
    <li>En <strong>Firmas predeterminadas</strong>, elígela para <strong>mensajes nuevos</strong>.</li>
    <li>Vuelve aquí, aprieta <strong>Copiar firma para respuestas</strong>, crea otra firma igual y elígela para <strong>respuestas y reenvíos</strong>.</li>
  </ol>

  <details>
    <summary>Uso Outlook clásico en Windows</summary>
    <p>Archivo → Opciones → Correo → Firmas → Nueva. Pega la firma, guarda y elígela en «Mensajes nuevos» y en «Respuestas o reenvíos».</p>
  </details>
  <details>
    <summary>Uso Outlook en Mac</summary>
    <p>Outlook → Configuración → Firmas → el botón «+». Pega la firma, guarda y elígela como predeterminada para mensajes nuevos y para respuestas.</p>
  </details>

  <p class="nota">La foto y los logos se cargan desde internet: si Outlook pregunta, permite descargar imágenes. Envíate un correo de prueba y revísalo en el computador y en el teléfono. No agregues «Saludos» a la firma: eso va en el cuerpo del correo.</p>
</main>
<script>
  const estado = document.getElementById('estado')
  let version = 'a'

  document.querySelectorAll('[data-version]').forEach(boton => boton.addEventListener('click', () => {
    version = boton.dataset.version
    document.querySelectorAll('[data-version]').forEach(b => b.setAttribute('aria-pressed', String(b === boton)))
    document.getElementById('lienzo-a').hidden = version !== 'a'
    document.getElementById('lienzo-b').hidden = version !== 'b'
    estado.textContent = ''
  }))

  const copiar = async (id, aviso) => {
    const el = document.getElementById(id)
    const html = el.innerHTML

    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([el.innerText], { type: 'text/plain' })
      })])
    } catch {
      const oculto = el.hidden

      el.hidden = false
      const rango = document.createRange()

      rango.selectNodeContents(el)
      const seleccion = window.getSelection()

      seleccion.removeAllRanges()
      seleccion.addRange(rango)
      document.execCommand('copy')
      seleccion.removeAllRanges()
      el.hidden = oculto
    }

    estado.textContent = aviso
  }

  document.getElementById('copiar').addEventListener('click', () => copiar('firma-' + version, 'Copiada. Ahora pégala en Outlook, en Configuración → Cuentas → Firmas.'))
  document.getElementById('copiar-respuesta').addEventListener('click', () => copiar('firma-r', 'Firma para respuestas copiada. Pégala en una segunda firma.'))
</script>
</body>
</html>
`
}

for (const [slug, nombre] of Object.entries(EQUIPO)) writeFileSync(DIR + `instalar/${slug}.html`, pagina(slug, nombre))
console.log('ok', Object.keys(EQUIPO).length)
