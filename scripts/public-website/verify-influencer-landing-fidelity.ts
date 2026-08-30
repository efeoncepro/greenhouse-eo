#!/usr/bin/env tsx

import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

import { chromium, type BrowserContext, type Page } from 'playwright'

const LIVE_URL = 'https://efeoncepro.com/servicios/agencia-de-influencers/'

const SHOTS = [
  'hf_20260828_000024_9359f903-8b22-4045-bdde-34e155f0d952.mp4',
  'hf_20260827_233158_ae295ab9-0bb3-4c8d-b168-7bd44dd455f8.mp4',
  'hf_20260827_233408_95d79e91-c4ab-4d7b-87c1-11b5d46f6ffc.mp4'
] as const

const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const outputDirectory = resolve('.captures', `task1598-influencer-fidelity-${stamp}`)

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message)
}

const waitForLanding = async (page: Page) => {
  const response = await page.goto(`${LIVE_URL}?fidelity=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000
  })

  assert(response?.status() === 200, `Expected HTTP 200, received ${response?.status() ?? 'no response'}`)
  await page.locator('body.page-id-251627[data-fidelity-runtime="1"]').waitFor({ state: 'visible', timeout: 30_000 })
  await page.locator('#hero-video').waitFor({ state: 'visible', timeout: 20_000 })
  await page.locator('greenhouse-form .ghf-root').waitFor({ state: 'visible', timeout: 30_000 })
  await page
    .locator('greenhouse-cta[data-ghc-state="visible"] .ghc-card')
    .waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(2_000)
}

const inspectBaseContract = async (page: Page) =>
  page.evaluate(() => {
    const hero = document.querySelector('#hero-video') as HTMLVideoElement | null
    const sticker = document.querySelector('#hero img[src^="data:image/svg+xml"]') as HTMLImageElement | null
    const social = document.querySelector('#hero .ti-heart-filled')?.parentElement as HTMLElement | null
    const masthead = document.querySelector('#masthead') as HTMLElement | null
    const kicker = document.querySelector('#hero .gh-im-hero-kicker') as HTMLElement | null
    const player = document.querySelector('#hero .gh-im-hero-player') as HTMLElement | null
    const mastheadBottom = masthead?.getBoundingClientRect().bottom ?? 0
    const actions = Array.from(document.querySelectorAll('.gh-im-action')) as HTMLElement[]
    const actionIcons = Array.from(document.querySelectorAll('.gh-im-action > i')) as HTMLElement[]
    const heroLink = document.querySelector('.gh-im-hero-link') as HTMLElement | null
    const conversionIntro = document.querySelector('.gh-im-conversion__intro') as HTMLElement | null
    const conversionStack = document.querySelector('.gh-im-conversion__stack') as HTMLElement | null
    const faqIntro = document.querySelector('.gh-im-faq__intro') as HTMLElement | null
    const faqList = document.querySelector('.gh-im-faq__list') as HTMLElement | null
    const growthForm = document.querySelector('greenhouse-form') as HTMLElement | null
    const premiumFormCard = document.querySelector('.gh-im-form-card') as HTMLElement | null
    const premiumInput = growthForm?.querySelector('.ghf-input') as HTMLElement | null
    const premiumSubmit = growthForm?.querySelector('button[type="submit"].ghf-btn') as HTMLElement | null
    const premiumLabel = growthForm?.querySelector('.ghf-label') as HTMLElement | null
    const premiumConsent = growthForm?.querySelector('.ghf-field:has([data-ghf-consent])') as HTMLElement | null
    const premiumSelect = growthForm?.querySelector('.ghf-select') as HTMLElement | null
    const premiumSelectField = premiumSelect?.closest('.ghf-field') as HTMLElement | null
    const premiumComboboxes = Array.from(growthForm?.querySelectorAll('[role="combobox"].ghf-select-trigger') ?? [])
    const privacyLink = growthForm?.querySelector('a[href*="politica-de-privacidad"]') as HTMLAnchorElement | null
    const meetingCta = document.querySelector('greenhouse-cta') as HTMLElement | null
    const trustFacts = document.querySelector('.gh-im-trust-facts') as HTMLElement | null
    const socialTrust = document.querySelector('[data-gh-social-module="trust"]') as HTMLElement | null
    const socialTrustMarquee = socialTrust?.querySelector('.gh-logo-marquee') as HTMLElement | null
    const socialTrustSets = Array.from(socialTrust?.querySelectorAll('.gh-logo-marquee-set') ?? [])
    const mechanism = document.querySelector('#mecanismo') as HTMLElement | null
    const channelIcons = Array.from(document.querySelectorAll('.gh-im-channel i')) as HTMLElement[]
    const activationField = growthForm?.querySelector('.ghf-field:has([name="activationType"])') as HTMLElement | null
    const activationLabel = activationField?.querySelector('.ghf-label') as HTMLElement | null
    const objectiveField = growthForm?.querySelector('.ghf-field:has([name="objective"])') as HTMLElement | null
    const objectiveTextarea = objectiveField?.querySelector('.ghf-textarea') as HTMLElement | null
    const objectiveHelp = objectiveField?.querySelector('.ghf-help') as HTMLElement | null
    const objectiveCounter = objectiveField?.querySelector('.ghf-counter') as HTMLElement | null
    const disclosure = document.querySelector('.gh-im-proof-note') as HTMLElement | null
    const formHeadIcon = premiumFormCard?.querySelector('.gh-im-form-head__icon') as HTMLElement | null
    const formHeadLabel = premiumFormCard?.querySelector('.gh-im-form-head .gh-im-card-label') as HTMLElement | null
    const formHeadTitle = premiumFormCard?.querySelector('.gh-im-form-head h3') as HTMLElement | null
    const formHeadBody = premiumFormCard?.querySelector('.gh-im-form-head p') as HTMLElement | null
    const formTrust = premiumFormCard?.querySelector('.gh-im-form-trust') as HTMLElement | null
    const formHelp = growthForm?.querySelector('.ghf-help') as HTMLElement | null
    const rightsKicker = document.querySelector('.gh-im-rights-kicker') as HTMLElement | null
    const rightsDurations = Array.from(document.querySelectorAll('.gh-im-rights-duration')) as HTMLElement[]
    const rightsContexts = Array.from(document.querySelectorAll('.gh-im-rights-context')) as HTMLElement[]
    const offersBrief = document.querySelector('[data-gh-cta="ofertas-brief"]') as HTMLElement | null

    return {
      hero: hero
        ? {
            shot: hero.dataset.shot,
            src: hero.currentSrc || hero.src,
            paused: hero.paused,
            muted: hero.muted,
            display: getComputedStyle(hero).display
          }
        : null,
      segments: document.querySelectorAll('[id^="hero-seg-"]').length,
      playControl: Boolean(document.querySelector('[data-gh-hero-play][aria-label="Reproducir o pausar el video"]')),
      soundControl: Boolean(document.querySelector('[data-gh-hero-sound][aria-label="Activar el sonido"]')),
      sticker: sticker
        ? {
            naturalWidth: sticker.naturalWidth,
            display: getComputedStyle(sticker).display,
            width: sticker.getBoundingClientRect().width
          }
        : null,
      social: social
        ? {
            display: getComputedStyle(social).display,
            width: social.getBoundingClientRect().width,
            height: social.getBoundingClientRect().height,
            left: social.getBoundingClientRect().left,
            right: social.getBoundingClientRect().right
          }
        : null,
      headerClearance: {
        mastheadBottom,
        kicker: kicker ? kicker.getBoundingClientRect().top - mastheadBottom : null,
        player: player ? player.getBoundingClientRect().top - mastheadBottom : null
      },
      actions: actions.map(action => {
        const style = getComputedStyle(action)
        const rect = action.getBoundingClientRect()

        return {
          text: action.textContent?.trim(),
          height: rect.height,
          width: rect.width,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: Number(style.fontWeight),
          background: style.backgroundColor,
          borderWidth: style.borderWidth,
          cursor: style.cursor
        }
      }),
      actionIcons: actionIcons.map(icon => {
        const style = getComputedStyle(icon)

        return {
          background: style.backgroundColor,
          borderRadius: style.borderRadius,
          width: icon.getBoundingClientRect().width,
          height: icon.getBoundingClientRect().height
        }
      }),
      heroLink: heroLink
        ? {
            text: heroLink.textContent?.trim(),
            height: heroLink.getBoundingClientRect().height,
            fontWeight: Number(getComputedStyle(heroLink).fontWeight),
            background: getComputedStyle(heroLink).backgroundColor
          }
        : null,
      conversion: {
        introPosition: conversionIntro ? getComputedStyle(conversionIntro).position : null,
        introLeft: conversionIntro?.getBoundingClientRect().left ?? null,
        stackLeft: conversionStack?.getBoundingClientRect().left ?? null,
        introTop: conversionIntro?.getBoundingClientRect().top ?? null,
        stackTop: conversionStack?.getBoundingClientRect().top ?? null
      },
      faq: {
        introPosition: faqIntro ? getComputedStyle(faqIntro).position : null,
        introLeft: faqIntro?.getBoundingClientRect().left ?? null,
        introRight: faqIntro?.getBoundingClientRect().right ?? null,
        introBottom: faqIntro?.getBoundingClientRect().bottom ?? null,
        listLeft: faqList?.getBoundingClientRect().left ?? null,
        listTop: faqList?.getBoundingClientRect().top ?? null
      },
      rights: Array.from(document.querySelectorAll('#hero span')).some(
        node => node.textContent?.trim() === 'con derechos'
      ),
      offers: document.querySelectorAll('#ofertas .gh-im-offer[role="button"]').length,
      sticky: Boolean(document.querySelector('#sticky-cta')),
      revealPending: document.querySelectorAll('[data-reveal-pending]').length,
      growthForm: document.querySelector('greenhouse-form')?.getAttribute('form-key'),
      growthSurface: document.querySelector('greenhouse-form')?.getAttribute('surface'),
      growthRendered: {
        defined: Boolean(customElements.get('greenhouse-form')),
        height: growthForm?.getBoundingClientRect().height ?? 0,
        root: Boolean(growthForm?.querySelector('.ghf-root')),
        fields: growthForm?.querySelectorAll('.ghf-field').length ?? 0,
        submit: Boolean(growthForm?.querySelector('button[type="submit"].ghf-btn')),
        fallback: Boolean(growthForm?.querySelector('.gh-im-form-fallback'))
      },
      premiumForm: {
        header: Boolean(premiumFormCard?.querySelector('.gh-im-form-head h3')),
        trustSignals: premiumFormCard?.querySelectorAll('.gh-im-form-trust i').length ?? 0,
        fieldIcons: growthForm?.querySelectorAll('.ghf-label').length
          ? Array.from(growthForm.querySelectorAll('.ghf-label')).filter(
              label => getComputedStyle(label, '::before').backgroundImage !== 'none'
            ).length
          : 0,
        cardRadius: premiumFormCard ? Number.parseFloat(getComputedStyle(premiumFormCard).borderRadius) : 0,
        cardShadow: premiumFormCard ? getComputedStyle(premiumFormCard).boxShadow : 'none',
        inputHeight: premiumInput?.getBoundingClientRect().height ?? 0,
        inputFontSize: premiumInput ? Number.parseFloat(getComputedStyle(premiumInput).fontSize) : 0,
        inputBackground: premiumInput ? getComputedStyle(premiumInput).backgroundColor : null,
        submitHeight: premiumSubmit?.getBoundingClientRect().height ?? 0,
        submitWidth: premiumSubmit?.getBoundingClientRect().width ?? 0,
        submitBackground: premiumSubmit ? getComputedStyle(premiumSubmit).backgroundColor : null,
        submitColor: premiumSubmit ? getComputedStyle(premiumSubmit).color : null,
        submitBorderColor: premiumSubmit ? getComputedStyle(premiumSubmit).borderColor : null,
        formWidth: growthForm?.getBoundingClientRect().width ?? 0,
        consentBackground: premiumConsent ? getComputedStyle(premiumConsent).backgroundColor : null,
        labelIcon: premiumLabel ? getComputedStyle(premiumLabel, '::before').backgroundImage : 'none',
        selectAppearance: premiumSelect ? getComputedStyle(premiumSelect).appearance : null,
        selectIndicator: premiumSelectField ? getComputedStyle(premiumSelectField, '::after').content : 'none',
        selectCarets: premiumComboboxes.map(combobox => {
          const trigger = combobox as HTMLElement
          const icon = trigger.querySelector(':scope > .ghf-select-icon') as HTMLElement | null

          return {
            count: trigger.querySelectorAll(':scope > .ghf-select-icon').length,
            rightGap: icon
              ? Math.round(trigger.getBoundingClientRect().right - icon.getBoundingClientRect().right)
              : null
          }
        }),
        styleVariant: growthForm?.querySelector('.ghf-root')?.getAttribute('data-ghf-style-variant') ?? null,
        comboboxes: premiumComboboxes.length,
        nativeSelects: growthForm?.querySelectorAll('select.ghf-select').length ?? 0,
        privacyText: privacyLink?.textContent?.trim() ?? null
      },
      meetingCta: {
        defined: Boolean(customElements.get('greenhouse-cta')),
        state: meetingCta?.dataset.ghcState ?? null,
        slug: meetingCta?.getAttribute('cta') ?? null,
        surface: meetingCta?.getAttribute('surface') ?? null,
        action: meetingCta?.querySelector('.ghc-primary')?.textContent?.trim() ?? null
      },
      refinement: {
        disclosure: disclosure
          ? {
              left: disclosure.getBoundingClientRect().left,
              right: disclosure.getBoundingClientRect().right,
              width: disclosure.getBoundingClientRect().width,
              background: getComputedStyle(disclosure).backgroundColor
            }
          : null,
        formTypography: {
          iconClass: formHeadIcon?.className ?? null,
          iconBackground: formHeadIcon ? getComputedStyle(formHeadIcon).backgroundColor : null,
          overline: formHeadLabel
            ? {
                family: getComputedStyle(formHeadLabel).fontFamily,
                size: Number.parseFloat(getComputedStyle(formHeadLabel).fontSize),
                weight: Number(getComputedStyle(formHeadLabel).fontWeight),
                lineHeight: Number.parseFloat(getComputedStyle(formHeadLabel).lineHeight)
              }
            : null,
          title: formHeadTitle
            ? {
                family: getComputedStyle(formHeadTitle).fontFamily,
                size: Number.parseFloat(getComputedStyle(formHeadTitle).fontSize),
                weight: Number(getComputedStyle(formHeadTitle).fontWeight),
                lineHeight: Number.parseFloat(getComputedStyle(formHeadTitle).lineHeight)
              }
            : null,
          body: formHeadBody
            ? {
                family: getComputedStyle(formHeadBody).fontFamily,
                size: Number.parseFloat(getComputedStyle(formHeadBody).fontSize),
                weight: Number(getComputedStyle(formHeadBody).fontWeight),
                lineHeight: Number.parseFloat(getComputedStyle(formHeadBody).lineHeight)
              }
            : null,
          trust: formTrust
            ? {
                family: getComputedStyle(formTrust).fontFamily,
                size: Number.parseFloat(getComputedStyle(formTrust).fontSize),
                weight: Number(getComputedStyle(formTrust).fontWeight),
                lineHeight: Number.parseFloat(getComputedStyle(formTrust).lineHeight)
              }
            : null,
          labelWeight: premiumLabel ? Number(getComputedStyle(premiumLabel).fontWeight) : null,
          helpWeight: formHelp ? Number(getComputedStyle(formHelp).fontWeight) : null,
          submitWeight: premiumSubmit ? Number(getComputedStyle(premiumSubmit).fontWeight) : null
        },
        rightsSemantics: {
          kickerText: rightsKicker?.textContent?.trim() ?? null,
          kickerBackground: rightsKicker ? getComputedStyle(rightsKicker).backgroundColor : null,
          durationTexts: rightsDurations.map(node => node.textContent?.trim()),
          durationBackgrounds: rightsDurations.map(node => getComputedStyle(node).backgroundColor),
          contextTexts: rightsContexts.map(node => node.textContent?.trim()),
          contextBackgrounds: rightsContexts.map(node => getComputedStyle(node).backgroundColor),
          expiringCopy: document.body.textContent?.match(/vence\s+\d{1,2}\s+[a-z]{3}\s+20\d{2}/gi) ?? []
        },
        offersBrief: offersBrief
          ? {
              iconClass: offersBrief.querySelector('i')?.className ?? null,
              background: getComputedStyle(offersBrief).backgroundColor,
              borderWidth: getComputedStyle(offersBrief).borderWidth,
              color: getComputedStyle(offersBrief).color
            }
          : null,
        trustFacts: trustFacts?.children.length ?? 0,
        trustColumns: trustFacts ? getComputedStyle(trustFacts).gridTemplateColumns.split(' ').length : 0,
        socialTrust: {
          modules: document.querySelectorAll('[data-gh-social-module="trust"]').length,
          label: socialTrust?.querySelector('.ghs-trust-label')?.textContent?.trim() ?? null,
          ariaLabel: socialTrustMarquee?.getAttribute('aria-label') ?? null,
          schema: socialTrustMarquee?.dataset.ghSchema ?? null,
          sets: socialTrustSets.length,
          logosPerSet: socialTrustSets.map(set => set.querySelectorAll('img').length),
          monochrome: socialTrustSets.length
            ? Array.from(socialTrustSets[0].querySelectorAll('img')).every(
                logo => getComputedStyle(logo).filter !== 'none'
              )
            : false
        },
        mechanismLayers: mechanism ? getComputedStyle(mechanism).backgroundImage.split('gradient(').length - 1 : 0,
        mechanismColor: mechanism ? getComputedStyle(mechanism).backgroundColor : null,
        channelIcons: channelIcons.map(icon => ({
          className: icon.className,
          background: getComputedStyle(icon).backgroundColor,
          width: icon.getBoundingClientRect().width,
          height: icon.getBoundingClientRect().height
        })),
        activationIcon: activationLabel ? getComputedStyle(activationLabel, '::before').backgroundImage : 'none',
        objective: {
          textareaBottom: objectiveTextarea?.getBoundingClientRect().bottom ?? null,
          helpTop: objectiveHelp?.getBoundingClientRect().top ?? null,
          counterTop: objectiveCounter?.getBoundingClientRect().top ?? null,
          counterRight: objectiveCounter?.getBoundingClientRect().right ?? null,
          fieldRight: objectiveField?.getBoundingClientRect().right ?? null,
          counterBackground: objectiveCounter ? getComputedStyle(objectiveCounter).backgroundColor : null
        }
      },
      unresolved:
        document.documentElement.innerHTML.includes('{{') || Boolean(document.querySelector('x-import,sc-if')),
      widths: {
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth
      },
      proofVideos: document.querySelectorAll('video[data-video]:not(#hero-video)').length
    }
  })

const verifyCommon = (contract: Awaited<ReturnType<typeof inspectBaseContract>>, width: number) => {
  assert(contract.hero, `${width}px: hero video missing`)
  assert(contract.hero.shot === '0', `${width}px: initial hero shot is not 0`)
  assert(contract.hero.src.includes(SHOTS[0]), `${width}px: approved first hero video is missing`)
  assert(contract.segments === 3, `${width}px: expected three progress segments`)
  assert(contract.playControl, `${width}px: play/pause control missing`)
  assert(contract.soundControl, `${width}px: sound control missing`)
  assert(
    contract.sticker?.naturalWidth && contract.sticker.width > 0 && contract.sticker.display !== 'none',
    `${width}px: decorative like is not visible`
  )
  assert(
    contract.social?.width && contract.social.height && contract.social.display !== 'none',
    `${width}px: social icon stack is not visible`
  )
  assert(
    contract.social.left >= 0 && contract.social.right <= width,
    `${width}px: social icon stack is clipped by the viewport`
  )
  assert(contract.rights, `${width}px: rights badge missing`)
  assert(contract.headerClearance.kicker !== null, `${width}px: hero kicker marker missing`)
  assert(contract.headerClearance.player !== null, `${width}px: hero player marker missing`)
  assert(
    contract.headerClearance.kicker >= 28,
    `${width}px: hero kicker overlaps header (${contract.headerClearance.kicker}px clearance)`
  )
  assert(
    contract.headerClearance.player >= 28,
    `${width}px: hero player overlaps header (${contract.headerClearance.player}px clearance)`
  )
  assert(contract.actions.length === 7, `${width}px: expected seven governed buttons`)
  assert(
    contract.actions.every(action => action.fontFamily.includes('Geist') && action.fontWeight >= 600),
    `${width}px: CTA typography does not follow the AXIS label contract`
  )
  assert(
    contract.actions.every(action => action.height >= 44 && action.cursor === 'pointer'),
    `${width}px: CTA target size or affordance contract failed`
  )
  assert(
    contract.actions.every(action => action.background !== 'rgba(0, 0, 0, 0)' || action.borderWidth !== '0px'),
    `${width}px: a CTA lacks a visible boundary`
  )
  assert(contract.actionIcons.length > 0, `${width}px: expected CTA icons`)
  assert(
    contract.actionIcons.every(
      icon =>
        icon.background === 'rgba(0, 0, 0, 0)' && icon.borderRadius === '0px' && icon.width < 24 && icon.height < 24
    ),
    `${width}px: CTA icon circle was reintroduced`
  )
  assert(
    contract.heroLink?.text === 'Cuéntanos tu campaña' &&
      contract.heroLink.fontWeight >= 600 &&
      contract.heroLink.height >= 44 &&
      contract.heroLink.background === 'rgba(0, 0, 0, 0)',
    `${width}px: hero secondary action hierarchy failed`
  )
  assert(contract.offers === 5, `${width}px: expected five selectable offers`)
  assert(contract.sticky, `${width}px: sticky conversion CTA missing`)
  assert(contract.revealPending > 0, `${width}px: reveal motion contract was flattened`)
  assert(contract.growthForm === 'd2c68012-2a6b-41d6-b3dd-4b8ccbff6ee3', `${width}px: canonical Growth Form changed`)
  assert(contract.growthSurface === 'fhsf-efeonce-creator-influence', `${width}px: Growth Form surface changed`)
  assert(contract.growthRendered.defined, `${width}px: Growth Form custom element is not registered`)
  assert(
    contract.growthRendered.root &&
      contract.growthRendered.height >= 240 &&
      contract.growthRendered.fields >= 6 &&
      contract.growthRendered.submit &&
      !contract.growthRendered.fallback,
    `${width}px: Growth Form did not mount its complete interactive UI`
  )
  assert(
    contract.premiumForm.header &&
      contract.premiumForm.trustSignals === 2 &&
      contract.premiumForm.fieldIcons >= 6 &&
      contract.premiumForm.cardRadius >= 22 &&
      contract.premiumForm.cardShadow !== 'none' &&
      contract.premiumForm.inputHeight >= 56 &&
      contract.premiumForm.inputFontSize >= 16 &&
      contract.premiumForm.inputBackground === 'rgb(245, 247, 248)' &&
      contract.premiumForm.submitHeight >= 56 &&
      contract.premiumForm.submitWidth >= contract.premiumForm.formWidth - 2 &&
      contract.premiumForm.submitBackground === 'rgb(3, 117, 219)' &&
      contract.premiumForm.submitColor === 'rgb(255, 255, 255)' &&
      contract.premiumForm.submitBorderColor === 'rgb(0, 88, 168)' &&
      contract.premiumForm.consentBackground === 'rgb(245, 247, 248)' &&
      contract.premiumForm.labelIcon !== 'none' &&
      contract.premiumForm.selectIndicator === 'none' &&
      contract.premiumForm.selectCarets.length === 2 &&
      contract.premiumForm.selectCarets.every(caret => caret.count === 1 && caret.rightGap !== null && caret.rightGap <= 20) &&
      contract.premiumForm.styleVariant === 'diagnostic_premium' &&
      contract.premiumForm.comboboxes === 2 &&
      contract.premiumForm.nativeSelects === 0 &&
      contract.premiumForm.privacyText === 'Consulta nuestra Política de privacidad',
    `${width}px: premium Growth Form visual contract failed ${JSON.stringify(contract.premiumForm)}`
  )
  assert(
    contract.meetingCta.defined &&
      contract.meetingCta.state === 'visible' &&
      contract.meetingCta.slug === 'influencer-discovery-meeting' &&
      contract.meetingCta.action === 'Agendar una reunión',
    `${width}px: canonical Growth CTA meeting launcher failed`
  )
  assert(!contract.unresolved, `${width}px: uncompiled Claude Design bindings found`)
  assert(
    contract.widths.client === contract.widths.scroll,
    `${width}px: horizontal overflow (${contract.widths.client}/${contract.widths.scroll})`
  )
  assert(contract.proofVideos === 3, `${width}px: expected three proof videos`)
  assert(contract.refinement.trustFacts === 3, `${width}px: confidence rail must contain three proof groups`)
  assert(
    contract.refinement.disclosure &&
      Math.abs(contract.refinement.disclosure.left) <= 1 &&
      Math.abs(contract.refinement.disclosure.right - width) <= 1 &&
      Math.abs(contract.refinement.disclosure.width - width) <= 1 &&
      contract.refinement.disclosure.background === 'rgb(0, 64, 112)',
    `${width}px: disclosure strip is not a continuous full-bleed band ${JSON.stringify(contract.refinement.disclosure)}`
  )
  const formTypography = contract.refinement.formTypography

  assert(
    formTypography.iconClass?.includes('ti-clipboard-text') &&
      !formTypography.iconClass.includes('ti-sparkles') &&
      formTypography.iconBackground !== 'rgba(0, 0, 0, 0)' &&
      formTypography.overline?.family.includes('Geist') &&
      formTypography.overline.size === 12 &&
      formTypography.overline.weight === 600 &&
      formTypography.title?.family.includes('Poppins') &&
      formTypography.title.weight === 700 &&
      formTypography.title.lineHeight / formTypography.title.size >= 1.19 &&
      formTypography.body?.family.includes('Geist') &&
      formTypography.body.weight === 400 &&
      formTypography.body.lineHeight / formTypography.body.size >= 1.5 &&
      formTypography.trust?.family.includes('Geist') &&
      formTypography.trust.weight === 400 &&
      formTypography.labelWeight === 600 &&
      formTypography.helpWeight === 400 &&
      formTypography.submitWeight === 600,
    `${width}px: form typography hierarchy is not canonical ${JSON.stringify(formTypography)}`
  )
  const rightsSemantics = contract.refinement.rightsSemantics

  assert(
    rightsSemantics.kickerText === 'Derechos trazables' &&
      rightsSemantics.kickerBackground === 'rgba(255, 255, 255, 0.08)' &&
      rightsSemantics.durationTexts.join('|') === '12 meses|90 días|6 meses' &&
      rightsSemantics.contextTexts.join('|') ===
        'Publicación del creator|Pauta autorizada|Canales de la marca' &&
      rightsSemantics.durationBackgrounds.every(background => background === 'rgba(255, 255, 255, 0.08)') &&
      rightsSemantics.contextBackgrounds.every(background => background === 'rgba(255, 255, 255, 0.08)') &&
      rightsSemantics.expiringCopy.length === 0,
    `${width}px: rights chips lost stable semantic copy or tonal treatment ${JSON.stringify(rightsSemantics)}`
  )
  assert(
    contract.refinement.offersBrief?.iconClass?.includes('ti-arrow-up-right') &&
      contract.refinement.offersBrief.background === 'rgb(255, 255, 255)' &&
      contract.refinement.offersBrief.borderWidth !== '0px' &&
      contract.refinement.offersBrief.color === 'rgb(0, 64, 112)',
    `${width}px: offers brief CTA lost its outlined secondary hierarchy ${JSON.stringify(contract.refinement.offersBrief)}`
  )
  assert(
    contract.refinement.socialTrust.modules === 1 &&
      contract.refinement.socialTrust.label === 'Marcas que confían' &&
      contract.refinement.socialTrust.ariaLabel === 'Marcas que confían en Efeonce' &&
      contract.refinement.socialTrust.schema === 'logoMarquee.v2' &&
      contract.refinement.socialTrust.sets >= 2 &&
      contract.refinement.socialTrust.logosPerSet.length === contract.refinement.socialTrust.sets &&
      contract.refinement.socialTrust.logosPerSet.every(
        count => count === contract.refinement.socialTrust.logosPerSet[0] && count >= 7
      ) &&
      contract.refinement.socialTrust.monochrome,
    `${width}px: canonical social trust marquee contract failed ${JSON.stringify(contract.refinement.socialTrust)}`
  )
  assert(
    contract.refinement.mechanismLayers >= 4 && contract.refinement.mechanismColor !== 'rgba(0, 0, 0, 0)',
    `${width}px: mechanism section lost its layered navy visual plane ${JSON.stringify({ layers: contract.refinement.mechanismLayers, color: contract.refinement.mechanismColor })}`
  )
  const channelIconClasses = contract.refinement.channelIcons.map(icon => icon.className).join(' ')

  assert(
    contract.refinement.channelIcons.length === 6 &&
      channelIconClasses.includes('ti-brand-instagram') &&
      channelIconClasses.match(/ti-brand-tiktok/g)?.length === 2 &&
      channelIconClasses.includes('ti-brand-meta') &&
      channelIconClasses.includes('ti-shopping-bag') &&
      channelIconClasses.includes('ti-mail'),
    `${width}px: semantic channel icon set is incomplete`
  )
  assert(
    contract.refinement.channelIcons.every(
      icon => icon.background === 'rgba(0, 0, 0, 0)' && icon.width <= 20 && icon.height <= 20
    ),
    `${width}px: channel icons must remain compact and monochrome without discs`
  )
  assert(
    contract.refinement.activationIcon.includes('M18 8a3 3 0 0 1 0 6') &&
      !contract.refinement.activationIcon.includes('M12 3l1.2'),
    `${width}px: activation field must use the semantic campaign icon ${contract.refinement.activationIcon}`
  )
  const objective = contract.refinement.objective

  assert(
    objective.textareaBottom !== null &&
      objective.helpTop !== null &&
      objective.counterTop !== null &&
      objective.counterRight !== null &&
      objective.fieldRight !== null &&
      objective.helpTop - objective.textareaBottom >= 0 &&
      objective.helpTop - objective.textareaBottom <= 16 &&
      Math.abs(objective.counterTop - objective.helpTop) <= 4 &&
      objective.fieldRight - objective.counterRight <= 1 &&
      objective.counterBackground !== 'rgba(0, 0, 0, 0)',
    `${width}px: objective helper and counter lost their textarea proximity ${JSON.stringify(objective)}`
  )

  if (width > 760) {
    assert(contract.refinement.trustColumns === 3, `${width}px: confidence rail must use three editorial columns`)
    assert(contract.conversion.introPosition === 'sticky', `${width}px: conversion intro is not sticky`)
    assert(
      contract.conversion.introLeft !== null &&
        contract.conversion.stackLeft !== null &&
        contract.conversion.introLeft < contract.conversion.stackLeft,
      `${width}px: conversion columns collapsed unexpectedly`
    )
  } else {
    assert(contract.refinement.trustColumns === 1, `${width}px: confidence rail must stack on mobile`)
    assert(contract.conversion.introPosition === 'static', `${width}px: mobile conversion intro must not be sticky`)
    assert(
      contract.conversion.introTop !== null &&
        contract.conversion.stackTop !== null &&
        contract.conversion.introTop < contract.conversion.stackTop,
      `${width}px: mobile conversion order changed`
    )
  }

  if (width > 900) {
    assert(contract.faq.introPosition === 'sticky', `${width}px: desktop FAQ intro is not sticky`)
    assert(
      contract.faq.introRight !== null &&
        contract.faq.listLeft !== null &&
        contract.faq.introRight < contract.faq.listLeft,
      `${width}px: desktop FAQ columns overlap`
    )
  } else {
    assert(contract.faq.introPosition === 'static', `${width}px: wrapped FAQ intro must not be sticky`)
    assert(
      contract.faq.introLeft === contract.faq.listLeft &&
        contract.faq.introBottom !== null &&
        contract.faq.listTop !== null &&
        contract.faq.introBottom < contract.faq.listTop,
      `${width}px: wrapped FAQ intro overlaps the accordion`
    )
  }
}

const verifyInteractions = async (page: Page, width: number) => {
  const hero = page.locator('#hero-video')
  const heroMeeting = page.locator('[data-gh-cta="hero-meeting"]')

  await heroMeeting.focus()

  const focusStyle = await heroMeeting.evaluate(node => {
    const style = getComputedStyle(node)

    return { outlineWidth: style.outlineWidth, outlineStyle: style.outlineStyle }
  })

  assert(
    focusStyle.outlineStyle !== 'none' && Number.parseFloat(focusStyle.outlineWidth) >= 3,
    `${width}px: primary CTA has no robust focus-visible indicator`
  )

  await hero.evaluate(node => node.dispatchEvent(new Event('ended')))
  await page.waitForTimeout(500)
  let shot = await hero.evaluate((node: HTMLVideoElement) => ({
    shot: node.dataset.shot,
    src: node.currentSrc || node.src
  }))

  assert(shot.shot === '1' && shot.src.includes(SHOTS[1]), `${width}px: first ended event did not advance to video 2`)

  await hero.evaluate(node => node.dispatchEvent(new Event('ended')))
  await page.waitForTimeout(500)
  shot = await hero.evaluate((node: HTMLVideoElement) => ({
    shot: node.dataset.shot,
    src: node.currentSrc || node.src
  }))
  assert(shot.shot === '2' && shot.src.includes(SHOTS[2]), `${width}px: second ended event did not advance to video 3`)

  const sound = page.locator('[data-gh-hero-sound]')

  await sound.click()

  const soundState = await sound.evaluate(node => ({
    label: node.getAttribute('aria-label'),
    pressed: node.getAttribute('aria-pressed'),
    muted: (document.querySelector('#hero-video') as HTMLVideoElement).muted
  }))

  assert(
    soundState.label === 'Silenciar el video' && soundState.pressed === 'false' && !soundState.muted,
    `${width}px: sound control did not unmute the hero`
  )

  const offer = page.locator('#ofertas .gh-im-offer').nth(2)

  await offer.focus()
  await offer.press('Enter')

  const offerState = await page.evaluate(() => ({
    selected: document.querySelectorAll('#ofertas .gh-im-offer[aria-pressed="true"]').length,
    selectedIndex: document
      .querySelector('#ofertas .gh-im-offer[aria-pressed="true"]')
      ?.getAttribute('data-gh-offer-index'),
    visibleChips: Array.from(document.querySelectorAll('#ofertas [data-gh-selected-chip]')).filter(
      node => !node.hasAttribute('hidden')
    ).length,
    hint: document.querySelector('#ofertas .gh-im-action+span')?.textContent?.trim()
  }))

  assert(offerState.selected === 1 && offerState.selectedIndex === '2', `${width}px: keyboard offer selection failed`)
  assert(offerState.visibleChips === 1, `${width}px: selected-offer chip contract failed`)
  assert(offerState.hint?.includes('UGC content'), `${width}px: selected-offer hint did not update`)

  await page.evaluate(() => window.scrollTo(0, 900))
  await page.waitForTimeout(650)
  assert(
    (await page.locator('#sticky-cta').getAttribute('data-visible')) === 'true',
    `${width}px: sticky CTA did not appear`
  )

  const dockContract = await page.locator('#sticky-cta').evaluate(node => {
    const dock = node as HTMLElement
    const rect = dock.getBoundingClientRect()
    const copy = dock.querySelector('.gh-im-sticky__copy') as HTMLElement | null
    const primary = dock.querySelector('[data-gh-cta="sticky-meeting"]') as HTMLElement | null
    const secondary = dock.querySelector('[data-gh-cta="sticky-brief"]') as HTMLElement | null
    const icon = secondary?.querySelector('.ti-arrow-up-right') as HTMLElement | null
    const style = getComputedStyle(dock)
    const primaryStyle = primary ? getComputedStyle(primary) : null
    const secondaryStyle = secondary ? getComputedStyle(secondary) : null

    return {
      position: style.position,
      viewportHeight: window.innerHeight,
      rect: { left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width },
      radius: Number.parseFloat(style.borderRadius),
      borderWidth: style.borderWidth,
      background: style.backgroundColor,
      copy: copy?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      primary: primary
        ? {
            height: primary.getBoundingClientRect().height,
            background: primaryStyle?.backgroundColor ?? null
          }
        : null,
      secondary: secondary
        ? {
            height: secondary.getBoundingClientRect().height,
            background: secondaryStyle?.backgroundColor ?? null,
            borderWidth: secondaryStyle?.borderWidth ?? null,
            icon: icon?.className ?? null
          }
        : null
    }
  })

  assert(dockContract.position === 'fixed', `${width}px: premium dock is not fixed`)
  assert(
    dockContract.rect.left >= 10 &&
      dockContract.rect.right <= width - 10 &&
      dockContract.rect.bottom <= dockContract.viewportHeight - 8,
    `${width}px: premium dock is clipped ${JSON.stringify(dockContract.rect)}`
  )
  assert(
    dockContract.rect.width <= Math.min(width - (width <= 600 ? 24 : 32), 1121) &&
      dockContract.radius >= 18 &&
      dockContract.borderWidth !== '0px' &&
      dockContract.background !== 'rgb(19, 117, 193)',
    `${width}px: premium dock surface contract failed ${JSON.stringify(dockContract)}`
  )
  assert(
    dockContract.copy?.includes('Siguiente paso') && dockContract.copy.includes('Activa creators con derechos claros'),
    `${width}px: premium dock copy hierarchy is missing`
  )
  assert(
    dockContract.primary?.height &&
      dockContract.primary.height >= 48 &&
      dockContract.primary.background !== 'rgba(0, 0, 0, 0)',
    `${width}px: dock primary CTA lost its solid hierarchy`
  )
  assert(
      dockContract.secondary?.height &&
      dockContract.secondary.height >= 48 &&
      dockContract.secondary.background?.endsWith(', 0)') &&
      dockContract.secondary.borderWidth !== '0px' &&
      dockContract.secondary.icon?.includes('ti-arrow-up-right'),
    `${width}px: dock secondary outline/icon hierarchy failed ${JSON.stringify(dockContract.secondary)}`
  )
  await page.screenshot({ path: resolve(outputDirectory, `dock-${width}.png`) })

  await page.locator('[data-gh-action="meeting"]').first().click()
  await page.waitForTimeout(500)
  await page.locator('greenhouse-cta .ghc-primary').click()
  await page.locator('dialog.ghc-meeting-surface[open] efeonce-meeting-scheduler').waitFor({
    state: 'visible',
    timeout: 30_000
  })

  const meetingContract = await page.locator('dialog.ghc-meeting-surface[open]').evaluate(dialog => {
    const scheduler = dialog.querySelector('efeonce-meeting-scheduler')

    return {
      surface: scheduler?.getAttribute('surface'),
      key: scheduler?.getAttribute('scheduler-key'),
      providerLinks: dialog.querySelectorAll('a[href*="hubspot.com"]').length
    }
  })

  assert(
    meetingContract.surface === 'fhsf-efeonce-lead-gen-web' &&
      meetingContract.key === 'discovery' &&
      meetingContract.providerLinks === 0,
    `${width}px: Growth CTA did not open the canonical native scheduler`
  )
  await page.locator('dialog.ghc-meeting-surface[open] .ghc-meeting-close').click()

  await page.locator('#conversion').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const comboboxes = page.locator('greenhouse-form [role="combobox"].ghf-select-trigger')

  assert((await comboboxes.count()) === 2, `${width}px: expected two renderer-owned premium comboboxes`)

  for (const [index, expectedOptions] of [6, 5].entries()) {
    const trigger = comboboxes.nth(index)

    await trigger.click()
    const list = page.locator('greenhouse-form .ghf-select-list:not([hidden])')

    await list.waitFor({ state: 'visible', timeout: 3_000 })

    const selectContract = await list.evaluate(node => {
      const listbox = node as HTMLElement
      const options = Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]'))
      const first = options[0]
      const firstRect = first?.getBoundingClientRect()
      const topNode = firstRect ? document.elementFromPoint(firstRect.left + 8, firstRect.top + firstRect.height / 2) : null

      return {
        expanded: listbox.previousElementSibling?.getAttribute('aria-expanded') ?? null,
        fieldOpen: listbox.closest('.ghf-field')?.getAttribute('data-overlay-open') ?? null,
        optionCount: options.length,
        optionHeights: options.map(option => option.getBoundingClientRect().height),
        iconMarks: options.map(option => {
          const label = option.querySelector('.ghf-select-option-label') as HTMLElement | null
          const pseudo = label ? getComputedStyle(label, '::before') : null

          return {
            content: pseudo?.content ?? 'none',
            backgroundImage: pseudo?.backgroundImage ?? 'none',
            backgroundColor: pseudo?.backgroundColor ?? 'rgba(0, 0, 0, 0)'
          }
        }),
        topOptionOwnsPoint: Boolean(first && topNode && first.contains(topNode)),
        selectedColor: getComputedStyle(listbox.querySelector('[aria-selected="true"]') ?? first).color
      }
    })

    assert(
      selectContract.expanded === 'true' &&
        selectContract.fieldOpen === 'true' &&
        selectContract.optionCount === expectedOptions &&
        selectContract.optionHeights.every(height => height >= 46) &&
        selectContract.iconMarks.every(
          mark =>
            ((mark.content !== 'none' && mark.content !== 'normal' && mark.content !== '\"\"') ||
              mark.backgroundImage !== 'none') &&
            mark.backgroundColor !== 'rgb(3, 117, 219)'
        ) &&
        selectContract.topOptionOwnsPoint &&
        selectContract.selectedColor !== 'rgb(255, 255, 255)',
      `${width}px: premium semantic option list failed ${JSON.stringify(selectContract)}`
    )
    await page.screenshot({ path: resolve(outputDirectory, `select-${index === 0 ? 'market' : 'activation'}-${width}.png`) })
    await trigger.press('ArrowDown')
    await trigger.press('Enter')
    assert((await trigger.getAttribute('aria-expanded')) === 'false', `${width}px: combobox keyboard selection did not close`)

    if (index === 0) {
      const selectedMarketFlag = await trigger.evaluate(node => {
        const value = node.querySelector('.ghf-select-value') as HTMLElement | null
        const pseudo = value ? getComputedStyle(value, '::before') : null

        return {
          code: node.getAttribute('data-gh-market-icon'),
          backgroundImage: pseudo?.backgroundImage ?? 'none',
          borderRadius: pseudo?.borderRadius ?? '0px',
          size: Number.parseFloat(pseudo?.width ?? '0')
        }
      })

      assert(
        ['cl', 'co', 'mx', 'pe'].includes(selectedMarketFlag.code ?? '') &&
          selectedMarketFlag.backgroundImage !== 'none' &&
          selectedMarketFlag.borderRadius === '50%' &&
          selectedMarketFlag.size >= 24 &&
          selectContract.iconMarks.slice(0, 4).every(mark => mark.backgroundImage !== 'none'),
        `${width}px: country flags are not preserved in options and selected value ${JSON.stringify(selectedMarketFlag)}`
      )
    }
  }
}

const createContext = async (
  width: number,
  height: number,
  reducedMotion: 'reduce' | 'no-preference'
): Promise<BrowserContext> => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion })

  context.on('close', () => void browser.close())

  return context
}

const verifyViewport = async (width: number, height: number) => {
  const context = await createContext(width, height, 'no-preference')
  const page = await context.newPage()
  const errors: string[] = []

  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', error => errors.push(error.message))

  try {
    await waitForLanding(page)
    const contract = await inspectBaseContract(page)

    verifyCommon(contract, width)
    await page.locator('#hero').screenshot({ path: resolve(outputDirectory, `hero-${width}.png`) })
    await page.locator('.gh-im-trust-band').screenshot({ path: resolve(outputDirectory, `trust-${width}.png`) })
    await page
      .locator('[data-gh-social-module="trust"]')
      .screenshot({ path: resolve(outputDirectory, `trust-marquee-${width}.png`) })
    await page.locator('#ofertas').scrollIntoViewIfNeeded()
    await page.waitForTimeout(450)
    await page.locator('#ofertas').screenshot({ path: resolve(outputDirectory, `offers-${width}.png`) })
    await page.locator('#preguntas').scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await page.locator('#preguntas').screenshot({ path: resolve(outputDirectory, `faq-${width}.png`) })
    await page.locator('#mecanismo').scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await page.locator('#mecanismo').screenshot({ path: resolve(outputDirectory, `mechanism-${width}.png`) })
    await page.locator('#firma').scrollIntoViewIfNeeded()
    const proofReveals = page.locator('#firma [data-reveal]')

    for (let index = 0; index < (await proofReveals.count()); index += 1) {
      await proofReveals.nth(index).scrollIntoViewIfNeeded()
      await page.waitForTimeout(80)
    }

    await page.waitForTimeout(300)
    await page.locator('#firma').screenshot({ path: resolve(outputDirectory, `rights-${width}.png`) })

    const faqOverlap = await page.evaluate(() => {
      const intro = document.querySelector('.gh-im-faq__intro')?.getBoundingClientRect()
      const list = document.querySelector('.gh-im-faq__list')?.getBoundingClientRect()

      if (!intro || !list) return true

      return intro.left < list.right && intro.right > list.left && intro.top < list.bottom && intro.bottom > list.top
    })

    assert(!faqOverlap, `${width}px: FAQ intro visibly overlaps the accordion`)
    await page.locator('#conversion').scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await page.screenshot({ path: resolve(outputDirectory, `conversion-${width}.png`) })
    await page.evaluate(() => window.scrollTo(0, 0))
    await verifyInteractions(page, width)
    assert(errors.length === 0, `${width}px: console/page errors: ${errors.join(' | ')}`)

    return { width, contract, errors }
  } finally {
    await context.close()
  }
}

const verifyReducedMotion = async () => {
  const context = await createContext(390, 844, 'reduce')
  const page = await context.newPage()

  try {
    await waitForLanding(page)

    const state = await page.evaluate(() => {
      const hero = document.querySelector('#hero-video') as HTMLVideoElement
      const proof = Array.from(document.querySelectorAll('video[data-video]:not(#hero-video)')) as HTMLVideoElement[]

      return {
        heroPaused: hero.paused,
        heroDisplay: getComputedStyle(hero).display,
        proofVisible: proof.every(video => getComputedStyle(video).display !== 'none'),
        pending: document.querySelectorAll('[data-reveal-pending]').length,
        hiddenReveal: Array.from(document.querySelectorAll('[data-reveal]')).some(
          node => getComputedStyle(node).opacity === '0'
        )
      }
    })

    assert(state.heroPaused, 'reduced motion: hero must remain paused')
    assert(
      state.heroDisplay !== 'none' && state.proofVisible,
      'reduced motion: videos must retain visible static frames'
    )
    assert(state.pending === 0 && !state.hiddenReveal, 'reduced motion: reveal content must be immediately visible')

    return state
  } finally {
    await context.close()
  }
}

const main = async () => {
  await mkdir(outputDirectory, { recursive: true })
  const results = []

  for (const [width, height] of [
    [1536, 911],
    [1414, 909],
    [1440, 1000],
    [890, 911],
    [390, 844]
  ] as const) {
    results.push(await verifyViewport(width, height))
  }

  const reducedMotion = await verifyReducedMotion()

  console.log(JSON.stringify({ ok: true, url: LIVE_URL, outputDirectory, results, reducedMotion }, null, 2))
}

main().catch(error => {
  console.error(
    `public-website:verify-influencer-landing-fidelity failed: ${error instanceof Error ? error.message : String(error)}`
  )
  process.exit(1)
})
