// Pone el logo oficial de Educación Continua UTEM en el centro de la plataforma de la lámina de equipo.
// La lámina se compone con el título central vacío (U+2800 en center.title), así que no hay palabra que borrar ni parche.
// Uso: node logo-centro-equipo.mjs <entrada.png> <salida.png>
import sharp from 'sharp'
const [inp, out] = process.argv.slice(2)
const logo = await sharp('ai-generations/2026-10-08_utem-propuesta/logos-cliente/logo-v3-blanco.svg', { density: 600 }).resize({ height: 66 }).png().toBuffer()
const m = await sharp(logo).metadata()
await sharp(inp).composite([{ input: logo, left: 1300 - Math.round(m.width / 2), top: 826 - Math.round(m.height / 2) }]).png().toFile(out)
