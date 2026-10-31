import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'

import { arcPath, ORBIT_ACCENT_END_DEG, ORBIT_ARC_SWEEP_DEG, orbitWidthScale } from '@/components/greenhouse/motion/orbit-geometry'

import { AUTH_LOGIN_V4_COPY as copy } from '@/lib/copy/auth-server-login-v4'
import type { LoginAnnouncementDto } from '@/lib/login-announcements/types'

import { EFEONCE_LOGOTYPE_SVG } from './efeonce-isotipo.generated'
import { AUTH_LOGIN_STAGE_ASSETS } from './login-stage.generated'
import { escapeHtml } from './render'

/** Presentation only. The issuer resolves this from a validated registered RP, never a query label. */
export type LoginProductContext = {
  product: 'rooms' | 'synthetic-rp'
  displayName: string
  returnUrl: string
}

export type LoginPresentation = {
  productContext?: LoginProductContext
  announcements?: readonly LoginAnnouncementDto[]
}

const FALLBACK_PATH = '/images/login/stage-default.webp'
const safeImage = (path?: string): string | null => path && Object.hasOwn(AUTH_LOGIN_STAGE_ASSETS, path) ? path : null

/** Local source geometry from the V4 photo/lens contract, expressed in the SVG coordinate space. */
const photo = (path: string, alt: string, lens: LoginAnnouncementDto['lens'], id: string): string => {
  if (!lens) return `<img class="id-v4-photo" src="${escapeHtml(path)}" alt="${escapeHtml(alt)}" loading="eager">`
  const x = Number.isFinite(lens.x) ? Math.max(0, Math.min(100, lens.x)) : 52
  const y = Number.isFinite(lens.y) ? Math.max(0, Math.min(100, lens.y)) : 32
  const ratio = Number.isFinite(lens.radiusRatio) ? Math.max(0.05, Math.min(0.4, lens.radiusRatio)) : 0.24
  const cx = x * 10, cy = y * 14, radius = 1000 * ratio
  const ringRadius = radius * (1 + efeonceGraphicLine.orbit.ringAirRatio)
  const endAngle = ORBIT_ACCENT_END_DEG * Math.PI / 180
  const sphereX = cx + ringRadius * Math.cos(endAngle), sphereY = cy + ringRadius * Math.sin(endAngle)

  return `<svg class="id-v4-photo id-v4-lens" data-login-lens data-lens-x="${x}" data-lens-y="${y}" data-lens-radius="${ratio}" viewBox="0 0 1000 1400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${escapeHtml(alt)}">
    <defs><clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${radius}"/></clipPath></defs>
    <image class="id-v4-photo-muted" href="${escapeHtml(path)}" width="1000" height="1400" preserveAspectRatio="xMidYMid slice"/>
    <g clip-path="url(#${id})"><image class="id-v4-lens-inside" href="${escapeHtml(path)}" width="1000" height="1400" preserveAspectRatio="xMidYMid slice" transform="translate(${cx} ${cy}) scale(${efeonceGraphicLine.lens.zoom}) translate(${-cx} ${-cy})"/></g>
    <circle class="id-v4-lens-ring" cx="${cx}" cy="${cy}" r="${ringRadius}"/>
    <path class="id-v4-lens-arc" d="${arcPath(0, 0, 1, ORBIT_ACCENT_END_DEG, ORBIT_ARC_SWEEP_DEG)}" transform="translate(${cx} ${cy}) scale(${ringRadius})" vector-effect="non-scaling-stroke"/>
    <circle class="id-v4-lens-sphere" cx="${sphereX}" cy="${sphereY}" r="${efeonceGraphicLine.lens.anatomy.sphereRadiusPx * orbitWidthScale(1000)}"/>
  </svg>`
}

const editorialHref = (value?: string): string | null => {
  if (!value) return null

  try {
    const url = new URL(value, 'https://greenhouse.efeoncepro.com')

    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch { return null }
}

function renderStage(announcements: readonly LoginAnnouncementDto[] = []): string {
  // The public DTO can contain remote URLs. Only reviewed bundled photographs enter this strict-CSP renderer.
  const slides = announcements.filter(item => safeImage(item.image?.path)).slice(0, 3)

  if (!slides.length) return `<aside class="id-v4-stage" data-capture="login-stage" aria-label="${escapeHtml(copy.announcements)}">${photo(FALLBACK_PATH, copy.stageAlt, { x: 52, y: 32, radiusRatio: 0.24 }, 'id-v4-fallback-lens')}</aside>`

  return `<aside class="id-v4-stage" data-capture="login-stage" data-login-carousel aria-label="${escapeHtml(copy.announcements)}" aria-roledescription="carrusel">
    ${slides.map((item, index) => `<section class="id-v4-slide" data-login-slide${index ? ' hidden' : ''} role="group" aria-label="${escapeHtml(copy.slide(index + 1, slides.length))}">
      ${item.kind === 'banner' && editorialHref(item.cta?.url) ? `<a href="${escapeHtml(editorialHref(item.cta?.url)!)}" aria-label="${escapeHtml(item.cta?.label ?? item.image!.alt)}">${photo(item.image!.path, item.image!.alt, null, `id-v4-lens-${index}`)}</a>` : photo(item.image!.path, item.image!.alt, item.lens, `id-v4-lens-${index}`)}
      ${item.kind === 'text' ? `<div class="id-v4-story">${item.kicker ? `<p class="id-v4-kicker">${escapeHtml(item.kicker)}</p>` : ''}${item.title ? `<h2>${escapeHtml(item.title)}</h2>` : ''}${item.body ? `<p class="id-v4-story-body">${escapeHtml(item.body)}</p>` : ''}${editorialHref(item.cta?.url) ? `<a href="${escapeHtml(editorialHref(item.cta?.url)!)}">${escapeHtml(item.cta!.label)} <span aria-hidden="true">→</span></a>` : ''}</div>` : ''}
    </section>`).join('')}
    ${slides.length > 1 ? `<nav class="id-v4-tabs" aria-label="${escapeHtml(copy.announcements)}">${slides.map((item, index) => `<button type="button" data-login-slide-index="${index}" aria-current="${index === 0 ? 'true' : 'false'}">${escapeHtml(item.tabLabel)}</button>`).join('')}<button type="button" data-login-carousel-pause aria-label="${escapeHtml(copy.pause)}">Ⅱ</button></nav>` : ''}
  </aside>`
}

export function renderLoginV4Body(body: string, input: LoginPresentation): string {
  const context = input.productContext
  // Defense-in-depth: this prevents unsafe schemes even if a renderer is miscalled. RP eligibility is server-owned.
  const returnUrl = context && context.returnUrl.startsWith('https://') ? editorialHref(context.returnUrl) : null

  return `<div class="id-v4-layout" data-state="login">
    <main class="id-v4-panel" data-capture="id-shell" data-surface-recipe="settingsFlow" aria-labelledby="page-title">
      <div class="id-v4-form" data-capture="login-form">
        <header class="id-v4-brand" role="img" aria-label="Efeonce">${EFEONCE_LOGOTYPE_SVG}</header>
        ${body}
      </div>
      <footer class="id-v4-footer">${context ? `<span class="id-v4-product">${escapeHtml(context.displayName)}</span>` : ''}<p>${escapeHtml(copy.footer)}</p>${returnUrl ? `<a href="${escapeHtml(returnUrl)}">${escapeHtml(copy.returnTo(context!.displayName))}</a>` : ''}</footer>
    </main>
    ${renderStage(input.announcements)}
  </div>`
}
