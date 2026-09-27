// Política optativa: autoriza decisiones explícitas; nunca recolorea ni declara armonía automáticamente.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

import { z } from 'zod'

import { ctaColors } from './cta-graphic-voice.mjs'

const token = z.enum(Object.keys(ctaColors))
const text = z.string().trim().min(1)
const reason = z.string().trim().min(10)
const campaign = z.string().regex(/^CMP-\d{3,}$/)
const localSource = text.refine(v => !/^[a-z][a-z\d+.-]*:\/\//i.test(v) && !v.includes('\0'), 'usa una ruta local al archivo de política')

export const colorPolicyReferenceSchema = z.object({
  version: z.literal(1),
  campaignId: campaign,
  source: localSource,
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  treatment: text,
  reason
}).strict()

const treatmentSchema = z.object({
  id: text,
  strategy: z.enum(['scene-related', 'intentional-contrast', 'neutral']),
  prominence: z.enum(['discreta', 'delimitada', 'destacada']),
  variant: z.enum(['text', 'outline', 'solid']),
  inkToken: token,
  surfaceToken: token.optional(),
  reason
}).strict().superRefine((t, ctx) => {
  if (t.variant !== 'text' && !t.surfaceToken) ctx.addIssue({ code: 'custom', path: ['surfaceToken'], message: 'la variante necesita borde o relleno explícito' })
  if (t.variant === 'text' && t.surfaceToken) ctx.addIssue({ code: 'custom', path: ['surfaceToken'], message: 'text no pinta superficie; declara sólo la tinta' })
})

export const campaignColorPolicySchema = z.object({
  version: z.literal(1),
  id: text,
  campaignId: campaign,
  direction: z.object({ paletteReason: reason, sceneRole: reason, textRole: reason, actionRole: reason }).strict(),
  palette: z.array(token).min(1),
  treatments: z.array(treatmentSchema).min(1)
}).strict().superRefine((p, ctx) => {
  if (new Set(p.palette).size !== p.palette.length) ctx.addIssue({ code: 'custom', path: ['palette'], message: 'tokens duplicados' })
  if (new Set(p.treatments.map(t => t.id)).size !== p.treatments.length) ctx.addIssue({ code: 'custom', path: ['treatments'], message: 'IDs de tratamiento duplicados' })
  p.treatments.forEach((t, i) => {
    for (const field of ['inkToken', 'surfaceToken']) {
      if (t[field] && !p.palette.includes(t[field])) ctx.addIssue({ code: 'custom', path: ['treatments', i, field], message: 'token fuera de la paleta de campaña' })
    }
  })
})

function parse(schema, value, label) {
  const result = schema.safeParse(value)

  if (!result.success) throw new Error(`${label}: ${result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  
return result.data
}

const digest = bytes => createHash('sha256').update(bytes).digest('hex')

// Misma decisión para preflight y gate. No modifica el plan ni rellena tokens omitidos.
export function resolveCtaColorPolicy(cta, planDir) {
  if (cta?.colorPolicy === undefined) return null
  const ref = parse(colorPolicyReferenceSchema, cta.colorPolicy, 'cta.colorPolicy')
  const source = path.resolve(planDir, ref.source)
  let bytes

  try {
    if (!fs.statSync(source).isFile() || fs.statSync(source).size > 1024 * 1024) throw new Error('archivo inválido')
    bytes = fs.readFileSync(source)
  } catch {
    throw new Error('cta.colorPolicy.source: política local ausente, ilegible o mayor que 1 MB')
  }

  if (digest(bytes) !== ref.sha256) throw new Error('cta.colorPolicy.sha256: la política cambió; revisa la decisión, actualiza su referencia y recompón')
  let raw

  try { raw = JSON.parse(bytes.toString('utf8')) } catch { throw new Error('cta.colorPolicy.source: JSON inválido') }
  const policy = parse(campaignColorPolicySchema, raw, 'política cromática')

  if (policy.campaignId !== ref.campaignId) throw new Error('cta.colorPolicy.campaignId: la política pertenece a otra campaña')
  const chosen = policy.treatments.find(t => t.id === ref.treatment)

  if (!chosen) throw new Error('cta.colorPolicy.treatment: el tratamiento no existe en la política')

  for (const field of ['variant', 'inkToken', 'surfaceToken']) {
    if (cta[field] !== chosen[field]) throw new Error(`cta.${field}: debe coincidir con el tratamiento ${chosen.id}; no se sustituye automáticamente`)
  }

  if (cta.prominencia !== chosen.prominence) throw new Error('cta.prominencia: debe coincidir con el tratamiento de campaña')
  const color = name => ({ token: name, value: ctaColors[name] })

  
return {
    version: 1, policyId: policy.id, campaignId: policy.campaignId, sha256: ref.sha256,
    treatment: chosen.id, strategy: chosen.strategy, prominence: chosen.prominence,
    variant: chosen.variant, reason: ref.reason, treatmentReason: chosen.reason,
    roles: { ink: color(chosen.inkToken), ...(chosen.variant === 'text' ? {} : { [chosen.variant === 'outline' ? 'border' : 'fill']: color(chosen.surfaceToken) }) },
    visualReview: 'required'
  }
}

// La reproducción cambia de carpeta: conserva la autoridad del archivo que referenció el plan original.
export function resolveColorPolicyPath(piece, planDir) {
  if (piece.cta?.colorPolicy === undefined) return piece
  const ref = parse(colorPolicyReferenceSchema, piece.cta.colorPolicy, 'cta.colorPolicy')

  
return { ...piece, cta: { ...piece.cta, colorPolicy: { ...ref, source: path.resolve(planDir, ref.source) } } }
}
