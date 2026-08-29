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
    const privacyLink = growthForm?.querySelector('a[href*="politica-de-privacidad"]') as HTMLAnchorElement | null
    const meetingCta = document.querySelector('greenhouse-cta') as HTMLElement | null

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
        formWidth: growthForm?.getBoundingClientRect().width ?? 0,
        consentBackground: premiumConsent ? getComputedStyle(premiumConsent).backgroundColor : null,
        labelIcon: premiumLabel ? getComputedStyle(premiumLabel, '::before').backgroundImage : 'none',
        selectAppearance: premiumSelect ? getComputedStyle(premiumSelect).appearance : null,
        selectIndicator: premiumSelectField ? getComputedStyle(premiumSelectField, '::after').content : 'none',
        privacyText: privacyLink?.textContent?.trim() ?? null
      },
      meetingCta: {
        defined: Boolean(customElements.get('greenhouse-cta')),
        state: meetingCta?.dataset.ghcState ?? null,
        slug: meetingCta?.getAttribute('cta') ?? null,
        surface: meetingCta?.getAttribute('surface') ?? null,
        action: meetingCta?.querySelector('.ghc-primary')?.textContent?.trim() ?? null
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
      contract.premiumForm.consentBackground === 'rgb(245, 247, 248)' &&
      contract.premiumForm.labelIcon !== 'none' &&
      contract.premiumForm.selectAppearance === 'none' &&
      contract.premiumForm.selectIndicator !== 'none' &&
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

  if (width > 760) {
    assert(contract.conversion.introPosition === 'sticky', `${width}px: conversion intro is not sticky`)
    assert(
      contract.conversion.introLeft !== null &&
        contract.conversion.stackLeft !== null &&
        contract.conversion.introLeft < contract.conversion.stackLeft,
      `${width}px: conversion columns collapsed unexpectedly`
    )
  } else {
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
  await page.waitForTimeout(350)
  assert(
    (await page.locator('#sticky-cta').getAttribute('data-visible')) === 'true',
    `${width}px: sticky CTA did not appear`
  )

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
    await page.locator('#ofertas').scrollIntoViewIfNeeded()
    await page.waitForTimeout(450)
    await page.locator('#ofertas').screenshot({ path: resolve(outputDirectory, `offers-${width}.png`) })
    await page.locator('#preguntas').scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await page.locator('#preguntas').screenshot({ path: resolve(outputDirectory, `faq-${width}.png`) })

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
