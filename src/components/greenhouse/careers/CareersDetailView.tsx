import Link from 'next/link'

import type { CareersCopy } from '@/lib/copy'
import { formatCareersTemplate, type CareersOpeningViewModel } from '@/lib/hiring/public-careers/view-model'

import styles from './careers.module.css'

interface CareersDetailViewProps {
  copy: CareersCopy
  opening: CareersOpeningViewModel
}

export const CareersDetailView = ({ copy, opening }: CareersDetailViewProps) => {
  const showLocation = opening.location !== opening.modality

  return (
    <div className={styles.fade}>
      <section className={styles.detailHero} data-capture='careers-detail-hero'>
        <div className={`${styles.container} ${styles.detailHeroInner}`}>
          <span className={`${styles.eyebrow} ${styles.eyebrowDark}`}>{opening.area}</span>
          <h1 className={styles.detailTitle}>{opening.title}</h1>
          <div className={styles.detailChips} aria-label={copy.detail.summaryTitle}>
            {showLocation ? (
              <span className={styles.detailChip}>
                <i className='tabler-map-pin' aria-hidden='true' />
                {opening.location}
              </span>
            ) : null}
            <span className={styles.detailChip}>
              <i className={opening.modalityIcon} aria-hidden='true' />
              {opening.modality}
            </span>
            <span className={styles.detailChip}>
              <i className='tabler-stairs-up' aria-hidden='true' />
              {opening.seniority}
            </span>
          </div>
        <p className={styles.applyIntro}>{opening.summary}</p>
        <div className={styles.heroActions}>
          <Link
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonLarge}`}
            href={opening.applyHref}
            aria-label={formatCareersTemplate(copy.aria.openingCardTemplate, { role: opening.title })}
          >
            {copy.detail.applyCta}
            <i className='tabler-arrow-right' aria-hidden='true' />
          </Link>
          <span className={styles.proofLine}>
            <i className='tabler-clock' aria-hidden='true' />
            {copy.detail.timeHint}
          </span>
        </div>
      </div>
    </section>

    <section className={`${styles.container} ${styles.detailBody}`} data-capture='careers-detail-content'>
      <div className={styles.detailContent}>
        <section className={styles.detailSection}>
          <h2 className={styles.detailSectionTitle}>{copy.detail.descriptionTitle}</h2>
          {opening.descriptionParagraphs.map(paragraph => (
            <p className={styles.prose} key={paragraph}>
              {paragraph}
            </p>
          ))}
        </section>

        <ListSection
          icon='tabler-arrow-right'
          items={opening.responsibilityItems}
          title={copy.detail.responsibilitiesTitle}
        />
        <ListSection
          check
          icon='tabler-circle-check'
          items={opening.requirementItems}
          title={copy.detail.requirementsTitle}
        />

        {opening.niceToHaveItems.length ? (
          <ListSection check icon='tabler-sparkles' items={opening.niceToHaveItems} title={copy.detail.niceToHaveTitle} />
        ) : null}

        <section className={styles.detailSection}>
          <h2 className={styles.detailSectionTitle}>{copy.detail.skillsTitle}</h2>
          <p className={styles.skillsHint}>{copy.detail.skillsHint}</p>
          <div className={styles.chipList}>
            {opening.skillChips.map(skill => (
              <span className={styles.skillChip} key={skill}>
                {skill}
              </span>
            ))}
          </div>
        </section>

        <section className={styles.timelineCard}>
          <h2 className={styles.detailSectionTitle}>{copy.detail.processTitle}</h2>
          <ol className={styles.timelineList}>
            {copy.process.steps.map((step, index) => (
              <li className={styles.timelineItem} key={step.title}>
                <span className={styles.timelineMarker} aria-hidden='true'>
                  {index + 1}
                </span>
                <span className={styles.timelineText}>
                  <strong>{step.title}</strong>
                  <span>{opening.processNotes[index] ?? step.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.compCard}>
          <span className={styles.compIcon}>
            <i className='tabler-wallet' aria-hidden='true' />
          </span>
          <span className={styles.timelineText}>
            <strong>{copy.detail.compensationTitle}</strong>
            <span>{copy.detail.compensationFallback}</span>
          </span>
        </section>
      </div>

      <aside className={styles.detailAside} aria-label={copy.detail.summaryTitle}>
        <div className={styles.summaryCard}>
          <h2 className={styles.summaryTitle}>{copy.detail.summaryTitle}</h2>
          <div className={styles.summaryRows}>
            <SummaryRow label={copy.detail.labels.area} value={opening.area} />
            {showLocation ? <SummaryRow label={copy.detail.labels.location} value={opening.location} /> : null}
            <SummaryRow label={copy.detail.labels.modality} value={opening.modality} />
            <SummaryRow label={copy.detail.labels.seniority} value={opening.seniority} />
            <SummaryRow label={copy.detail.labels.employment} value={opening.employment} />
          </div>
          <span className={styles.summaryDivider} aria-hidden='true' />
          <Link className={`${styles.button} ${styles.buttonPrimary} ${styles.buttonFull}`} href={opening.applyHref}>
            {copy.detail.applyCta}
            <i className='tabler-send' aria-hidden='true' />
          </Link>
          <span className={styles.disclosure}>
            <i className='tabler-lock' aria-hidden='true' />
            {copy.detail.timeHint}
          </span>
        </div>
      </aside>
    </section>
    </div>
  )
}

const ListSection = ({
  check,
  icon,
  items,
  title,
}: {
  check?: boolean
  icon: string
  items: string[]
  title: string
}) => (
  <section className={styles.detailSection}>
    <h2 className={styles.detailSectionTitle}>{title}</h2>
    <ul className={styles.list}>
      {items.map(item => (
        <li className={`${styles.listItem} ${check ? styles.listItemCheck : ''}`} key={item}>
          <i className={icon} aria-hidden='true' />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </section>
)

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className={styles.summaryRow}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
)
