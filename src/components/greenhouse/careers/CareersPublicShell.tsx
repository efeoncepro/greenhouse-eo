import type { ReactNode } from 'react'

import Link from 'next/link'

import { EFEONCE_LEGAL_NAME_FALLBACK, EFEONCE_SLOGAN_TEXT, EFEONCE_URL_HTTPS } from '@/config/efeonce-brand'
import type { CareersCopy, Locale } from '@/lib/copy'

import styles from './careers.module.css'

interface CareersPublicShellProps {
  copy: CareersCopy
  locale: Locale
  children: ReactNode
  backHref?: string
  backLabel?: string
}

export const CareersPublicShell = ({ backHref, backLabel, children, copy, locale }: CareersPublicShellProps) => {
  const year = new Date().getFullYear()

  return (
    <div className={styles.root}>
      <div className={styles.shell}>
        <a className={styles.skip} href='#gh-main'>
          {copy.aria.skipToContent}
        </a>

        <header className={styles.header}>
          <Link href='/public/careers' className={styles.brand} aria-label={copy.header.logoAlt}>
            <img className={styles.logo} src='/branding/logo-full.svg' alt={copy.header.logoAlt} />
            <span className={styles.divider} aria-hidden='true' />
            <span className={styles.tagline}>{copy.header.tagline}</span>
          </Link>

          <div className={styles.headerActions}>
            {backHref ? (
              <Link className={styles.headerBack} href={backHref}>
                <i className='tabler-arrow-left' aria-hidden='true' />
                <span>{backLabel ?? copy.header.backToJobs}</span>
              </Link>
            ) : null}
            <span className={styles.localePill} title={copy.header.localeTitle}>
              <i className='tabler-world' aria-hidden='true' />
              {locale}
            </span>
          </div>
        </header>

        <main id='gh-main' className={styles.main}>
          {children}
        </main>

        <footer className={styles.footer}>
          <div className={`${styles.container} ${styles.footerInner}`}>
            <div className={styles.footerBrand}>
              <img className={styles.footerLogo} src='/branding/logo-negative.svg' alt={copy.header.logoAlt} />
              <span className={styles.footerMeta}>
                © {year} {EFEONCE_LEGAL_NAME_FALLBACK} · {EFEONCE_SLOGAN_TEXT}
              </span>
            </div>
            <nav className={styles.footerLinks} aria-label={copy.header.logoAlt}>
              <Link href={`${EFEONCE_URL_HTTPS}/privacy`}>{copy.footer.privacy}</Link>
              <Link href={`${EFEONCE_URL_HTTPS}/terms`}>{copy.footer.terms}</Link>
              <Link href={EFEONCE_URL_HTTPS}>{copy.footer.website}</Link>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  )
}
