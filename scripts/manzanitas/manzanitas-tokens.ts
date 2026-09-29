/**
 * Compila el registro `manzanitasRegister` (@efeoncepro/axis-tokens) a los artefactos del catálogo `manzanitas` del
 * Artifact Composer (TASK-1939). Sólo Marketing con Manzanitas: complementa La órbita y nunca se mezcla con Glitch.
 *
 * El motor no importa paquetes de AXIS: el catálogo lee un SNAPSHOT generado y versionado —un CSS de custom properties
 * (`--mcm-*`) para las plantillas y un JSON para los tests—, igual que `glitch-tokens.*` y `graphic-line-tokens.*`.
 * `pnpm manzanitas:tokens --check` detecta el drift cuando AXIS publica y nadie recompiló. No decide valores: si un valor
 * no está en el token, la plantilla no lo tiene; las pocas medidas que el token todavía no publica llevan su origen.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import { efeonceGraphicLine as GL, manzanitasRegister as M } from '@efeoncepro/axis-tokens'
import * as fontkit from 'fontkit'

import { manzanitasCatalogDir } from '../../src/lib/artifact-composer/catalogs/manzanitas/brand'

const packageVersion = (name: string): string => {
  let dir = path.dirname(createRequire(path.join(process.cwd(), 'package.json')).resolve(name))

  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, 'package.json')

    if (fs.existsSync(candidate)) {
      const pkg = JSON.parse(fs.readFileSync(candidate, 'utf8')) as { name?: string; version?: string }

      if (pkg.name === name && pkg.version) return pkg.version
    }

    dir = path.dirname(dir)
  }

  throw new Error(`No encontré el package.json de ${name}.`)
}

export const MANZANITAS_AXIS_PACKAGES = ['@efeoncepro/axis-tokens', '@efeoncepro/axis-brand-assets', '@efeoncepro/axis-graphic-line', '@efeoncepro/axis-ui-contracts'] as const

export const manzanitasAxisVersions = (): Record<string, string> =>
  Object.fromEntries(MANZANITAS_AXIS_PACKAGES.map((name) => [name, packageVersion(name)]))

const px = (n: number) => `${n}px`
const q = (s: string) => `'${s}'`

/**
 * Proporción de la pregunta sobre la respuesta en la voz: la del componente `EfeonceOrbit.Voice` del sistema de diseño
 * «Efeonce — La órbita» con el que se aprobó el canvas v39 (`round(respuesta × 38 / 128)`; el anillo mide 0,42 de la
 * pregunta y separa 0,35). El token todavía no la publica; cumple `type.answer.minRatioOverQuestion` (≥ 3).
 */
export const MANZANITAS_VOICE_GEOMETRY = { questionOfAnswer: 38 / 128, ringOfQuestion: 0.42, ringGapOfQuestion: 0.35, answerGapOfQuestion: 0.25, answerLineHeight: 0.95, answerWidth: 96, answerOpticalSize: 88, questionLineHeight: 1.25 } as const

if (1 / MANZANITAS_VOICE_GEOMETRY.questionOfAnswer < M.type.answer.minRatioOverQuestion) {
  throw new Error('La voz del canvas dejó de cumplir type.answer.minRatioOverQuestion: revisa la proporción antes de compilar.')
}

const denseProperties = (): [string, string][] => {
  const c = M.denseText.templates['concept-three-points']
  const t = M.denseText.templates['comparison-two-columns']
  const st = M.denseText.templates['step-by-step']

  return [
    ['--mcm-concept-paragraph-top', px(c.paragraph.top)],
    ['--mcm-concept-paragraph-px', px(c.paragraph.px)],
    ['--mcm-concept-paragraph-lh', String(c.paragraph.lineHeight)],
    ['--mcm-concept-points-top', px(c.points.top)],
    ['--mcm-concept-points-gap', px(c.points.gapPx)],
    ['--mcm-dense-numeral-px', px(c.points.numeralPx)],
    ['--mcm-dense-title-px', px(c.points.titlePx)],
    ['--mcm-dense-body-px', px(c.points.bodyPx)],
    ['--mcm-table-top', px(t.table.top)],
    ['--mcm-table-width', px(t.table.widthPx)],
    ['--mcm-table-header-px', px(t.table.headerPx)],
    ['--mcm-table-label-px', px(t.table.labelPx)],
    ['--mcm-table-cell-px', px(t.table.cellPx)],
    ['--mcm-closer-top', px(t.closer.top)],
    ['--mcm-closer-px', px(t.closer.px)],
    ['--mcm-closer-width', px(t.closer.widthPx)],
    ['--mcm-steps-top', px(st.steps.top)],
    ['--mcm-steps-gap', px(st.steps.gapPx)]
  ]
}

