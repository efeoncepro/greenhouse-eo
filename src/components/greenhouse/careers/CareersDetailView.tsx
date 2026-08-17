import Link from 'next/link'

import type { CareersCopy } from '@/lib/copy'
import { formatNumber } from '@/lib/format'
import { formatCareersTemplate, type CareersOpeningViewModel } from '@/lib/hiring/public-careers/view-model'

import styles from './careers.module.css'

interface CareersDetailViewProps {
  copy: CareersCopy
  opening: CareersOpeningViewModel
  editorialEnabled?: boolean
}

export const CareersDetailView = ({ copy, opening, editorialEnabled = false }: CareersDetailViewProps) =>
  editorialEnabled ? (
    <EditorialCareersDetailView copy={copy} opening={opening} />
  ) : (
    <LegacyCareersDetailView copy={copy} opening={opening} />
  )

const LegacyCareersDetailView = ({ copy, opening }: Omit<CareersDetailViewProps, 'editorialEnabled'>) => {
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
            <ListSection
              check
              icon='tabler-sparkles'
              items={opening.niceToHaveItems}
              title={copy.detail.niceToHaveTitle}
            />
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

const EditorialCareersDetailView = ({ copy, opening }: Omit<CareersDetailViewProps, 'editorialEnabled'>) => {
  const showLocation = opening.location !== opening.modality
  const { editorial } = opening

  const compensation = editorial.compensation
    ? `${editorial.compensation.currency} ${formatAmount(editorial.compensation.minValue)}–${formatAmount(editorial.compensation.maxValue)} · ${copy.detail.compensationUnits[editorial.compensation.unitText]}`
    : (editorial.compensationBand ?? copy.detail.compensationFallback)

  return (
    <div className={`${styles.fade} ${styles.editorialDetail}`}>
      <section className={`${styles.detailHero} ${styles.editorialHero}`} data-capture='careers-detail-hero'>
        <div className={`${styles.container} ${styles.editorialHeroInner}`}>
          <div className={styles.editorialHeroCopy}>
            <span className={`${styles.eyebrow} ${styles.eyebrowDark}`}>{opening.area}</span>
            <h1 className={styles.detailTitle}>{opening.title}</h1>
            <p className={styles.editorialLead}>{editorial.lead}</p>
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
              <span className={styles.detailChip}>
                <i className='tabler-briefcase' aria-hidden='true' />
                {opening.employment}
              </span>
            </div>
          </div>
          <div className={styles.heroActions}>
            <Link
              className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonLarge}`}
              href={opening.applyHref}
              aria-label={formatCareersTemplate(copy.aria.openingCardTemplate, { role: opening.title })}
              data-capture='careers-detail-hero-apply'
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

      <section
        className={`${styles.container} ${styles.detailBody} ${styles.editorialBody}`}
        data-capture='careers-detail-content'
      >
        <main className={styles.editorialContent}>
          <section className={styles.editorialSection}>
            <h2 className={styles.editorialKicker}>{copy.detail.descriptionTitle}</h2>
            {editorial.introParagraphs.map(paragraph => (
              <p className={styles.editorialIntro} key={paragraph}>
                {paragraph}
              </p>
            ))}
          </section>

          <section className={`${styles.editorialSection} ${styles.companyContext}`}>
            <h2 className={styles.editorialTitle}>{copy.detail.companyTitle}</h2>
            <p className={styles.editorialIntro}>{editorial.companyContext}</p>
          </section>

          {editorial.outcomes.length ? (
            <section className={styles.editorialSection} data-capture='careers-detail-outcomes'>
              <h2 className={styles.editorialTitle}>{copy.detail.outcomesTitle}</h2>
              <ol className={styles.outcomeList}>
                {editorial.outcomes.map((outcome, index) => (
                  <li className={styles.outcomeItem} key={outcome}>
                    <span aria-hidden='true'>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{outcome}</strong>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <EditorialListSection
            items={editorial.workItems}
            title={copy.detail.workTitle}
            capture='careers-detail-work'
          />

          {editorial.additionalSections.map(section => (
            <EditorialAdditionalSection key={section.title} section={section} />
          ))}

          <section className={styles.editorialSection} data-capture='careers-detail-essentials'>
            <h2 className={styles.editorialTitle}>{copy.detail.essentialsTitle}</h2>
            <div className={styles.editorialSkillGrid}>
              <div>
                <h3>{copy.detail.essentialsTitle}</h3>
                <ul>
                  {editorial.essentials.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              {editorial.preferred.length ? (
                <div>
                  <h3>{copy.detail.preferredTitle}</h3>
                  <ul>
                    {editorial.preferred.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {editorial.learnables.length ? (
                <div>
                  <h3>{copy.detail.learnablesTitle}</h3>
                  <ul>
                    {editorial.learnables.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            {editorial.evidenceAsk ? (
              <div className={styles.evidencePanel}>
                <i className='tabler-portfolio' aria-hidden='true' />
                <div>
                  <h3>{copy.detail.evidenceTitle}</h3>
                  <p>{editorial.evidenceAsk}</p>
                </div>
              </div>
            ) : null}
          </section>

          {editorial.workModel || editorial.collaboration || editorial.eligibleCountries.length ? (
            <section className={styles.remotePanel} data-capture='careers-detail-remote'>
              <div>
                <p className={styles.editorialKicker}>{opening.modality}</p>
                <h2 className={styles.editorialTitle}>{copy.detail.remoteTitle}</h2>
                {editorial.workModel ? <p>{editorial.workModel}</p> : null}
                {editorial.collaboration ? (
                  <dl className={styles.collaborationList}>
                    <CollaborationItem
                      label={copy.detail.collaborationLabels.team}
                      value={editorial.collaboration.team}
                    />
                    <CollaborationItem
                      label={copy.detail.collaborationLabels.reportsTo}
                      value={editorial.collaboration.reportsTo}
                    />
                    <CollaborationItem
                      label={copy.detail.collaborationLabels.language}
                      value={editorial.collaboration.language}
                    />
                    <CollaborationItem
                      label={copy.detail.collaborationLabels.timezoneOverlap}
                      value={editorial.collaboration.timezoneOverlap}
                    />
                    <CollaborationItem
                      label={copy.detail.collaborationLabels.workingRhythm}
                      value={editorial.collaboration.workingRhythm}
                    />
                  </dl>
                ) : null}
              </div>
              {editorial.eligibleCountries.length ? (
                <div>
                  <h3>{copy.detail.eligibleCountriesTitle}</h3>
                  <ul className={styles.countryList}>
                    {editorial.eligibleCountries.map(country => (
                      <li className={styles.countryChip} key={country}>
                        {country}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          {editorial.benefits.length ? (
            <section className={styles.benefitsBand} data-capture='careers-detail-benefits'>
              <h2 className={styles.editorialKicker}>{copy.detail.benefitsTitle}</h2>
              <ul className={styles.benefitsList}>
                {editorial.benefits.map(benefit => (
                  <li key={benefit}>
                    <i className='tabler-circle-check' aria-hidden='true' />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className={styles.editorialSection} data-capture='careers-detail-process'>
            <h2 className={styles.editorialTitle}>{copy.detail.processTitle}</h2>
            <ol className={styles.editorialTimeline}>
              {editorial.processSteps.map((step, index) => (
                <li key={`${step.title}-${index}`}>
                  <span aria-hidden='true'>{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    {step.body ? <p>{step.body}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
            {editorial.expectedTiming || editorial.responseCommitment || editorial.accommodationPath ? (
              <dl className={styles.processMeta}>
                {editorial.expectedTiming ? (
                  <CollaborationItem
                    label={copy.detail.processMetaLabels.expectedTiming}
                    value={editorial.expectedTiming}
                  />
                ) : null}
                {editorial.responseCommitment ? (
                  <CollaborationItem
                    label={copy.detail.processMetaLabels.responseCommitment}
                    value={editorial.responseCommitment}
                  />
                ) : null}
                {editorial.accommodationPath ? (
                  <CollaborationItem
                    label={copy.detail.processMetaLabels.accommodationPath}
                    value={editorial.accommodationPath}
                  />
                ) : null}
              </dl>
            ) : null}
          </section>

          <section className={styles.editorialCompensation}>
            <i className='tabler-wallet' aria-hidden='true' />
            <div>
              <h2>{copy.detail.compensationTitle}</h2>
              <p>{compensation}</p>
            </div>
          </section>
        </main>

        <aside className={styles.detailAside} aria-label={copy.detail.summaryTitle} data-capture='career-summary'>
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
            <Link
              className={`${styles.button} ${styles.buttonPrimary} ${styles.buttonFull}`}
              href={opening.applyHref}
              data-capture='careers-detail-summary-apply'
            >
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

const EditorialListSection = ({ items, title, capture }: { items: string[]; title: string; capture: string }) => (
  <section className={styles.editorialSection} data-capture={capture}>
    <h2 className={styles.editorialTitle}>{title}</h2>
    <ul className={styles.editorialWorkList}>
      {items.map(item => (
        <li key={item}>
          <i className='tabler-arrow-up-right' aria-hidden='true' />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </section>
)

const EditorialAdditionalSection = ({
  section
}: {
  section: CareersOpeningViewModel['editorial']['additionalSections'][number]
}) => (
  <section className={styles.editorialSection} data-format={section.format}>
    <h2 className={styles.editorialTitle}>{section.title}</h2>
    {section.intro ? <p className={styles.editorialIntro}>{section.intro}</p> : null}
    {section.items.length ? (
      section.format === 'milestones' ? (
        <ol className={styles.outcomeList}>
          {section.items.map((item, index) => (
            <li className={styles.outcomeItem} key={item}>
              <span aria-hidden='true'>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <ul className={styles.editorialWorkList}>
          {section.items.map(item => (
            <li key={item}>
              <i className='tabler-arrow-up-right' aria-hidden='true' />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    ) : null}
  </section>
)

const CollaborationItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
)

const formatAmount = (value: number): string => formatNumber(value, { maximumFractionDigits: 2 }, 'en-US')

const ListSection = ({
  check,
  icon,
  items,
  title
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
