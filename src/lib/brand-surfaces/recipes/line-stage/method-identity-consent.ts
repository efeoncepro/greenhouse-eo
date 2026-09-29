/**
 * `method-identity-consent` (deck Salesforce, SF12, TASK-1942): «¿Puedes contactar a ese cliente? Con permiso.». Cinco
 * fuentes en vidrio mandan su haz al perfil unificado (el documento claro con su reflejo, el ícono oficial del producto
 * de datos y una fila por canal con su propósito y su permiso); del perfil salen tres haces a las activaciones, la
 * primera en papel. La selección «Cliente» toma el perfil.
 *
 * Todo lo que pinta sale de AXIS (`efeonceGraphicLine.surfaces.deck.recipes['method-identity-consent']`). El CONTENIDO
 * llega en el intent: `note`, `sources` (cinco nombres), `profileTitle`, `channels` (cuatro: `channel`, `purpose`,
 * `permitted`) y `activations` (tres: `icon`, `title`, `detail` y, opcional, el `channel` que usa).
 *
 * Las reglas de la receta que se pueden comprobar se cierran aquí: al menos un canal sin permiso (para que se lea la
 * diferencia); ninguna activación sale de un canal marcado — (ni lo declara ni lo nombra); y si el título del perfil
 * cuenta fuentes, el número coincide con las fuentes de la lámina.
 */

import { SurfacePieceError } from '../../types'
import { contentOf, selectionSlot, voiceSlots } from '../../shared'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, layerAsset, measured } from '../kit'

import { trackingPx } from './content-service-lanes'
import {
  beamsSvg,
  documentVars,
  exactly,
  glassVars,
  lineColor,
  lineVoiceFrame,
  lumVars,
  noteVars,
  productIcon,
  reflectionVars,
  req,
  stageLayers,
  uniqueAssets,
  type FrostedGlass,
  type LineBeam,
  type LineDocument,
  type Reflection
} from './kit'

type Text = { px: number; weight?: number; lineHeight?: number; tracking?: string; gapPx?: number; color?: string; text?: string; uppercase?: boolean }

type SourceTokens = {
  count: number
  xPx: number
  yPx: number
  stepPx: number
  widthPx: number
  padding: [number, number]
  radiusPx: number
  glass: FrostedGlass
  kicker: Text
  name: Text
  beams: { fromOffsetPx: [number, number]; to: [number, number]; bendPx: number }
}

type ProfileTokens = {
  xPx: number
  yPx: number
  widthPx: number
  padding: [number, number, number]
  radiusPx: number
  document: LineDocument
  reflection: Reflection
  icon: { px: number; gapPx: number }
  kicker: Text
  title: Text
  channels: {
    max: number
    paddingYPx: number
    rule: string
    gapPx: number
    channel: Text
    purpose: Text
    consent: { px: number; glyphPx: number; granted: { fill: string; color: string }; denied: { ring: { px: number; color: string }; color: string } }
  }
}

type ActivationTokens = {
  max: number
  xPx: number
  rowsYPx: number[]
  widthPx: number
  padding: [number, number]
  radiusPx: number
  gapPx: number
  lead: { document: LineDocument }
  rest: { glass: FrostedGlass }
  icon: { px: number }
  title: Text
  desc: Text
  beams: { from: [number, number]; toOffsetPx: [number, number]; bendPx: number }
}

type ChannelIntent = { channel?: unknown; purpose?: unknown; permitted?: unknown }
type ActivationIntent = { icon?: unknown; title?: unknown; detail?: unknown; channel?: unknown }

/** El producto de datos que resuelve la identidad: el ícono del perfil unificado (catálogo, `profileTitle`). */
const PROFILE_PRODUCT = 'data-cloud'

