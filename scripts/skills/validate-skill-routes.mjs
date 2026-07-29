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

// Índice nombre-de-skill → directorios donde existe (para resolver referencias cross-skill
// escritas como `otra-skill/references/x.md`, `skills/otra-skill/...` o `../otra-skill/...`).
const skillIndex = new Map()

for (const root of ROOTS) {
  if (!existsSync(root)) continue

  for (const d of readdirSync(root)) {
    const p = join(root, d)

    if (statSync(p).isDirectory()) {
      if (!skillIndex.has(d)) skillIndex.set(d, [])
      skillIndex.get(d).push(p)
    }
  }
}

const crossSkillCandidates = ref => {
  const parts = ref.replace(/^(\.\.\/)+/, '').replace(/^skills\//, '').split('/')
  const roots = skillIndex.get(parts[0])

  return roots ? roots.map(r => join(r, ...parts.slice(1))) : []
}

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

        // etiqueta de un link markdown: [`x.md`](destino). El backtick es texto, no una ruta:
        // lo que hay que verificar es el DESTINO. Si es una URL externa, no hay nada que
        // validar. Caso fuente: firebase-basics lista los archivos del repo upstream con
        // enlaces a github.com (59 falsos positivos).
        const after = text.slice(m.index + m[0].length, m.index + m[0].length + 200)
        const link = text[m.index - 1] === '[' && /^\]\(([^)]+)\)/.exec(after)

        if (link) {
          if (/^(https?:|\/\/|#)/.test(link[1])) continue
          if (existsSync(resolve(dirname(file), link[1]))) continue
        }

        // solo nos interesan rutas internas de skill
        if (!/(^|\/)(profiles|references)\//.test(ref) && !/(^|\/)SOURCES\.md$/.test(ref) && !/(^|\/)SKILL\.md$/.test(ref)) continue
        // cross-skill: precedida por `<otra-skill>` →
        const before = text.slice(Math.max(0, m.index - 60), m.index)
        const cross = SKILL_NAME.exec(before.trimEnd() + ' ')

        if (cross && cross[1] !== skill) continue
        checked++

        const expanded = ref.startsWith('~/') ? join(homedir(), ref.slice(2)) : ref

        const candidates = [
          resolve(dirname(file), expanded), // relativa al archivo
          resolve(skillRoot, expanded), // relativa a la raíz de la skill
          resolve(REPO, expanded), // anclada al repo
          expanded, // absoluta (o `~/…` ya expandida)
          ...crossSkillCandidates(ref) // `otra-skill/references/x.md`
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
