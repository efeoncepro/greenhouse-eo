#!/usr/bin/env node
/**
 * Valida que las rutas que una skill promete en su router existan de verdad.
 *
 * Caso fuente (2026-07-27): `tailwind-engineer` prometía `profiles/efeonce-globe.md` y
 * `references/debugging.md`, pero dentro de greenhouse-eo gana el overlay de
 * `.claude/skills/<skill>/SKILL.md` — un solo archivo, donde esas rutas relativas no resuelven.
 * El operador se topó con el router roto justo en el perfil que más reglas duras tiene.
 *
 * Convenciones que entiende:
 *   - ruta relativa al archivo que la menciona            → `../SOURCES.md`
 *   - ruta relativa a la raíz de la skill (desde SKILL.md) → `references/debugging.md`
 *   - ruta anclada al repo                                 → `.codex/skills/x/profiles/y.md`
 *   - referencia cross-skill: la mención viene precedida por `<otra-skill>` en la misma línea
 *     (p. ej. "`css-architect` → `references/platform-2026.md`") → se ignora
 *
 * Uso:  node scripts/skills/validate-skill-routes.mjs [--all]
 *       (sin flags valida el trío de materialización; --all valida toda skill con subdirectorios)
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'
import { homedir } from 'node:os'

const REPO = resolve(new URL('../..', import.meta.url).pathname)
const ROOTS = [join(homedir(), '.claude/skills'), join(REPO, '.codex/skills'), join(REPO, '.claude/skills')]
const DEFAULT_SKILLS = ['tailwind-engineer', 'css-architect', 'html-react-engineer']

const all = process.argv.includes('--all')
const REF = /`([^`\s]+\.md)`/g
const SKILL_NAME = /`([a-z0-9-]+)`\s*(?:→|->)\s*$/

const walk = dir =>
  readdirSync(dir).flatMap(e => {
    const p = join(dir, e)

    
return statSync(p).isDirectory() ? walk(p) : p.endsWith('.md') ? [p] : []
  })

const skillsIn = root =>
  existsSync(root)
    ? readdirSync(root).filter(d => {
        const p = join(root, d)

        if (!statSync(p).isDirectory()) return false
        
return all ? existsSync(join(p, 'SKILL.md')) : DEFAULT_SKILLS.includes(d)
      })
    : []

let checked = 0
const broken = []

for (const root of ROOTS) {
  for (const skill of skillsIn(root)) {
    const skillRoot = join(root, skill)

    for (const file of walk(skillRoot)) {
      const text = readFileSync(file, 'utf8')

      for (const m of text.matchAll(REF)) {
        const ref = m[1]

        // placeholders de documentación (`<dialecto>.md`, `profiles/*.md`) no son rutas
        if (/[<>*?]/.test(ref)) continue
        // solo nos interesan rutas internas de skill
        if (!/(^|\/)(profiles|references)\//.test(ref) && !/(^|\/)SOURCES\.md$/.test(ref) && !/(^|\/)SKILL\.md$/.test(ref)) continue
        // cross-skill: precedida por `<otra-skill>` →
        const before = text.slice(Math.max(0, m.index - 60), m.index)
        const cross = SKILL_NAME.exec(before.trimEnd() + ' ')

        if (cross && cross[1] !== skill) continue
        checked++

        const candidates = [
          resolve(dirname(file), ref), // relativa al archivo
          resolve(skillRoot, ref), // relativa a la raíz de la skill
          resolve(REPO, ref) // anclada al repo
        ]

        if (!candidates.some(existsSync)) {
          broken.push(`${relative(REPO, file) || file}  →  ${ref}`)
        }
      }
    }
  }
}

if (broken.length) {
  console.error(`\n✗ ${broken.length} ruta(s) prometida(s) que no existen:\n`)
  broken.forEach(b => console.error('  ' + b))
  console.error(`\n(${checked} rutas verificadas)\n`)
  process.exit(1)
}

console.log(`✓ ${checked} rutas verificadas, todas existen`)
