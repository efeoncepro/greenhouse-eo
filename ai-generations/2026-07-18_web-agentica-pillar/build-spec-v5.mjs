import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const runDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(runDir, '../..')
const input = path.join(root, 'docs/public-site/WEB_AGENTICA_PILLAR_GUTENBERG_SPEC_V4.json')
const output = path.join(root, 'docs/public-site/WEB_AGENTICA_PILLAR_GUTENBERG_SPEC_V5.json')
const spec = JSON.parse(await readFile(input, 'utf8'))

const media = {
  'WAG-V02': { slug: 'frontera-operativa', ids: [251514, 251515, 251516, 251517], alt: 'Cuatro estados muestran cómo disminuye la inferencia y aumentan la operabilidad y el gobierno: sitio tradicional, sitio con IA, sitio preparado y web agéntica.', caption: 'La transición decisiva no es “más IA”, sino una acción explícita, gobernada y demostrable.' },
  'WAG-V03': { slug: 'arquitectura-compartida', ids: [251518, 251519, 251520, 251521], alt: 'La interfaz humana y la interfaz estructurada convergen en una capacidad compartida con contrato, gobierno y fuente de verdad únicos.', caption: 'La interfaz cambia; la capacidad, el gobierno y la fuente de verdad permanecen compartidos.' },
  'WAG-V05': { slug: 'mapa-ecosistema', ids: [251522, 251523, 251524, 251525], alt: 'Mapa de seis iniciativas por capa: WebMCP para interacción web, NLWeb para consulta, ACP y UCP para comercio, AP2 para pagos, A2A para agentes y AAIF para gobernanza.', caption: 'No hay un ganador único: emerge un stack de interoperabilidad con fronteras distintas.' },
  'WAG-V06': { slug: 'circuito-evaluacion', ids: [251526, 251527, 251528, 251529], alt: 'Circuito de evaluación en cinco pasos: contrato de herramienta, pruebas deterministas, evaluación probabilística, prueba de extremo a extremo y observación con recuperación.', caption: 'La confianza aparece cuando contrato, comportamiento, resultado y recuperación se prueban como sistema.' },
  'WAG-V07': { slug: 'madurez-agentica', ids: [251530, 251531, 251532, 251533], alt: 'Modelo de cinco niveles: encontrable, legible, correcto, intrínseco y operable; la acción gobernada no deriva automáticamente de la comprensión.', caption: 'Ser legible habilita comprensión; operar exige autoridad, límites, confirmación y evidencia.' },
  'WAG-V08': { slug: 'readiness-12-pruebas', ids: [251534, 251535, 251536, 251537], alt: 'Doce pruebas de preparación agrupadas en significado, interacción, ejecución y evidencia.', caption: 'Si una prueba falla, la autonomía debe detenerse o degradarse con seguridad.' },
  'WAG-V04': { slug: 'cadena-autoridad', ids: [251538, 251539, 251540, 251541], alt: 'Cadena de custodia desde la intención de una persona hasta la representación del agente, la decisión de la capacidad y la evidencia recuperable.', caption: 'Identificar al agente no basta: la acción debe demostrar representación, alcance, confirmación y resultado.' }
}

const url = (asset, viewport, theme) => `https://efeoncepro.com/wp-content/uploads/2026/07/web-agentica-${asset.slug}-${viewport}-${theme}-v7.svg`
const image = conceptId => {
  const asset = media[conceptId]
  const [desktopLight, desktopDark, mobileLight, mobileDark] = asset.ids
  return {
    kind: 'image', mediaId: desktopLight, url: url(asset, 'desktop', 'light'), alt: asset.alt,
    width: 1600, height: 1080, sizeSlug: 'large', linkDestination: 'media', caption: asset.caption,
    sources: [
      { media: '(prefers-color-scheme: dark) and (max-width: 860px)', url: url(asset, 'mobile', 'dark'), type: 'image/svg+xml', mediaId: mobileDark },
      { media: '(max-width: 860px)', url: url(asset, 'mobile', 'light'), type: 'image/svg+xml', mediaId: mobileLight },
      { media: '(prefers-color-scheme: dark)', url: url(asset, 'desktop', 'dark'), type: 'image/svg+xml', mediaId: desktopDark }
    ]
  }
}

const replaceImage = (sectionIndex, conceptId) => {
  const section = spec.sections[sectionIndex]
  const index = section.blocks.findIndex(block => block.kind === 'image')
  if (index < 0) throw new Error(`Missing image block in section ${sectionIndex + 1}`)
  section.blocks[index] = image(conceptId)
}
const insertAfterKind = (sectionIndex, kind, conceptId) => {
  const section = spec.sections[sectionIndex]
  const index = section.blocks.findIndex(block => block.kind === kind)
  if (index < 0) throw new Error(`Missing ${kind} block in section ${sectionIndex + 1}`)
  section.blocks.splice(index + 1, 0, image(conceptId))
}

replaceImage(0, 'WAG-V02')
replaceImage(4, 'WAG-V03')
insertAfterKind(6, 'table', 'WAG-V05')
insertAfterKind(7, 'table', 'WAG-V06')
insertAfterKind(8, 'table', 'WAG-V07')
insertAfterKind(9, 'list', 'WAG-V08')
replaceImage(11, 'WAG-V04')

await writeFile(output, `${JSON.stringify(spec, null, 2)}\n`)
process.stdout.write(`${JSON.stringify({ ok: true, output: path.relative(root, output), bodyImages: spec.sections.flatMap(section => section.blocks).filter(block => block.kind === 'image').length }, null, 2)}\n`)
