'use client'

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'

import Link from 'next/link'

import type { CareersCopy } from '@/lib/copy'
import {
  filterCareersOpenings,
  formatCareersTemplate,
  type CareersModalityKind,
  type CareersOpeningViewModel,
} from '@/lib/hiring/public-careers/view-model'

import styles from './careers.module.css'

type ListingState = 'loaded' | 'error'

interface CareersHomeClientProps {
  copy: CareersCopy
  openings: CareersOpeningViewModel[]
  listingState: ListingState
}

const PILLAR_COLORS = ['var(--brand-navy)', 'var(--primary)', 'var(--secondary)'] as const

const modalityClassName = (kind: CareersModalityKind): string => {
  if (kind === 'remote') return styles.modalityRemote
  if (kind === 'hybrid') return styles.modalityHybrid
  if (kind === 'onsite') return styles.modalityOnsite

  return styles.modalityFlexible
}

const readInitialFilters = () => {
  if (typeof window === 'undefined') return { query: '', area: '', modality: '' }

  const params = new URLSearchParams(window.location.search)

  return {
    query: params.get('q') ?? '',
    area: params.get('area') ?? '',
    modality: params.get('modality') ?? '',
  }
}

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)))

const updateUrlFilters = (query: string, area: string, modality: string) => {
  if (typeof window === 'undefined') return

  const params = new URLSearchParams(window.location.search)

  if (query.trim()) params.set('q', query.trim())
  else params.delete('q')

  if (area) params.set('area', area)
  else params.delete('area')

  if (modality) params.set('modality', modality)
  else params.delete('modality')

  const next = params.toString()
  const url = next ? `${window.location.pathname}?${next}` : window.location.pathname

  window.history.replaceState(null, '', url)
}

