'use client'

// Next Imports
import Link from 'next/link'

// Third-party Imports
import classnames from 'classnames'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

const FooterContent = () => {
  const { isBreakpointReached } = useVerticalNav()

  return (
    <div
      className={classnames(verticalLayoutClasses.footerContent, 'flex items-center justify-between flex-wrap gap-4')}
    >
      <p>
        <span className='text-textSecondary'>{`© ${new Date().getFullYear()} Efeonce Group. `}</span>
        <span className='text-textSecondary'>{`Greenhouse keeps project delivery visible, measurable, and accountable.`}</span>
        <Link href='/dashboard' className='text-primary uppercase mie-0 mis-2'>
          Portal
        </Link>
      </p>
      {!isBreakpointReached && (
        <div className='flex items-center gap-4'>
          <Link href='/dashboard' className='text-primary'>
            Dashboard
          </Link>
          <Link href='/proyectos' className='text-primary'>
            Proyectos
          </Link>
          <Link href='/sprints' className='text-primary'>
            Sprints
          </Link>
          <Link href='/settings' className='text-primary'>
            Settings
          </Link>
        </div>
      )}
    </div>
  )
}

export default FooterContent
