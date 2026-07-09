import Link from 'next/link'

import type { CareersCopy } from '@/lib/copy'

import styles from './careers.module.css'

export const CareersUnavailableView = ({ copy }: { copy: CareersCopy }) => (
  <div className={styles.applyWrap} data-capture='careers-unavailable'>
    <div className={styles.stateCard}>
      <span className={styles.stateIcon}>
        <i className='tabler-briefcase-off' aria-hidden='true' />
      </span>
      <h1 className={styles.stateTitle}>{copy.detail.unavailableTitle}</h1>
      <p className={styles.stateBody}>{copy.detail.unavailableBody}</p>
      <Link className={`${styles.button} ${styles.buttonPrimary}`} href='/public/careers#gh-listing'>
        {copy.detail.unavailableCta}
        <i className='tabler-arrow-right' aria-hidden='true' />
      </Link>
    </div>
  </div>
)
