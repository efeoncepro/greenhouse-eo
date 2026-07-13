'use client'

import { createElement, useEffect, useMemo, useRef, useState } from 'react'

import type { CareersCopy, Locale } from '@/lib/copy'
import {
  CAREERS_APPLICATION_FORM_KEY,
  CAREERS_APPLICATION_FORM_SLUG,
  CAREERS_APPLICATION_SURFACE_ID,
} from '@/lib/hiring/public-careers/growth-form-contract'
import { formatCareersTemplate, type CareersOpeningViewModel } from '@/lib/hiring/public-careers/view-model'

import styles from './careers.module.css'

interface CareersNativeGrowthFormClientProps {
  baseUrl: string
  copy: CareersCopy
  locale: Locale
  opening: CareersOpeningViewModel
}

export const CareersNativeGrowthFormClient = ({
  baseUrl,
  copy,
  locale,
  opening,
}: CareersNativeGrowthFormClientProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const formRef = useRef<HTMLElement | null>(null)
  const [ready, setReady] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const title = formatCareersTemplate(copy.apply.titleTemplate, { role: opening.title })
  const initialValues = useMemo(() => JSON.stringify({ openingPublicId: opening.publicId }), [opening.publicId])

  useEffect(() => {
    void import('@/growth-forms-renderer')
  }, [])

  useEffect(() => {
    const form = formRef.current

    if (!form) return

    const handleViewed = () => setReady(true)
    const handleAccepted = () => setSubmitted(true)

    form.addEventListener('gh_form_viewed', handleViewed)
    form.addEventListener('gh_form_submission_accepted', handleAccepted)

    return () => {
      form.removeEventListener('gh_form_viewed', handleViewed)
      form.removeEventListener('gh_form_submission_accepted', handleAccepted)
    }
  }, [])

  useEffect(() => {
    const host = hostRef.current

    if (!host) return

    const markCvField = () => {
      host.querySelector('[data-ghf-field-key="cvFile"]')?.setAttribute('data-capture', 'careers-cv-uploader')
    }

    markCvField()

    const observer = new MutationObserver(markCvField)

    observer.observe(host, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  return (
    <div
      className={styles.applyWrap}
      data-capture={submitted ? 'careers-apply-success' : ready ? 'careers-apply-form' : 'careers-apply-loading'}
      data-form-key={CAREERS_APPLICATION_FORM_KEY}
      data-form-kind='application'
      data-form-slug={CAREERS_APPLICATION_FORM_SLUG}
    >
      <section className={styles.applyHero}>
        <div className={styles.applyHeroInner}>
          <span className={`${styles.eyebrow} ${styles.eyebrowDark}`}>{copy.apply.eyebrow}</span>
          <h1 className={styles.applyTitle}>{title}</h1>
          <p className={styles.applyIntro}>{copy.apply.intro}</p>
        </div>
      </section>

      <div
        className={`${styles.formCard} ${styles.growthFormCard}`}
        data-capture='careers-growth-form-host'
        ref={hostRef}
      >
        {createElement(
          'greenhouse-form',
          {
            ref: formRef,
            'form-key': CAREERS_APPLICATION_FORM_KEY,
            surface: CAREERS_APPLICATION_SURFACE_ID,
            locale,
            'color-scheme': 'light',
            appearance: 'bare',
            'base-url': baseUrl,
            'initial-values': initialValues,
          },
          <div className={styles.nativeFallback} role='status'>
            <strong>{copy.apply.invalidSummaryTitle}</strong>
            <span>{copy.apply.invalidSummaryBody}</span>
          </div>,
        )}
      </div>

      <p className={styles.disclosure}>
        <i className='tabler-shield-check' aria-hidden='true' />
        {copy.apply.disclosure}
      </p>
    </div>
  )
}
