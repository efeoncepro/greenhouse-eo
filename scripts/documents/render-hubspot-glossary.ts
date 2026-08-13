/**
 * Renderiza el glosario operativo de HubSpot (Markdown) → HTML → PDF.
 *
 * El Markdown es la única fuente editable. El HTML y el PDF son derivados y
 * se regeneran con este comando:
 *
 *   pnpm hubspot:glossary:render
 *   pnpm hubspot:glossary:render -- --variant dark
 *
 * Chromium se usa aquí porque mantiene los SVG oficiales en vector y permite
 * componer header/footer repetibles con los logos de HubSpot y Efeonce.
 */

import fs from 'node:fs'
import path from 'node:path'

import { marked } from 'marked'
import { chromium } from 'playwright'

import {
  HUBSPOT_SOLUTION_PARTNER_BADGE_VARIANTS,
  getHubSpotSolutionPartnerBadge,
  type HubSpotSolutionPartnerBadgeVariant
} from '../../src/lib/brand-assets/hubspot-solution-partner'

const repoRoot = process.cwd()
const defaultSource = path.resolve(repoRoot, 'docs/services/hubspot-as-a-service/glosario-operativo-hubspot.md')

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, character => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }

    return entities[character] ?? character
  })

const svgDataUri = (relativePath: string): string => {
  const absolutePath = path.resolve(repoRoot, 'public', relativePath)

  return `data:image/svg+xml;base64,${fs.readFileSync(absolutePath).toString('base64')}`
}

const svgDataUriFromRepo = (relativePath: string): string => {
  const absolutePath = path.resolve(repoRoot, relativePath)

  return `data:image/svg+xml;base64,${fs.readFileSync(absolutePath).toString('base64')}`
}

const fontDataUri = (relativePath: string): string => {
  const absolutePath = path.resolve(repoRoot, relativePath)

  return `data:font/ttf;base64,${fs.readFileSync(absolutePath).toString('base64')}`
}

const argValue = (args: string[], name: string): string | null => {
  const index = args.indexOf(name)

  return index === -1 ? null : (args[index + 1] ?? null)
}

