/**
 * Renderiza un documento de licitación (Markdown) → HTML → PDF.
 *
 * ⚠️ POR QUÉ EXISTE: la oferta técnica de SKY tenía DOS artefactos mantenidos a mano —el `.md` y un
 * `.html` con CSS curado— y se editaban por separado. **Dos fuentes editables del mismo documento
 * contractual terminan entregando la versión equivocada.** Este script hace del `.md` la ÚNICA fuente:
 * el HTML y el PDF son DERIVADOS y se re-emiten con un comando.
 *
 * Es el mismo principio del Artifact Composer: el Plan es el artefacto auditable, el PDF es derivado.
 *
 *   pnpm tender:render <doc.md> [--out <dir>] [--title "..."] [--subtitle "..."]
 *
 * El PDF sale con las fuentes del sistema embebidas por Chromium (no depende de la red) y con
 * numeración de página — que es requisito de admisibilidad en varios portales.
 */
import fs from 'node:fs'
import path from 'node:path'

import { marked } from 'marked'
import { chromium } from 'playwright'

/** El shell visual del documento. Sobrio: lo lee un comité, no es una landing. */
const SHELL_CSS = `
  :root { --ink:#141821; --muted:#5b6470; --line:#e4e7ec; --brand:#0f2a4a; --accent:#1f6feb; }
  * { box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
    color:var(--ink); line-height:1.6; max-width:820px; margin:0 auto; padding:56px 40px 80px; }
  h1 { font-size:30px; line-height:1.2; margin:0 0 4px; color:var(--brand); letter-spacing:-.01em; }
  h2 { font-size:19px; font-weight:600; color:var(--muted); margin:0 0 24px; }
  h3 { font-size:20px; margin:38px 0 10px; color:var(--brand); letter-spacing:-.01em; }
  h4 { font-size:16px; margin:24px 0 8px; color:var(--brand); }
  p { margin:0 0 14px; }
  ul,ol { margin:0 0 16px; padding-left:22px; }
  li { margin:0 0 7px; }
  strong { color:#0a1626; }
  em { color:var(--muted); }
  table { border-collapse:collapse; width:100%; margin:12px 0 20px; font-size:14px; }
  th,td { border:1px solid var(--line); padding:9px 12px; text-align:left; vertical-align:top; }
  th { background:#f5f7fa; font-weight:600; }
  hr { border:0; border-top:1px solid var(--line); margin:34px 0; }
  .meta { font-size:14px; color:var(--muted); border-top:2px solid var(--brand);
    border-bottom:1px solid var(--line); padding:14px 0; margin:0 0 36px; line-height:1.9; }
  .meta strong { color:var(--ink); }
  blockquote { margin:0 0 16px; padding:10px 16px; border-left:3px solid var(--accent);
    background:#f7f9fc; color:var(--muted); }
  code { background:#f5f7fa; padding:1px 5px; border-radius:3px; font-size:.92em; }
  /* El comité imprime y anota. Que no se parta una tabla ni un titular huérfano. */
  @media print {
    body { padding:0 12px; max-width:none; }
    h3,h4 { page-break-after:avoid; }
    table,ul,ol,blockquote { page-break-inside:avoid; }
    tr { page-break-inside:avoid; }
  }
`

function fail(msg: string): never {
  console.error(`\n  ✗ ${msg}\n`)
  process.exit(1)
}

async function main() {
  const [, , src, ...rest] = process.argv

  if (!src) fail('uso: pnpm tender:render <doc.md> [--out <dir>]')
  if (!fs.existsSync(src)) fail(`no existe: ${src}`)

  const outDir = rest.includes('--out') ? rest[rest.indexOf('--out') + 1] : path.dirname(src)
  const md = fs.readFileSync(src, 'utf8')

  // El H1 y el H2 del markdown son el título y el subtítulo del documento.
  const h1 = md.match(/^#\s+(.+)$/m)?.[1] ?? path.basename(src, '.md')
  const h2 = md.match(/^##\s+(.+)$/m)?.[1] ?? ''

  // La CARÁTULA (las líneas `**Clave:** valor` entre el H2 y la primera regla horizontal) es un bloque
  // de METADATOS, no prosa: sus saltos de línea son significativos. Markdown los fundiría en un párrafo
  // corrido.
  //
  // ⚠️ La tentación es activar `breaks: true` globalmente — y es un parche: convertiría en `<br>` los
  // saltos de CUALQUIER párrafo envuelto a 100 columnas, partiendo frases a la mitad. La carátula se
  // extrae y se renderiza aparte; el cuerpo se parsea con las reglas normales de Markdown.
  const afterHeadings = md.replace(/^#\s+.+$/m, '').replace(/^##\s+.+$/m, '')
  const metaMatch = afterHeadings.match(/^\s*((?:\*\*[^*]+:\*\*[^\n]*\n)+)\s*---/)

  const metaHtml = metaMatch
    ? `<div class="meta">${await marked.parseInline(metaMatch[1].trim().replace(/\n/g, '<br>'))}</div>`
    : ''

  const bodyMd = metaMatch ? afterHeadings.slice(metaMatch[0].length) : afterHeadings

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${h1} — ${h2}</title>
<style>${SHELL_CSS}</style>
</head>
<body>
<h1>${h1}</h1>
${h2 ? `<h2>${h2}</h2>` : ''}
${metaHtml}
${await marked.parse(bodyMd)}
</body>
</html>`

  const base = path.basename(src, '.md')
  const htmlPath = path.join(outDir, `${base}.html`)
  const pdfPath = path.join(outDir, `${base}.pdf`)

  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(htmlPath, html, 'utf8')

  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', bottom: '20mm', left: '16mm', right: '16mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    // Numeración de página: en varios portales es requisito de admisibilidad, y el evaluador
    // necesita poder citar "página N" cuando puntúa contra la pauta.
    footerTemplate: `<div style="width:100%;font-size:9px;color:#8a929c;
      font-family:-apple-system,Helvetica,Arial,sans-serif;padding:0 16mm;
      display:flex;justify-content:space-between;">
      <span>${h1} · Efeonce Group SpA</span>
      <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
    </div>`
  })
  await browser.close()

  const kb = (fs.statSync(pdfPath).size / 1024).toFixed(0)

  console.log(`\n  ✓ ${path.basename(htmlPath)}`)
  console.log(`  ✓ ${path.basename(pdfPath)} — ${kb} KB`)
  console.log(`\n  El .md es la FUENTE. El HTML y el PDF son DERIVADOS: se re-emiten, no se editan.\n`)
}

main().catch(err => fail(err instanceof Error ? err.message : String(err)))
