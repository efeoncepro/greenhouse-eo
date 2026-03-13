'use client'

import Link from 'next/link'

import classnames from 'classnames'

import useVerticalNav from '@menu/hooks/useVerticalNav'

import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'
import { GH_CLIENT_NAV, GH_MESSAGES } from '@/config/greenhouse-nomenclature'

const FooterContent = () => {
  const { isBreakpointReached } = useVerticalNav()

  return (
    <div className={classnames(verticalLayoutClasses.footerContent, 'flex items-center justify-between flex-wrap gap-4')}>
      <p>
        <span className='text-textSecondary'>{`© ${new Date().getFullYear()} Efeonce Group. `}</span>
        <span className='text-textSecondary'>{GH_MESSAGES.footer}</span>
        <Link href='/dashboard' className='text-primary mie-0 mis-2'>
          {GH_MESSAGES.footer_portal_link}
        </Link>
      </p>
      {!isBreakpointReached ? (
        <div className='flex items-center gap-4'>
          <Link href='/dashboard' className='text-primary'>
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