const readSource = (sourcePath: string) => {
  const markdown = fs.readFileSync(sourcePath, 'utf8')
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? 'Glosario operativo de HubSpot'
  const subtitle = markdown.match(/^>\s+(.+)$/m)?.[1]?.trim() ?? ''
  const date = markdown.match(/\*\*Fecha:\*\*\s*(.+)$/m)?.[1]?.trim() ?? '11 de agosto de 2026'

  const bodyMarkdown = markdown
    .replace(/^#\s+.+\n?/m, '')
    .replace(/^>\s+.+\n?/m, '')
    .replace(/^\*\*Efeonce[^\n]*\n?/m, '')
    .replace(/^\*\*Versión:[^\n]*\n?/m, '')
    .replace(/^\s*---\s*$/m, '')
    .trim()

  return { markdown, title, subtitle, date, bodyMarkdown }
}

const makeCss = (fonts: Record<string, string>) => `
  @font-face {
    font-family: "Geist";
    src: url(${fonts.geist400}) format("truetype");
    font-weight: 400;
  }
  @font-face {
    font-family: "Geist";
    src: url(${fonts.geist500}) format("truetype");
    font-weight: 500;
  }
  @font-face {
    font-family: "Geist";
    src: url(${fonts.geist600}) format("truetype");
    font-weight: 600;
  }
  @font-face {
    font-family: "Geist";
    src: url(${fonts.geist700}) format("truetype");
    font-weight: 700;
  }
  @font-face {
    font-family: "Poppins";
    src: url(${fonts.poppins700}) format("truetype");
    font-weight: 700;
  }

  :root {
    --hubspot-orange: #ff4800;
    --hubspot-coral: #ff5c35;
    --hubspot-teal: #042729;
    --cream: #f8f5ee;
    --ink: #1f1f1f;
    --muted: #5f6b70;
    --line: #e6e0d7;
    --paper: #ffffff;
  }

  * { box-sizing: border-box; }

  html { background: #e9e5df; }

  body {
    margin: 0;
    color: var(--ink);
    background: var(--paper);
    font-family: "Geist", Arial, sans-serif;
    font-size: 10.1pt;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  main { width: 100%; }

  .cover {
    min-height: 245mm;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 8mm 2mm 12mm;
    page-break-after: always;
    break-after: page;
  }

  .cover-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18mm;
  }

  .cover-top-copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .cover-kicker,
  .section-kicker {
    color: var(--hubspot-orange);
    font-size: 8.5pt;
    font-weight: 700;
    letter-spacing: .13em;
    text-transform: uppercase;
  }

  .cover-badge {
    display: block;
    width: 39mm;
    height: 39mm;
    object-fit: contain;
    flex: 0 0 auto;
  }

  .cover-client-lockup {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2mm;
    margin-top: 8mm;
  }

  .cover-client-label,
  .back-cover-kicker {
    color: var(--muted);
    font-size: 7pt;
    font-weight: 600;
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  .anam-logo-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50mm;
    min-height: 12mm;
  }

  .anam-logo {
    display: block;
    width: 46mm;
    height: auto;
  }

  .cover-copy { max-width: 136mm; padding-top: 28mm; }

  .cover h1 {
    max-width: 136mm;
    margin: 7mm 0 6mm;
    color: var(--hubspot-teal);
    font-family: "Poppins", "Geist", Arial, sans-serif;
    font-size: 35pt;
    font-weight: 700;
    line-height: 1.07;
    letter-spacing: -.035em;
  }

  .cover-subtitle {
    max-width: 116mm;
    margin: 0;
    color: var(--muted);
    font-size: 14pt;
    line-height: 1.4;
  }

  .cover-bottom {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 14mm;
    padding-top: 12mm;
    border-top: 1.5px solid var(--hubspot-orange);
  }

  .cover-note {
    max-width: 124mm;
    color: var(--muted);
    font-size: 8.5pt;
    line-height: 1.45;
  }

  .cover-meta {
    color: var(--hubspot-teal);
    font-size: 8.5pt;
    font-weight: 600;
    line-height: 1.6;
    text-align: right;
    white-space: nowrap;
  }

  .back-cover {
    min-height: 245mm;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 15mm 17mm 18mm;
    page-break-before: always;
    break-before: page;
    text-align: center;
  }

  .back-cover-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 126mm;
  }

  .back-cover-kicker {
    color: var(--hubspot-orange);
  }

  .back-cover .anam-logo-wrap {
    width: 72mm;
    margin: 9mm 0 12mm;
  }

  .back-cover .anam-logo {
    width: 62mm;
  }

  .back-cover h1 {
    margin: 0 0 6mm;
    color: var(--hubspot-teal);
    font-family: "Poppins", "Geist", Arial, sans-serif;
    font-size: 27pt;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -.035em;
  }

  .back-cover p {
    max-width: 105mm;
    margin: 0;
    color: var(--muted);
    font-size: 12pt;
    line-height: 1.45;
  }

  .document-body { padding-bottom: 4mm; }

  h2 {
    margin: 10mm 0 5mm;
    padding-top: 4mm;
    border-top: 1.5px solid var(--hubspot-orange);
    color: var(--hubspot-teal);
    font-family: "Poppins", "Geist", Arial, sans-serif;
    font-size: 18pt;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -.02em;
    break-after: avoid;
    page-break-after: avoid;
  }

  h2:first-child { margin-top: 0; }

  h3 {
    margin: 6mm 0 1.7mm;
    color: var(--hubspot-teal);
    font-family: "Poppins", "Geist", Arial, sans-serif;
    font-size: 12.3pt;
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: -.015em;
    break-after: avoid;
    page-break-after: avoid;
  }

  h3::before {
    content: "";
    display: inline-block;
    width: 4px;
    height: 4px;
    margin: 0 6px 3px 0;
    border-radius: 50%;
    background: var(--hubspot-orange);
  }

  p { margin: 0 0 3mm; }

  h3 + p,
  h2 + p { break-before: avoid; page-break-before: avoid; }

  strong { color: var(--hubspot-teal); font-weight: 700; }

  code {
    padding: .08em .3em;
    border-radius: 3px;
    background: var(--cream);
    color: var(--hubspot-teal);
    font-family: "Geist", monospace;
    font-size: .9em;
  }

  blockquote {
    margin: 0 0 6mm;
    padding: 4mm 5mm;
    border-left: 3px solid var(--hubspot-orange);
    background: var(--cream);
    color: var(--hubspot-teal);
    font-size: 11pt;
    line-height: 1.45;
  }

  ul, ol { margin: 0 0 4mm; padding-left: 6mm; }
  li { margin: 0 0 1.2mm; }
  hr { margin: 8mm 0; border: 0; border-top: 1px solid var(--line); }

  h2:last-of-type { margin-top: 12mm; font-size: 15pt; }
  h2:last-of-type + ul { font-size: 8.4pt; color: var(--muted); line-height: 1.45; }

  @media print {
    html { background: #fff; }
    h2, h3, p, li, blockquote { orphans: 3; widows: 3; }
    h2, h3 { break-inside: avoid; }
    ul, ol, blockquote { break-inside: avoid; }
  }
`

const makeHeaderTemplate = (hubspotLogo: string): string => `
  <div style="width:100%;padding:0 17mm 3.5mm;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e6e0d7;font-family:Arial,sans-serif;color:#5f6b70;">
    <img src="${hubspotLogo}" alt="HubSpot" style="width:87px;height:auto;display:block;" />
    <span style="font-size:8px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase;">Glosario operativo</span>
  </div>
`

const makeFooterTemplate = (efeonceLogo: string): string => `
  <div style="width:100%;padding:3.5mm 17mm 0;display:flex;align-items:center;gap:10px;border-top:1px solid #e6e0d7;font-family:Arial,sans-serif;color:#5f6b70;">
    <img src="${efeonceLogo}" alt="Efeonce" style="width:71px;height:auto;display:block;" />
    <span style="font-size:8px;color:#023c70;font-weight:700;">efeoncepro.com</span>
    <span style="height:11px;border-left:1px solid #d5cec4;"></span>
    <span style="font-size:8px;">HubSpot Solution Partner</span>
    <span style="margin-left:auto;font-size:8px;color:#8a929c;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
  </div>
`

const render = async ({
  sourcePath,
  outDir,
  variant
}: {
  sourcePath: string
  outDir: string
  variant: HubSpotSolutionPartnerBadgeVariant
}) => {
  const { title, subtitle, date, bodyMarkdown } = readSource(sourcePath)
  const badge = getHubSpotSolutionPartnerBadge(variant)
  const badgeData = svgDataUri(badge.src.replace(/^\//, ''))
  const hubspotLogo = svgDataUri('images/logos/axis/hubspot-logotype.svg')
  const efeonceLogo = svgDataUri('branding/logo-full.svg')

  const anamLogo = svgDataUriFromRepo(
    'src/lib/artifact-composer/catalogs/deck-axis/assets/clients/anam-figma-light.svg'
  )

  const fonts = {
    geist400: fontDataUri('src/lib/artifact-composer/brand-packs/axis/fonts/geist-400.ttf'),
    geist500: fontDataUri('src/lib/artifact-composer/brand-packs/axis/fonts/geist-500.ttf'),
    geist600: fontDataUri('src/lib/artifact-composer/brand-packs/axis/fonts/geist-600.ttf'),
    geist700: fontDataUri('src/lib/artifact-composer/brand-packs/axis/fonts/geist-700.ttf'),
    poppins700: fontDataUri('src/lib/artifact-composer/brand-packs/axis/fonts/poppins-700.ttf')
  }

  const bodyHtml = await marked.parse(bodyMarkdown)

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · Efeonce</title>
  <style>${makeCss(fonts)}</style>
</head>
<body>
  <section class="cover">
    <div class="cover-top">
      <div class="cover-top-copy">
        <div class="cover-kicker">Capacitación HubSpot · Efeonce</div>
        <div class="cover-client-lockup">
          <span class="cover-client-label">Material para</span>
          <div class="anam-logo-wrap"><img class="anam-logo" src="${anamLogo}" alt="ANAM" /></div>
        </div>
      </div>
      <img class="cover-badge" src="${badgeData}" alt="${escapeHtml(badge.label)}" />
    </div>
    <div class="cover-copy">
      <h1>${escapeHtml(title)}</h1>
      <p class="cover-subtitle">${escapeHtml(subtitle)}</p>
    </div>
    <div class="cover-bottom">
      <p class="cover-note">Una guía para hablar el mismo idioma, entender cómo se relacionan los datos y tomar mejores decisiones en CRM.</p>
      <div class="cover-meta">Versión 1.0<br />${escapeHtml(date)}</div>
    </div>
  </section>
  <main class="document-body">${bodyHtml}</main>
  <section class="back-cover" aria-label="Contraportada">
    <div class="back-cover-inner">
      <div class="back-cover-kicker">Capacitación HubSpot · ANAM</div>
      <div class="anam-logo-wrap"><img class="anam-logo" src="${anamLogo}" alt="ANAM" /></div>
      <h1>Una cuenta clara.<br />Un próximo paso visible.</h1>
      <p>La continuidad se construye cuando cada registro tiene contexto, cada etapa tiene evidencia y cada acción tiene una persona responsable.</p>
    </div>
  </section>
</body>
</html>`

  fs.mkdirSync(outDir, { recursive: true })
  const base = path.basename(sourcePath, path.extname(sourcePath))
  const htmlPath = path.join(outDir, `${base}.html`)
  const pdfPath = path.join(outDir, `${base}.pdf`)

  fs.writeFileSync(htmlPath, html, 'utf8')

  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 1 })

    await page.setContent(html, { waitUntil: 'networkidle' })
    await page.emulateMedia({ media: 'print' })

    const imageState = await page.locator('img').evaluateAll(images =>
      images.map(image => ({
        alt: image.getAttribute('alt'),
        complete: (image as HTMLImageElement).complete,
        naturalWidth: (image as HTMLImageElement).naturalWidth
      }))
    )

    if (imageState.some(image => !image.complete || image.naturalWidth === 0)) {
      throw new Error(`Hay imágenes sin cargar en el documento: ${JSON.stringify(imageState)}`)
    }

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: makeHeaderTemplate(hubspotLogo),
      footerTemplate: makeFooterTemplate(efeonceLogo),
      margin: { top: '28mm', bottom: '23mm', left: '17mm', right: '17mm' }
    })
  } finally {
    await browser.close()
  }

  const kilobytes = (fs.statSync(pdfPath).size / 1024).toFixed(0)

  console.log(`✓ ${htmlPath}`)

  console.log(`✓ ${pdfPath} · ${kilobytes} KB · variante ${variant}`)
}

const main = async () => {
  const args = process.argv.slice(2).filter(argument => argument !== '--')

  const positionalSource = args.find((argument, index) => {
    const previous = args[index - 1]

    return !argument.startsWith('--') && previous !== '--out' && previous !== '--variant'
  })

  const sourcePath = path.resolve(positionalSource ?? defaultSource)
  const outDir = path.resolve(argValue(args, '--out') ?? path.dirname(sourcePath))
  const requestedVariant = (argValue(args, '--variant') ?? 'orange') as HubSpotSolutionPartnerBadgeVariant

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`No existe el Markdown fuente: ${sourcePath}`)
  }

  if (!HUBSPOT_SOLUTION_PARTNER_BADGE_VARIANTS.includes(requestedVariant)) {
    throw new Error(
      `Variante inválida "${requestedVariant}". Usa: ${HUBSPOT_SOLUTION_PARTNER_BADGE_VARIANTS.join(', ')}`
    )
  }

  await render({ sourcePath, outDir, variant: requestedVariant })
}

main().catch(error => {
  console.error(`✗ ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
