#!/usr/bin/env node
/**
 * TASK-1254 — Regenera la lista comprensiva de proveedores de correo gratis/público
 * (server-only) desde la fuente comunitaria willwhite/freemail (MIT).
 *
 * Uso: node scripts/growth/regenerate-free-email-domains.mjs
 * Salida: src/lib/growth/forms/email-verification/comprehensive-free-domains.ts
 *
 * "Se actualiza": correr esto periódicamente (o por cron) re-baja la lista y regenera el
 * módulo. NUNCA editar el .ts a mano. Solo se vendor-iza la lista de GRATIS (curada, bajo
 * riesgo de falso positivo); la de desechables (88k, agresiva) se deja fuera a propósito
 * para no bloquear por error a un prospecto enterprise real.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const SOURCE = 'https://raw.githubusercontent.com/willwhite/freemail/master/data/free.txt'
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../src/lib/growth/forms/email-verification/comprehensive-free-domains.ts')

const clean = text => {
  const set = new Set()

  for (let line of text.split(/\r?\n/)) {
    line = line.trim().toLowerCase()
    if (!line || line.startsWith('#') || line.startsWith('//')) continue
    if (!line.includes('.') || /\s/.test(line) || line.startsWith('.') || line.endsWith('.')) continue
    set.add(line)
  }

  
return [...set].sort()
}

const main = async () => {
  const res = await fetch(SOURCE)

  if (!res.ok) throw new Error(`fetch ${SOURCE} -> ${res.status}`)
  const domains = clean(await res.text())

  const file = `import 'server-only'

/**
 * TASK-1254 — Lista COMPRENSIVA de proveedores de correo gratis/público (server-only).
 *
 * GENERADO por scripts/growth/regenerate-free-email-domains.mjs desde willwhite/freemail
 * (MIT, comunidad) — ${domains.length} dominios normalizados (lowercase/dedupe/sort). NO EDITAR A MANO.
 *
 * Cubre el long-tail de proveedores públicos/gratis del mundo que la lista corta
 * browser-safe (email-domain-data.ts) no tiene. La consume el orquestador SERVER
 * (verifyEmail → endpoint público + submitForm), NO el bundle del renderer (no infla la
 * carga del formulario público). Set lazy (se construye en el primer uso).
 */

const RAW = ${JSON.stringify(domains.join('\n'))}

let cached: Set<string> | null = null

const getSet = (): Set<string> => {
  if (!cached) cached = new Set(RAW.split('\\n'))

  return cached
}

/** ¿el dominio está en la lista comprensiva de proveedores gratis/públicos? */
export const isComprehensiveFreeProvider = (domain: string | null | undefined): boolean =>
  domain != null && getSet().has(domain.trim().toLowerCase())

/** Cantidad de dominios en la lista (para tests/observabilidad). */
export const comprehensiveFreeProviderCount = (): number => getSet().size
`

  writeFileSync(OUT, file)
  console.log(`wrote ${OUT} (${domains.length} domains)`)
}

main().catch(err => {
  console.error('FAIL:', err.message)
  process.exit(1)
})
