/**
 * `content-one-platform` (deck Salesforce, SF1, TASK-1942): «¿Cuántos Salesforce tienes? Uno.». La cuenta del cliente
 * al centro, en papel y con su reflejo, sobre la plataforma de luz; cinco áreas de trabajo flotan en vidrio a distinta
 * profundidad, cada una con el ícono oficial de su producto, y su luz baja a la cuenta. La selección «Cliente» toma la
 * cuenta.
 *
 * Todo lo que pinta sale de AXIS (`efeonceGraphicLine.surfaces.deck.recipes['content-one-platform']`): la voz, el
 * escenario, la plataforma, los haces, la cuenta y las fichas. `sceneOffsetXPx` corre la escena entera (plataforma,
 * haces, fichas y cuenta; no el halo, que ya viene centrado). El CONTENIDO llega en el intent: `workAreas` (cinco:
 * `icon`, `area`, `product`) y `account` (`name`, `initials`, `subtitle` y cuatro `facts` con `label` y `value`).
 */

import { SurfacePieceError } from '../../types'
import { contentOf, selectionSlot, voiceSlots } from '../../shared'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, layerAsset, measured } from '../kit'

import {
  beamsSvg,
  cssFine,
  documentVars,
  exactly,
  glassVars,
  lineColor,
  lineVoiceFrame,
  lumVars,
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

type Text = { px: number; weight?: number; tracking?: string; gapPx?: number; color?: string; family?: string }

type AccountTokens = {
  cxPx: number
  cyPx: number
  topOffsetPx: number
  widthPx: number
  padding: [number, number, number]
  radiusPx: number
  avatar: { px: number; fill: string; initials: Text; gapPx: number }
  headerGapBottomPx: number
  title: Text
  subtitle: Text
  facts: { max: number; paddingYPx: number; rule: string; key: Text; value: Text }
  document: LineDocument
  reflection: Reflection
}

type ProductTokens = {
  max: number
  widthPx: number
  padding: [number, number]
  radiusPx: number
  perspectivePx: number
  glass: FrostedGlass
  icon: { px: number; gapPx: number }
  title: Text
  product: Text
  positions: [number, number, number][]
  beams: { from: [number, number][]; toOffsetYPx: number[]; bendPx: number[] }
}

type AccountIntent = { name?: unknown; initials?: unknown; subtitle?: unknown; facts?: unknown }
type AreaIntent = { icon?: unknown; area?: unknown; product?: unknown }
type FactIntent = { label?: unknown; value?: unknown }

const tracking = (value: string | undefined, what: string): number => Number.parseFloat(measured(value, `el tracking de ${what}`))

export const contentOnePlatform: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const account = measured(recipe.account as AccountTokens | undefined, 'la cuenta del cliente')
  const products = measured(recipe.products as ProductTokens | undefined, 'las áreas de trabajo')
  const beam = measured(recipe.beam as LineBeam | undefined, 'el haz de luz')
  const dx = measured(recipe.sceneOffsetXPx as number | undefined, 'el corrimiento de la escena')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)
  const doc = account.document

  if (voice.answerLead) throw new SurfacePieceError('La respuesta de «una sola operación» va en una línea.', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('La lámina lleva su bajada (`body`).', 'invalid-intent')

  const areas = exactly<AreaIntent>(intent.workAreas, products.max, `Las áreas de trabajo (\`workAreas\`)`)
  const a = (intent.account ?? {}) as AccountIntent
  const facts = exactly<FactIntent>(a.facts, account.facts.max, 'Los hechos de la cuenta (`account.facts`)')
  const icons = areas.map((area, i) => productIcon(area.icon, `El área ${i + 1} (\`workAreas[${i}].icon\`)`, line))

  const { stage, platform } = stageLayers(manifest, recipe, line, 'opl', { dx })

  // Cada ficha manda su haz a la cuenta: al centro de la cuenta, `toOffsetYPx` más abajo (el de arriba, más arriba).
  const beams = layerAsset(
    'content-one-platform-beams',
    beamsSvg(
      manifest,
      products.beams.from.map((from, i) => ({
        from,
        to: [account.cxPx, account.cyPx + measured(products.beams.toOffsetYPx[i], `el destino del haz ${i + 1}`)] as [number, number],
        bend: measured(products.beams.bendPx[i], `la curva del haz ${i + 1}`)
      })),
      beam,
      line,
      'opl',
      dx
    )
  )

  const frame: Record<string, unknown> = {
    line,
    ...lineVoiceFrame(manifest, recipe),
    ...lumVars(recipe),
    ...glassVars(products.glass, line),
    ...documentVars(doc, line),
    ...reflectionVars(account.reflection),
    // La cuenta
    accountLeft: css('opl-account-left', account.cxPx - account.widthPx / 2 + dx),
    accountTop: css('opl-account-top', account.cyPx + account.topOffsetPx),
    accountWidth: css('opl-account-width', account.widthPx),
    accountPadTop: css('opl-account-pad-top', account.padding[0]),
    accountPadX: css('opl-account-pad-x', account.padding[1]),
    accountPadBottom: css('opl-account-pad-bottom', account.padding[2]),
    accountRadius: css('opl-account-radius', account.radiusPx),
    avatarSize: css('opl-avatar', account.avatar.px),
    avatarFill: colorVar('opl-avatar', lineColor(account.avatar.fill, line, 'el avatar', doc)),
    avatarGap: css('opl-avatar-gap', account.avatar.gapPx),
    headGap: css('opl-head-gap', measured(account.headerGapBottomPx, 'el aire bajo la cabecera de la cuenta')),
    initialsPx: css('opl-initials-px', account.avatar.initials.px),
    initialsColor: colorVar('opl-initials', lineColor(measured(account.avatar.initials.color, 'el color de las iniciales'), line, 'las iniciales', doc)),
    titlePx: css('opl-title-px', account.title.px),
    titleTracking: cssFine('opl-title-tracking', tracking(account.title.tracking, 'el nombre de la cuenta')),
    subtitlePx: css('opl-subtitle-px', account.subtitle.px),
    subtitleWeight: css('opl-subtitle-wght', measured(account.subtitle.weight, 'el peso del subtítulo'), ''),
    subtitleGap: css('opl-subtitle-gap', measured(account.subtitle.gapPx, 'el aire del subtítulo')),
    subtitleColor: colorVar('opl-subtitle', lineColor(measured(account.subtitle.color, 'el color del subtítulo'), line, 'el subtítulo', doc)),
    factPadY: css('opl-fact-pad-y', account.facts.paddingYPx),
    factRule: colorVar('opl-fact-rule', lineColor(account.facts.rule, line, 'el filete de los hechos', doc)),
    factKeyPx: css('opl-fact-key-px', account.facts.key.px),
    factKeyWeight: css('opl-fact-key-wght', measured(account.facts.key.weight, 'el peso de la clave'), ''),
    factKeyColor: colorVar('opl-fact-key', lineColor(measured(account.facts.key.color, 'el color de la clave'), line, 'la clave', doc)),
    factValuePx: css('opl-fact-value-px', account.facts.value.px),
    factValueWeight: css('opl-fact-value-wght', measured(account.facts.value.weight, 'el peso del valor'), ''),
    factValueColor: colorVar('opl-fact-value', lineColor(measured(account.facts.value.color, 'el color del valor'), line, 'el valor', doc)),
    // Las fichas
    tileWidth: css('opl-tile-width', products.widthPx),
    tilePadY: css('opl-tile-pad-y', products.padding[0]),
    tilePadX: css('opl-tile-pad-x', products.padding[1]),
    tileRadius: css('opl-tile-radius', products.radiusPx),
    tilePerspective: css('opl-tile-perspective', products.perspectivePx),
    tileIcon: css('opl-tile-icon', products.icon.px),
    tileGap: css('opl-tile-gap', products.icon.gapPx),
    areaPx: css('opl-area-px', products.title.px),
    areaTracking: cssFine('opl-area-tracking', tracking(products.title.tracking, 'el área')),
    areaColor: colorVar('opl-area', lineColor(measured(products.title.color, 'el color del área'), line, 'el área')),
    productPx: css('opl-product-px', products.product.px),
    productWeight: css('opl-product-wght', measured(products.product.weight, 'el peso del producto'), ''),
    productGap: css('opl-product-gap', measured(products.product.gapPx, 'el aire del producto')),
    productColor: colorVar('opl-product', lineColor(measured(products.product.color, 'el color del producto'), line, 'el producto'))
  }

  const selection = selectionSlot(manifest)

  return {
    contentType: 'deck.content-one-platform',
    slots: {
      frame,
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      beams: { src: beams.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      workAreas: areas.map((area, i) => {
        const [x, y, rotate] = measured(products.positions[i], `la posición del área ${i + 1}`)

        return {
          icon: icons[i]!.ref,
          area: req(area.area, `El área ${i + 1} (\`workAreas[${i}].area\`)`),
          product: req(area.product, `El producto del área ${i + 1} (\`workAreas[${i}].product\`)`),
          left: css('opl-left', x + dx),
          top: css('opl-top', y),
          rotate: css('opl-rotate', rotate, 'deg')
        }
      }),
      account: {
        initials: req(a.initials, 'Las iniciales de la cuenta (`account.initials`)'),
        name: req(a.name, 'El nombre de la cuenta (`account.name`)'),
        subtitle: req(a.subtitle, 'El subtítulo de la cuenta (`account.subtitle`)')
      },
      accountFacts: facts.map((fact, i) => ({
        label: req(fact.label, `La clave del hecho ${i + 1} (\`account.facts[${i}].label\`)`),
        value: req(fact.value, `El valor del hecho ${i + 1} (\`account.facts[${i}].value\`)`)
      })),
      ...(selection ? { selection } : {})
    },
    assets: uniqueAssets([stage.asset, platform.asset, beams.asset, ...icons.map(icon => icon.asset)])
  }
}