/** Las custom properties que consumen las plantillas. Nombres estables: renombrar uno es un cambio de contrato. */
export const buildManzanitasTokenProperties = (): [string, string][] => {
  const s = M.surfaces
  const v = MANZANITAS_VOICE_GEOMETRY

  return [
    ['--mcm-navy', s.navy],
    ['--mcm-paper', s.paper],
    ['--mcm-ink-paper', s.inkOnPaper],
    ['--mcm-ink-navy', s.inkOnNavy],
    ['--mcm-muted-paper', s.mutedOnPaper],
    ['--mcm-muted-navy', s.mutedOnNavy],
    ['--mcm-neutral-paper', s.neutralOnPaper],
    ['--mcm-neutral-navy', s.neutralOnNavy.color],
    ['--mcm-neutral-navy-opacity', String(s.neutralOnNavy.opacity)],
    ['--mcm-ink-on-accent', s.inkOnAccent],
    ['--mcm-logo-ink-paper', M.masthead.ink.onPaper],
    ['--mcm-logo-ink-navy', M.masthead.ink.onNavy],
    ['--mcm-slogan-lead-paper', M.slogan.inherits.leadColor.onLight],
    ['--mcm-slogan-lead-navy', M.slogan.inherits.leadColor.onDark],
    ['--mcm-answer-family', q(M.type.answer.family)],
    ['--mcm-answer-weight', String(M.type.answer.weight)],
    ['--mcm-answer-tracking', M.type.answer.tracking],
    ['--mcm-answer-width', String(v.answerWidth)],
    ['--mcm-answer-opsz', String(v.answerOpticalSize)],
    ['--mcm-answer-lh', String(v.answerLineHeight)],
    ['--mcm-question-family', q(M.type.question.family)],
    ['--mcm-question-weight', String(M.type.question.weight)],
    ['--mcm-question-lh', String(v.questionLineHeight)],
    ['--mcm-question-of-answer', String(v.questionOfAnswer)],
    ['--mcm-ring-of-question', String(v.ringOfQuestion)],
    ['--mcm-ring-gap-of-question', String(v.ringGapOfQuestion)],
    ['--mcm-answer-gap-of-question', String(v.answerGapOfQuestion)],
    ['--mcm-sphere-diameter', `${GL.sphere.diameterEm}em`],
    // El aire antes de la esfera depende de la última letra (`sphere.opticalGapEm`): el resolver `mcm-sphere-gap` lo
    // ajusta por lámina; éste es el de por defecto.
    ['--mcm-sphere-gap', `${GL.sphere.defaultGapEm}em`],
    ['--mcm-text-family', q(M.type.text.family)],
    ['--mcm-swipe-x', px(M.swipe.x)],
    ['--mcm-swipe-y-cover', px(M.swipe.yCover)],
    ['--mcm-swipe-y-interior', px(M.swipe.yInterior)],
    ['--mcm-swipe-size', px(M.swipe.sizePx)],
    ['--mcm-signature-y', px(M.signature.carousel.logoY)],
    ['--mcm-signature-w', px(M.signature.carousel.w)],
    ['--mcm-signature-h', px(M.signature.carousel.h)],
    ['--mcm-close-logo-w', px(M.slogan.closeLockup.logoPx)],
    // `closeLockup.sloganPx` (24) NO se usa: desde el 2026-09-29 el eslogan se dimensiona desde el logo (64 % de su
    // ancho, ver `measureSloganEm`); AXIS debe retirar ese valor (seguimiento de TASK-1939).
    // La palabra de la línea va en el acento sólo desde este cuerpo; bajo él, en la tinta (`accent.never: text-under-min-px`).
    ['--mcm-accent-min-text-px', px(M.accent.contrast.largeTextMinPx)],
    ['--mcm-close-block-ends-y', px(M.slogan.closeLockup.blockEndsY)],
    ['--mcm-slogan-of-logo', String(M.slogan.layout.sloganOfLogo)],
    ['--mcm-slogan-gap-of-font', String(M.slogan.layout.sloganGapOfFont)],
    ['--mcm-back-apple-scale', String(M.backCover.apple.scale)],
    ['--mcm-chart-source-px', px(M.charts.grammar.source.px)],
    // Las voces que el registro mide (`voice`): la de las láminas de gráfico, la de sólo pregunta (Medida y Tendencia,
    // cuya esfera es el dato) y la del texto denso.
    ['--mcm-chart-voice-top', px(M.voice.chartSlide.top)],
    ['--mcm-chart-voice-width', px(M.voice.chartSlide.width)],
    ['--mcm-chart-answer-px', px(M.voice.chartSlide.answerPx)],
    ['--mcm-question-only-top', px(M.voice.questionOnly.top)],
    ['--mcm-question-only-width', px(M.voice.questionOnly.width)],
    ['--mcm-question-only-px', px(M.voice.questionOnly.px)],
    ['--mcm-question-only-lh', String(M.voice.questionOnly.lineHeight)],
    ['--mcm-dense-voice-top', px(M.voice.denseText.top)],
    ['--mcm-dense-answer-px', px(M.voice.denseText.answerPx)],
    // Texto denso (`denseText.templates`): concepto y tres puntos, comparación en dos columnas y paso a paso.
    ...denseProperties()
  ]
}