export const CareersHomeClient = ({ copy, listingState, openings }: CareersHomeClientProps) => {
  const [filters, setFilters] = useState(readInitialFilters)
  const [poolName, setPoolName] = useState('')
  const [poolEmail, setPoolEmail] = useState('')
  const [poolDoneName, setPoolDoneName] = useState('')

  useEffect(() => {
    const id = window.setTimeout(() => {
      updateUrlFilters(filters.query, filters.area, filters.modality)
    }, 240)

    return () => window.clearTimeout(id)
  }, [filters])

  const areas = useMemo(() => unique(openings.map(opening => opening.area)), [openings])
  const modalities = useMemo(() => unique(openings.map(opening => opening.modality)), [openings])
  const filteredOpenings = useMemo(() => filterCareersOpenings(openings, filters), [filters, openings])
  const hasFilters = Boolean(filters.query || filters.area || filters.modality)
  const showError = listingState === 'error'
  const showEmptyZero = !showError && openings.length === 0
  const showEmptyFiltered = !showError && openings.length > 0 && filteredOpenings.length === 0
  const showResults = !showError && filteredOpenings.length > 0
  const openCount = openings.length
  const hiringBadgeSuffix = openCount === 1 ? copy.hero.hiringBadgeSuffixSingular : copy.hero.hiringBadgeSuffixPlural
  const marqueeItems = [...copy.marquee, ...copy.marquee]
  const poolDone = Boolean(poolDoneName)

  const toggleFilter = (key: 'area' | 'modality', value: string) => {
    setFilters(current => ({ ...current, [key]: current[key] === value ? '' : value }))
  }

  const clearFilters = () => setFilters({ query: '', area: '', modality: '' })

  const submitPool = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!poolName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(poolEmail.trim())) return

    setPoolDoneName(poolName.trim().split(/\s+/)[0] ?? '')
  }

  const scrollTo = (id: string) => {
    const node = document.getElementById(id)

    if (!node) return

    node.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  return (
    <div className={styles.fade}>
      <section className={styles.hero} data-capture='careers-home-hero'>
        <img className={styles.heroIso} src='/branding/SVG/isotipo-full-efeonce.svg' alt='' aria-hidden='true' />
        <div className={`${styles.container} ${styles.heroInner}`}>
          <span className={styles.badge}>
            <span className={styles.pulse} aria-hidden='true' />
            <span>
              {copy.hero.hiringBadgePrefix} · {openCount} {hiringBadgeSuffix}
            </span>
          </span>
          <h1 className={styles.heroTitle}>
            <span className={styles.heroTitleAccent}>{copy.hero.titleAccent}</span>
            <br />
            {copy.hero.titleRest}
            <i className={`${styles.heroArrow} tabler-arrow-up-right`} aria-hidden='true' />
          </h1>
          <p className={styles.heroSubtitle}>{copy.hero.subtitle}</p>
          <div className={styles.heroActions}>
            <button className={`${styles.button} ${styles.buttonPrimary} ${styles.buttonLarge}`} type='button' onClick={() => scrollTo('gh-listing')}>
              {copy.hero.primaryCta}
              <i className='tabler-arrow-down' aria-hidden='true' />
            </button>
            <button className={styles.heroLink} type='button' onClick={() => scrollTo('gh-process')}>
              {copy.hero.processCta}
              <i className='tabler-arrow-right' aria-hidden='true' />
            </button>
          </div>
          <div className={styles.proofLine}>
            <i className='tabler-bolt' aria-hidden='true' />
            <span>{copy.hero.proof}</span>
          </div>
        </div>
        <div className={styles.marqueeWrap} aria-hidden='true'>
          <div className={styles.marqueeTrack}>
            {marqueeItems.map((item, index) => (
              <span className={styles.marqueeItem} key={`${item}-${index}`}>
                <span>{item}</span>
                <i className='tabler-diamond-filled' />
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.manifesto} aria-label={copy.manifesto.eyebrow} data-capture='careers-home-manifesto'>
        <div className={`${styles.narrowContainer} ${styles.manifestoInner}`}>
          <span className={`${styles.eyebrow} ${styles.eyebrowDark}`}>{copy.manifesto.eyebrow}</span>
          <h2 className={styles.manifestoTitle}>
            {copy.manifesto.titlePrefix} <span className={styles.manifestoMark}>{copy.manifesto.titleMark}</span>
            {copy.manifesto.titleSuffix}
          </h2>
          <div className={styles.manifestoChips}>
            {copy.manifesto.chips.map((chip, index) => (
              <span className={styles.manifestoChip} key={chip}>
                <i className={index === 0 ? 'tabler-target-arrow' : index === 1 ? 'tabler-chart-histogram' : 'tabler-movie'} aria-hidden='true' />
                {chip}
              </span>
            ))}
          </div>
          <p className={styles.manifestoProof}>
            <span className={styles.manifestoProofMuted}>{copy.manifesto.proofMuted}</span>
            <br />
            <span className={styles.manifestoProofStrong}>{copy.manifesto.proofStrong}</span>
          </p>
          <p className={styles.manifestoBody}>
            {copy.manifesto.bodyPrefix} <strong>{copy.manifesto.bodyStrong}</strong> {copy.manifesto.bodySuffix}
          </p>
          <div>
            <button className={`${styles.button} ${styles.buttonPrimary} ${styles.buttonLarge}`} type='button' onClick={() => scrollTo('gh-listing')}>
              {copy.manifesto.cta}
              <i className='tabler-arrow-down' aria-hidden='true' />
            </button>
          </div>
        </div>
      </section>

      <section className={styles.section} data-capture='careers-home-pillars'>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.eyebrow}>{copy.pillars.eyebrow}</span>
            <h2 className={styles.sectionTitle}>{copy.pillars.title}</h2>
            <p className={styles.sectionSubtitle}>{copy.pillars.subtitle}</p>
          </div>
          <div className={styles.pillarGrid}>
            {copy.pillars.items.map((pillar, index) => (
              <article
                className={`${styles.pillarCard} ${styles.reveal}`}
                key={pillar.title}
                style={{ '--pillar-color': PILLAR_COLORS[index] ?? PILLAR_COLORS[0] } as CSSProperties}
              >
                <div className={styles.pillarTop}>
                  <span className={styles.pillarIcon}>
                    <i className={pillar.icon} aria-hidden='true' />
                  </span>
                  <span className={styles.pillarNumber} aria-hidden='true'>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className={styles.pillarTitle}>{pillar.title}</h3>
                <p className={styles.pillarBody}>{pillar.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id='gh-listing' className={styles.listing} aria-label={copy.aria.listingRegion} data-capture='careers-home-listing'>
        <div className={styles.container}>
          <div className={styles.listingHeader}>
            <div className={styles.listingCopy}>
              <span className={styles.eyebrow}>{copy.listing.eyebrow}</span>
              <div className={styles.listingTitleRow}>
                <h2 className={styles.sectionTitle}>{copy.listing.title}</h2>
                {!showError ? (
                  <span className={styles.countBadge}>
                    {filteredOpenings.length} {copy.listing.resultCountLabel}
                  </span>
                ) : null}
              </div>
              <p className={styles.sectionSubtitle}>{copy.listing.subtitle}</p>
            </div>

            {!showEmptyZero && !showError ? (
              <div className={styles.searchWrap}>
                <label className={styles.fieldShell}>
                  <span className={styles.visuallyHidden}>{copy.listing.searchPlaceholder}</span>
                  <i className={`${styles.fieldIcon} tabler-search`} aria-hidden='true' />
                  <input
                    className={`${styles.input} ${styles.inputWithIcon}`}
                    value={filters.query}
                    onChange={event => setFilters(current => ({ ...current, query: event.target.value }))}
                    placeholder={copy.listing.searchPlaceholder}
                    type='search'
                  />
                </label>
              </div>
            ) : null}
          </div>

          {!showEmptyZero && !showError ? (
            <div className={styles.filterBar}>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>{copy.listing.areaLabel}</span>
                {[copy.listing.all, ...areas].map((area, index) => {
                  const value = index === 0 ? '' : area
                  const active = filters.area === value

                  return (
                    <button
                      className={`${styles.filterPill} ${active ? styles.filterPillActive : ''}`}
                      key={`area-${value || 'all'}`}
                      type='button'
                      onClick={() => toggleFilter('area', value)}
                    >
                      {area}
                    </button>
                  )
                })}
              </div>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>{copy.listing.modalityLabel}</span>
                {[copy.listing.all, ...modalities].map((modality, index) => {
                  const value = index === 0 ? '' : modality
                  const active = filters.modality === value

                  return (
                    <button
                      className={`${styles.filterPill} ${active ? styles.filterPillActive : ''}`}
                      key={`modality-${value || 'all'}`}
                      type='button'
                      onClick={() => toggleFilter('modality', value)}
                    >
                      {modality}
                    </button>
                  )
                })}
              </div>
              {hasFilters ? (
                <button className={`${styles.textButton} ${styles.clearButton}`} type='button' onClick={clearFilters}>
                  <i className='tabler-x' aria-hidden='true' />
                  {copy.listing.clearFilters}
                </button>
              ) : null}
            </div>
          ) : null}

          {showError ? (
            <div className={styles.stateCard}>
              <span className={styles.stateIcon}>
                <i className='tabler-alert-triangle' aria-hidden='true' />
              </span>
              <h3 className={styles.stateTitle}>{copy.listing.errorTitle}</h3>
              <p className={styles.stateBody}>{copy.listing.errorBody}</p>
              <button className={`${styles.button} ${styles.buttonOutlined}`} type='button' onClick={() => window.location.reload()}>
                <i className='tabler-refresh' aria-hidden='true' />
                {copy.listing.retry}
              </button>
            </div>
          ) : null}

          {showEmptyZero ? (
            <TalentPoolEmptyState
              copy={copy}
              poolDone={poolDone}
              poolDoneName={poolDoneName}
              poolEmail={poolEmail}
              poolName={poolName}
              setPoolEmail={setPoolEmail}
              setPoolName={setPoolName}
              submitPool={submitPool}
            />
          ) : null}

          {showEmptyFiltered ? (
            <div className={styles.stateCard}>
              <span className={styles.stateIcon}>
                <i className='tabler-search-off' aria-hidden='true' />
              </span>
              <h3 className={styles.stateTitle}>{copy.listing.emptyFilteredTitle}</h3>
              <p className={styles.stateBody}>{copy.listing.emptyFilteredBody}</p>
              <button className={`${styles.button} ${styles.buttonOutlined}`} type='button' onClick={clearFilters}>
                <i className='tabler-x' aria-hidden='true' />
                {copy.listing.clearFilters}
              </button>
            </div>
          ) : null}

          {showResults ? (
            <div className={styles.vacancyGrid}>
              {filteredOpenings.map(opening => (
                <OpeningCard copy={copy} key={opening.publicId} opening={opening} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <ProcessSection copy={copy} />

      <section className={styles.section} data-capture='careers-home-talent-pool'>
        <div className={styles.container}>
          <div className={styles.talentBand}>
            <div className={styles.talentCopy}>
              <span className={`${styles.eyebrow} ${styles.eyebrowDark}`}>{copy.talentPool.eyebrow}</span>
              <h2 className={styles.darkTitle}>{copy.talentPool.title}</h2>
              <p className={styles.darkBody}>{copy.talentPool.body}</p>
            </div>
            <div className={styles.talentForm}>
              {poolDone ? (
                <PoolSuccess copy={copy} name={poolDoneName} />
              ) : (
                <PoolForm
                  copy={copy}
                  poolEmail={poolEmail}
                  poolName={poolName}
                  setPoolEmail={setPoolEmail}
                  setPoolName={setPoolName}
                  submitPool={submitPool}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

const OpeningCard = ({ copy, opening }: { copy: CareersCopy; opening: CareersOpeningViewModel }) => (
  <Link
    className={`${styles.vacancyCard} ${styles.reveal}`}
    href={opening.detailHref}
    aria-label={formatCareersTemplate(copy.aria.openingCardTemplate, { role: opening.title })}
  >
    <div className={styles.cardTop}>
      <span className={styles.areaText}>{opening.area}</span>
      <span className={`${styles.modalityChip} ${modalityClassName(opening.modalityKind)}`}>
        <i className={opening.modalityIcon} aria-hidden='true' />
        {opening.modality}
      </span>
    </div>
    <h3 className={styles.cardTitle}>{opening.title}</h3>
    <div className={styles.cardMeta}>
      <span className={styles.metaItem}>
        <i className='tabler-map-pin' aria-hidden='true' />
        {opening.location}
      </span>
      <span className={styles.metaItem}>
        <i className='tabler-stairs-up' aria-hidden='true' />
        {opening.seniority}
      </span>
      <span className={styles.metaItem}>
        <i className='tabler-clock' aria-hidden='true' />
        {opening.employment}
      </span>
    </div>
    <p className={styles.cardBody}>{opening.summary}</p>
    <div className={styles.chipList}>
      {opening.skillChips.map(skill => (
        <span className={styles.skillChip} key={skill}>
          {skill}
        </span>
      ))}
    </div>
    <div className={styles.cardFooter}>
      <span className={styles.cardCta}>{copy.listing.cardCta}</span>
      <span className={styles.arrowCircle} aria-hidden='true'>
        <i className='tabler-arrow-right' />
      </span>
    </div>
  </Link>
)

export const ProcessSection = ({ copy }: { copy: CareersCopy }) => (
  <section id='gh-process' className={styles.processSection} data-capture='careers-process'>
    <div className={`${styles.container} ${styles.processInner}`}>
      <span className={`${styles.eyebrow} ${styles.eyebrowDark}`}>{copy.process.eyebrow}</span>
      <h2 className={styles.darkTitle}>{copy.process.title}</h2>
      <p className={styles.darkBody}>{copy.process.subtitle}</p>
      <ol className={styles.processGrid}>
        {copy.process.steps.map((step, index) => (
          <li className={`${styles.processCard} ${styles.reveal}`} key={step.title}>
            <div className={styles.processCardTop}>
              <span className={styles.processNumber} aria-hidden='true'>
                {String(index + 1).padStart(2, '0')}
              </span>
              <i className={`${styles.processIcon} ${step.icon}`} aria-hidden='true' />
            </div>
            <h3 className={styles.processTitle}>{step.title}</h3>
            <p className={styles.processBody}>{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
)

const PoolForm = ({
  copy,
  poolEmail,
  poolName,
  setPoolEmail,
  setPoolName,
  submitPool,
}: {
  copy: CareersCopy
  poolEmail: string
  poolName: string
  setPoolEmail: (value: string) => void
  setPoolName: (value: string) => void
  submitPool: (event: FormEvent<HTMLFormElement>) => void
}) => (
  <form className={styles.poolForm} onSubmit={submitPool} aria-label={copy.aria.talentPool}>
    <div className={styles.poolFields}>
      <label className={`${styles.fieldShell} ${styles.poolField}`}>
        <span className={styles.visuallyHidden}>{copy.talentPool.namePlaceholder}</span>
        <i className={`${styles.fieldIcon} tabler-user`} aria-hidden='true' />
        <input
          className={`${styles.input} ${styles.inputWithIcon}`}
          value={poolName}
          onChange={event => setPoolName(event.target.value)}
          placeholder={copy.talentPool.namePlaceholder}
          type='text'
        />
      </label>
      <label className={`${styles.fieldShell} ${styles.poolField}`}>
        <span className={styles.visuallyHidden}>{copy.talentPool.emailPlaceholder}</span>
        <i className={`${styles.fieldIcon} tabler-mail`} aria-hidden='true' />
        <input
          className={`${styles.input} ${styles.inputWithIcon}`}
          value={poolEmail}
          onChange={event => setPoolEmail(event.target.value)}
          placeholder={copy.talentPool.emailPlaceholder}
          type='email'
        />
      </label>
    </div>
    <button className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonFull}`} type='submit'>
      {copy.talentPool.cta}
      <i className='tabler-arrow-right' aria-hidden='true' />
    </button>
    <span className={styles.poolPrivacy}>
      <i className='tabler-lock' aria-hidden='true' />
      {copy.talentPool.privacy}
    </span>
  </form>
)

const PoolSuccess = ({ copy, name }: { copy: CareersCopy; name: string }) => (
  <div className={styles.poolSuccess} role='status'>
    <i className='tabler-circle-check' aria-hidden='true' />
    <span>
      <strong>
        {copy.talentPool.successPrefix}
        {name ? `, ${name}` : ''}!
      </strong>{' '}
      {copy.talentPool.successSuffix}
    </span>
  </div>
)

const TalentPoolEmptyState = ({
  copy,
  poolDone,
  poolDoneName,
  poolEmail,
  poolName,
  setPoolEmail,
  setPoolName,
  submitPool,
}: {
  copy: CareersCopy
  poolDone: boolean
  poolDoneName: string
  poolEmail: string
  poolName: string
  setPoolEmail: (value: string) => void
  setPoolName: (value: string) => void
  submitPool: (event: FormEvent<HTMLFormElement>) => void
}) => (
  <div className={styles.stateCard}>
    <span className={styles.stateIcon}>
      <i className='tabler-briefcase-off' aria-hidden='true' />
    </span>
    <h3 className={styles.stateTitle}>{copy.listing.emptyZeroTitle}</h3>
    <p className={styles.stateBody}>{copy.listing.emptyZeroBody}</p>
    {poolDone ? (
      <PoolSuccess copy={copy} name={poolDoneName} />
    ) : (
      <PoolForm
        copy={copy}
        poolEmail={poolEmail}
        poolName={poolName}
        setPoolEmail={setPoolEmail}
        setPoolName={setPoolName}
        submitPool={submitPool}
      />
    )}
  </div>
)
