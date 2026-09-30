/**
 * TODO AXIS TASK-1949 — fixture temporal de las seis recetas nativas del deck SEO/AEO. AXIS todavía no las publica
 * (Slice 3 de TASK-1949), así que `planSurfacePiece` las rechaza con `recipe-not-approved`. Estos valores son los que la
 * sesión de AXIS publica como `reserves`, `type` y `signature` de cada receta —medidos en las láminas aprobadas
 * (`ai-generations/2026-09-29_deck-seo-aeo-documentos/render-src/native/`)— y con ellos los tests arman el manifest que
 * resolvería el contrato para llamar al builder directo. Cuando AXIS publique, los tests pasan a `planSurfacePiece` y
 * este archivo se borra.
 */

import fs from 'node:fs'
import path from 'node:path'

import type { SurfaceManifest } from '../../../shared'

const H = 1080

type Voice = {
  eyebrow?: number
  question: number
  answer: number
  body: number
  questionWidth: number
  answerPx: number
  leading: number
  tracking: string
  inset: number
  bodyPx: number
  bodyWidth: number
}

/** La voz de cada receta: reservas (px desde arriba) y tipos. */
export const SV360_VOICE: Record<string, Voice> = {
  'content-brand-family': { question: 324, answer: 390, body: 666, questionWidth: 640, answerPx: 124, leading: 0.95, tracking: '-0.035em', inset: 0, bodyPx: 28, bodyWidth: 640 },
  'content-service-mockups': { eyebrow: 130, question: 196, answer: 280, body: 470, questionWidth: 560, answerPx: 128, leading: 0.95, tracking: '-0.045em', inset: -8, bodyPx: 26, bodyWidth: 460 },
  'content-report-formats': { eyebrow: 230, question: 285, answer: 351, body: 627, questionWidth: 640, answerPx: 124, leading: 0.95, tracking: '-0.035em', inset: 0, bodyPx: 26, bodyWidth: 600 },
  'content-committee-deck': { eyebrow: 130, question: 196, answer: 330, body: 690, questionWidth: 440, answerPx: 176, leading: 0.9, tracking: '-0.05em', inset: -8, bodyPx: 26, bodyWidth: 560 },
  'content-industries': { eyebrow: 130, question: 196, answer: 280, body: 560, questionWidth: 600, answerPx: 128, leading: 0.95, tracking: '-0.045em', inset: -8, bodyPx: 26, bodyWidth: 540 },
  'content-markets': { eyebrow: 130, question: 196, answer: 280, body: 560, questionWidth: 600, answerPx: 128, leading: 0.95, tracking: '-0.045em', inset: -8, bodyPx: 26, bodyWidth: 520 }
}

/** Los tokens de la receta que lee el builder (`type`, `signature`), en la forma de las recetas de TASK-1942. */
export const sv360RecipeTokens = (id: string): Record<string, unknown> => {
  const v = SV360_VOICE[id]!

  return {
    status: 'approved',
    role: 'content',
    uses: ['proposal', 'brochure'],
    formats: ['16x9'],
    themes: ['dark'],
    voice: { mode: 'question-answer', eyebrow: true },
    type: {
      eyebrow: { px: 16, weight: 500, tracking: '0.14em', uppercase: true },
      question: { px: 40, lineHeight: 1.2, maxWidthPx: v.questionWidth },
      answer: { px: v.answerPx, lineHeight: v.leading, tracking: v.tracking, insetPx: v.inset },
      body: { px: v.bodyPx, weight: v.bodyPx === 28 ? 400 : 300, lineHeight: v.bodyPx === 28 ? 1.35 : 1.45, maxWidthPx: v.bodyWidth }
    },
    signature: { mode: 'url-bubble-footer', urlBubble: { form: 'source-luminosity', widthPx: 160, insetPx: 140, bottomPx: 62 } }
  }
}

type Intent = Record<string, unknown> & { voice: { eyebrow?: string; question: string; answer: string[] | string }; body?: string; photo?: { plateRef: string; alt: string }; use?: string }

/** El manifest que resolvería el contrato de AXIS para el intent (voz, contenido y foto delegada). */
export const sv360Manifest = (id: string, intent: Intent): SurfaceManifest => {
  const v = SV360_VOICE[id]!
  const bands: [string, number | undefined][] = [['eyebrow', v.eyebrow], ['question', v.question], ['answer', v.answer], ['body', v.body]]
  const answer = Array.isArray(intent.voice.answer) ? intent.voice.answer : [intent.voice.answer]

  return {
    canvas: { width: 1920, height: H },
    safeArea: { marginPx: 140 },
    reserves: bands.filter(([, px]) => px !== undefined).map(([band, px]) => ({ band, fromTop: px! / H })),
    type: sv360RecipeTokens(id).type as SurfaceManifest['type'],
    content: { eyebrow: intent.voice.eyebrow ?? null, question: intent.voice.question, answer, body: intent.body ?? null },
    delegates: intent.photo ? { photo: { plateRef: intent.photo.plateRef, alt: intent.photo.alt, native: null, focus: null } } : {},
    use: (intent.use as 'brochure' | 'proposal' | undefined) ?? null,
    layout: null
  }
}

export const sv360Intent = (id: string): Intent => JSON.parse(fs.readFileSync(path.join(__dirname, `deck-${id}-intent.json`), 'utf8')) as Intent
