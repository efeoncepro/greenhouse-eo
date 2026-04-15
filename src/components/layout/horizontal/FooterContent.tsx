'use client'

import Link from 'next/link'

import classnames from 'classnames'

import useHorizontalNav from '@menu/hooks/useHorizontalNav'

import BrandWordmark from '@/components/greenhouse/BrandWordmark'
import { horizontalLayoutClasses } from '@layouts/utils/layoutClasses'
import { GH_CLIENT_NAV, GH_MESSAGES } from '@/config/greenhouse-nomenclature'

const FooterContent = () => {
  const { isBreakpointReached } = useHorizontalNav()

  return (
    <div className={classnames(horizontalLayoutClasses.footerContent, 'flex items-center justify-between flex-wrap gap-4')}>
      <div className='flex items-center gap-3'>
        <BrandWordmark brand='efeonce' height={16} sx={{ opacity: 0.85 }} />
        <span className='text-textSecondary' style={{ fontSize: '0.8125rem' }}>
          {`© ${new Date().getFullYear()} · ${GH_MESSAGES.footer}`}
        </span>
      </div>
      {!isBreakpointReached ? (
        <div className='flex items-center gap-4'>
          <Link href='/home' className='text-primary'>
            {GH_CLIENT_NAV.dashboard.label}
          </Link>
          <Link href='/proyectos' className='text-primary'>
            {GH_CLIENT_NAV.projects.label}
          </Link>
          <Link href='/sprints' className='text-primary'>
            {GH_CLIENT_NAV.sprints.label}
          </Link>
          <Link href='/settings' className='text-primary'>
            {GH_CLIENT_NAV.settings.label}
          </Link>
          <Link href='/updates' className='text-primary'>
            {GH_CLIENT_NAV.updates.label}
          </Link>
        </div>
      ) : null}
    </div>
  )
}

export default FooterContent
