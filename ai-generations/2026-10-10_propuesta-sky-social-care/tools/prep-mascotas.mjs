// Recorta el margen transparente y reduce las poses oficiales del kit (sin alterarlas) para usarlas chicas en una lámina.
import sharp from 'sharp'
import path from 'node:path'
const BASE = '/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/5. Contenidos/14. Mascotas de partners'
const OUT = process.argv[2]
const items = [
  ['codex', 'Codex (OpenAI)', 'efeonce-codex-3d-02-saludo-tres-cuartos-izquierda-1x1-1600x1600-v01-transparente.png'],
  ['clawd', 'Clawd (Claude)', 'efeonce-clawd-3d-01-frente-heroe-1x1-1600x1600-v01-transparente.png'],
  ['gigi', 'Gigi (Google Gemini)', 'efeonce-gigi-3d-02-saludo-tres-cuartos-izquierda-1x1-1600x1600-v01-transparente.png'],
]
for (const [name, dir, file] of items) {
  const src = path.join(BASE, dir, 'Poses 3D/v01', file)
  const out = path.join(OUT, `${name}.png`)
  const info = await sharp(src).trim().resize({ height: 300 }).png().toFile(out)
  console.log(name, info.width, info.height, info.size)
}