/** Las marcas del permiso, en el círculo del canal. */
const GRANTED_MARK = '✓'
const DENIED_MARK = '—'

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b)
const escapeRe = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const methodIdentityConsent: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const sourcesT = measured(recipe.sources as SourceTokens | undefined, 'las fuentes de datos')
  const profileT = measured(recipe.profile as ProfileTokens | undefined, 'el perfil unificado')
  const actsT = measured(recipe.activations as ActivationTokens | undefined, 'las activaciones')
  const beam = measured(recipe.beam as LineBeam | undefined, 'el haz de luz')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)
  const doc = profileT.document
  const channelsT = profileT.channels

  // Un solo papel y un solo vidrio en la lámina: las custom properties de la familia son una por raíz.
  if (!same(actsT.lead.document, doc)) throw new SurfacePieceError('AXIS midió dos papeles distintos en la lámina: la familia pinta uno.', 'invalid-intent')
  if (!same(actsT.rest.glass, sourcesT.glass)) throw new SurfacePieceError('AXIS midió dos vidrios distintos en la lámina: la familia pinta uno.', 'invalid-intent')

  if (!content.body) throw new SurfacePieceError('La lámina lleva su bajada (`body`).', 'invalid-intent')

  const note = req(content.note, 'La nota (`note`: ejemplo ilustrativo mientras las fuentes y los canales sean de ejemplo)')
  const sources = exactly<unknown>(intent.sources, sourcesT.count, 'Las fuentes (`sources`)').map((source, i) => req(source, `La fuente ${i + 1} (\`sources[${i}]\`)`))
  const profileTitle = req(intent.profileTitle, 'El título del perfil unificado (`profileTitle`)')
  const counted = /\d+/.exec(profileTitle)

  if (counted && Number(counted[0]) !== sources.length) {
    throw new SurfacePieceError(`El perfil cuenta ${counted[0]} fuentes y la lámina muestra ${sources.length}: el número coincide con las fuentes.`, 'invalid-intent')
  }

  const channels = exactly<ChannelIntent>(intent.channels, channelsT.max, 'Los canales del perfil (`channels`)').map((c, i) => {
    if (typeof c.permitted !== 'boolean') throw new SurfacePieceError(`El canal ${i + 1} (\`channels[${i}].permitted\`) declara si tiene permiso (true o false).`, 'invalid-intent')

    return { channel: req(c.channel, `El canal ${i + 1} (\`channels[${i}].channel\`)`), purpose: req(c.purpose, `El propósito del canal ${i + 1} (\`channels[${i}].purpose\`)`), permitted: c.permitted }
  })

  const denied = channels.filter(c => !c.permitted).map(c => c.channel)
  const granted = channels.filter(c => c.permitted).map(c => c.channel.toLocaleLowerCase('es'))

  if (denied.length === 0) throw new SurfacePieceError('Al menos un canal va sin permiso: la lámina muestra la diferencia entre unificar y poder contactar.', 'invalid-intent')

  const activations = exactly<ActivationIntent>(intent.activations, actsT.max, 'Las activaciones (`activations`)').map((a, i) => {
    const title = req(a.title, `La activación ${i + 1} (\`activations[${i}].title\`)`)
    const detail = req(a.detail, `El detalle de la activación ${i + 1} (\`activations[${i}].detail\`)`)

    if (a.channel !== undefined && !granted.includes(req(a.channel, `El canal de la activación ${i + 1} (\`activations[${i}].channel\`)`).toLocaleLowerCase('es'))) {
      throw new SurfacePieceError(`La activación ${i + 1} sale por «${String(a.channel)}», que no es un canal con permiso del perfil.`, 'invalid-intent')
    }

    const named = denied.find(channel => new RegExp(`(^|[^\\p{L}])${escapeRe(channel)}($|[^\\p{L}])`, 'iu').test(`${title} ${detail}`))

    if (named) throw new SurfacePieceError(`La activación ${i + 1} nombra «${named}», un canal sin permiso: ninguna activación sale de un canal marcado —.`, 'invalid-intent')

    return { icon: productIcon(a.icon, `La activación ${i + 1} (\`activations[${i}].icon\`)`), title, detail }
  })

  const profileIcon = productIcon(PROFILE_PRODUCT, 'El perfil unificado')
  const { stage, platform } = stageLayers(manifest, recipe, line, 'mic')

  // Cada fuente manda su haz al perfil; del perfil sale uno a cada activación.
  const beams = layerAsset(
    'method-identity-consent-beams',
    beamsSvg(
      manifest,
      [
        ...sources.map((_, i) => ({
          from: [sourcesT.xPx + sourcesT.beams.fromOffsetPx[0], sourcesT.yPx + i * sourcesT.stepPx + sourcesT.beams.fromOffsetPx[1]] as [number, number],
          to: sourcesT.beams.to,
          bend: sourcesT.beams.bendPx
        })),
        ...activations.map((_, i) => ({
          from: actsT.beams.from,
          to: [actsT.xPx + actsT.beams.toOffsetPx[0], measured(actsT.rowsYPx[i], `la altura de la activación ${i + 1}`) + actsT.beams.toOffsetPx[1]] as [number, number],
          bend: actsT.beams.bendPx
        }))
      ],
      beam,
      line,
      'mic'
    )
  )

  const consent = channelsT.consent

  const frame: Record<string, unknown> = {
    line,
    ...lineVoiceFrame(manifest, recipe),
    ...lumVars(recipe),
    ...noteVars(recipe, line),
    ...glassVars(sourcesT.glass, line),
    ...documentVars(doc, line),
    ...reflectionVars(profileT.reflection),
    // Las fuentes
    sourceLeft: css('mic-source-left', sourcesT.xPx),
    sourceWidth: css('mic-source-width', sourcesT.widthPx),
    sourcePadY: css('mic-source-pad-y', sourcesT.padding[0]),
    sourcePadX: css('mic-source-pad-x', sourcesT.padding[1]),
    sourceRadius: css('mic-source-radius', sourcesT.radiusPx),
    sourceKickerPx: css('mic-source-kicker-px', sourcesT.kicker.px),
    sourceKickerWeight: css('mic-source-kicker-wght', measured(sourcesT.kicker.weight, 'el peso del rótulo de la fuente'), ''),
    sourceKickerTracking: css('mic-source-kicker-tracking', trackingPx(sourcesT.kicker.tracking, sourcesT.kicker.px, 'el rótulo de la fuente')),
    sourceKickerColor: colorVar('mic-source-kicker', lineColor(measured(sourcesT.kicker.color, 'el color del rótulo'), line, 'el rótulo de la fuente')),
    sourceNamePx: css('mic-source-name-px', sourcesT.name.px),
    sourceNameGap: css('mic-source-name-gap', measured(sourcesT.name.gapPx, 'el aire del nombre de la fuente')),
    sourceNameColor: colorVar('mic-source-name', lineColor(measured(sourcesT.name.color, 'el color del nombre'), line, 'el nombre de la fuente')),
    // El perfil
    profileLeft: css('mic-profile-left', profileT.xPx),
    profileTop: css('mic-profile-top', profileT.yPx),
    profileWidth: css('mic-profile-width', profileT.widthPx),
    profilePadTop: css('mic-profile-pad-top', profileT.padding[0]),
    profilePadX: css('mic-profile-pad-x', profileT.padding[1]),
    profilePadBottom: css('mic-profile-pad-bottom', profileT.padding[2]),
    profileRadius: css('mic-profile-radius', profileT.radiusPx),
    profileIcon: css('mic-profile-icon', profileT.icon.px),
    profileIconGap: css('mic-profile-icon-gap', profileT.icon.gapPx),
    profileKickerPx: css('mic-profile-kicker-px', profileT.kicker.px),
    profileKickerWeight: css('mic-profile-kicker-wght', measured(profileT.kicker.weight, 'el peso del rótulo del perfil'), ''),
    profileKickerTracking: css('mic-profile-kicker-tracking', trackingPx(profileT.kicker.tracking, profileT.kicker.px, 'el rótulo del perfil')),
    profileKickerColor: colorVar('mic-profile-kicker', lineColor(measured(profileT.kicker.color, 'el color del rótulo del perfil'), line, 'el rótulo del perfil', doc)),
    profileTitlePx: css('mic-profile-title-px', profileT.title.px),
    profileTitleTracking: css('mic-profile-title-tracking', trackingPx(profileT.title.tracking, profileT.title.px, 'el título del perfil')),
    profileTitleGap: css('mic-profile-title-gap', measured(profileT.title.gapPx, 'el aire del título del perfil')),
    // Los canales
    channelPadY: css('mic-channel-pad-y', channelsT.paddingYPx),
    channelGap: css('mic-channel-gap', channelsT.gapPx),
    channelRule: colorVar('mic-channel-rule', lineColor(channelsT.rule, line, 'el filete de los canales', doc)),
    channelPx: css('mic-channel-px', channelsT.channel.px),
    channelWeight: css('mic-channel-wght', measured(channelsT.channel.weight, 'el peso del canal'), ''),
    purposePx: css('mic-purpose-px', channelsT.purpose.px),
    purposeWeight: css('mic-purpose-wght', measured(channelsT.purpose.weight, 'el peso del propósito'), ''),
    purposeColor: colorVar('mic-purpose', lineColor(measured(channelsT.purpose.color, 'el color del propósito'), line, 'el propósito', doc)),
    consentSize: css('mic-consent', consent.px),
    consentGlyph: css('mic-consent-glyph', consent.glyphPx),
    grantedFill: colorVar('mic-granted-fill', lineColor(consent.granted.fill, line, 'el permiso', doc)),
    grantedInk: colorVar('mic-granted-ink', lineColor(consent.granted.color, line, 'la marca del permiso', doc)),
    deniedRing: css('mic-denied-ring', consent.denied.ring.px),
    deniedRingColor: colorVar('mic-denied-ring', lineColor(consent.denied.ring.color, line, 'el contorno sin permiso', doc)),
    deniedInk: colorVar('mic-denied-ink', lineColor(consent.denied.color, line, 'la marca sin permiso', doc)),
    // Las activaciones
    actLeft: css('mic-act-left', actsT.xPx),
    actWidth: css('mic-act-width', actsT.widthPx),
    actPadY: css('mic-act-pad-y', actsT.padding[0]),
    actPadX: css('mic-act-pad-x', actsT.padding[1]),
    actRadius: css('mic-act-radius', actsT.radiusPx),
    actGap: css('mic-act-gap', actsT.gapPx),
    actIcon: css('mic-act-icon', actsT.icon.px),
    actTitlePx: css('mic-act-title-px', actsT.title.px),
    actTitleLeading: css('mic-act-title-leading', measured(actsT.title.lineHeight, 'el interlineado de la activación'), ''),
    actDescPx: css('mic-act-desc-px', actsT.desc.px),
    actDescWeight: css('mic-act-desc-wght', measured(actsT.desc.weight, 'el peso del detalle'), ''),
    actDescGap: css('mic-act-desc-gap', measured(actsT.desc.gapPx, 'el aire del detalle'))
  }

  const selection = selectionSlot(manifest)

  return {
    contentType: 'deck.method-identity-consent',
    slots: {
      frame,
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      beams: { src: beams.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      note,
      sources: sources.map((name, i) => ({
        kicker: req(sourcesT.kicker.text, 'El rótulo de la fuente'),
        name,
        top: css('mic-source-top', sourcesT.yPx + i * sourcesT.stepPx)
      })),
      profile: { icon: profileIcon.ref, kicker: req(profileT.kicker.text, 'El rótulo del perfil'), title: profileTitle },
      channels: channels.map(c => ({ channel: c.channel, purpose: c.purpose, mark: c.permitted ? GRANTED_MARK : DENIED_MARK, state: c.permitted ? 'yes' : 'no' })),
      activations: activations.map((a, i) => ({
        icon: a.icon.ref,
        title: a.title,
        detail: a.detail,
        role: i === 0 ? 'lead' : 'rest',
        top: css('mic-act-top', actsT.rowsYPx[i]!)
      })),
      ...(selection ? { selection } : {})
    },
    assets: uniqueAssets([stage.asset, platform.asset, beams.asset, profileIcon.asset, ...activations.map(a => a.icon.asset)])
  }
}