/**
 * Ancho del eslogan «Empower your <Palabra>» en em, en sus pesos oficiales: «Empower » Poppins 800 itálica, «your »
 * Poppins 800 y la palabra de la línea Poppins 900 itálica (el espacio va con la palabra que lo precede, como en la
 * plantilla). Se mide con fontkit sobre las fuentes del catálogo, las mismas que pinta el render: para «Growth» da
 * 11,586 em, la medida de la regla del operador (2026-09-29, skill `efeonce-graphic-line`, criteria.md §5).
 *
 * Con ese ancho el cierre dimensiona el eslogan como gráfico y no como texto: cuerpo = 0,64 × ancho del logo ÷ em
 * (`manzanitasRegister.slogan.layout.sloganOfLogo`), debajo del logo y separado 1,35 veces su cuerpo.
 */
export const measureSloganEm = (word: string, fontsDir = path.join(manzanitasCatalogDir, 'fonts')): number => {
  const open = (file: string) => fontkit.openSync(path.join(fontsDir, file)) as fontkit.Font
  const width = (font: fontkit.Font, text: string) => font.layout(text).glyphs.reduce((sum, g) => sum + g.advanceWidth, 0) / font.unitsPerEm

  const em = width(open('poppins-800-italic.ttf'), `${M.slogan.inherits.lead.split(' ')[0]} `) + width(open('poppins-800.ttf'), `${M.slogan.inherits.lead.split(' ').slice(1).join(' ')} `) + width(open('poppins-900-italic.ttf'), word)

  return Math.round(em * 1000) / 1000
}

/**
 * Cada línea declara su acento sobre papel y sobre navy (el tono de la lámina elige cuál usa `--mcm-accent`) y el
 * ancho de su eslogan en em (el cierre lo dimensiona desde el logo).
 */
export const buildManzanitasLineClasses = (): string =>
  GL.lines
    .map((l) => `.mcm-line-${l.key} {\n  --mcm-accent-paper: ${l.accentOnLight};\n  --mcm-accent-navy: ${l.accentOnDark};\n  --mcm-slogan-em: ${measureSloganEm(l.sloganWord)};\n}\n`)
    .join('\n')

export interface ManzanitasTokenArtifacts {
  css: string
  json: string
}

export const buildManzanitasTokenArtifacts = (): ManzanitasTokenArtifacts => {
  const versions = manzanitasAxisVersions()
  const props = buildManzanitasTokenProperties()

  const css = [
    '/**',
    ' * GENERADO — NO EDITAR A MANO.',
    ` * Tokens de Marketing con Manzanitas desde @efeoncepro/axis-tokens ${versions['@efeoncepro/axis-tokens']} (manzanitasRegister),`,
    ' * compilados por `pnpm manzanitas:tokens`. Una plantilla del registro sólo usa estas variables:',
    ' * un HEX o una familia escrita a mano en el HTML o en manzanitas.css es una regresión.',
    ' */',
    ':root {',
    ...props.map(([k, v]) => `  ${k}: ${v};`),
    '}',
    '',
    buildManzanitasLineClasses()
  ].join('\n')

  const snapshot = {
    source: { package: '@efeoncepro/axis-tokens', export: 'manzanitasRegister', versions },
    register: M.register,
    status: M.status,
    pieces: M.pieces,
    canvases: M.canvases,
    topicLine: M.topicLine,
    lines: GL.lines.map((l) => ({ key: l.key, sloganWord: l.sloganWord, accentOnLight: l.accentOnLight, accentOnDark: l.accentOnDark })),
    swipe: { voiceByLine: M.swipe.voiceByLine, lineOverrides: M.swipe.lineOverrides, glyphs: M.swipe.glyphs },
    pendingDecisions: M.pendingDecisions,
    voiceGeometry: MANZANITAS_VOICE_GEOMETRY,
    sphereGapEm: { byLetter: GL.sphere.opticalGapEm, default: GL.sphere.defaultGapEm }
  }

  return { css: `${css}`, json: `${JSON.stringify(snapshot, null, 2)}\n` }
}
