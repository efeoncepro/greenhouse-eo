'use client'

import { useRef, useState } from 'react'
import type { MouseEvent } from 'react'

import { useRouter } from 'next/navigation'

import { signOut, useSession } from 'next-auth/react'
import { useLocale } from 'next-intl'

import { styled } from '@mui/material/styles'
import Avatar from '@mui/material/Avatar'
import Badge from '@mui/material/Badge'
import Button from '@mui/material/Button'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Divider from '@mui/material/Divider'
import Fade from '@mui/material/Fade'
import MenuItem from '@mui/material/MenuItem'
import MenuList from '@mui/material/MenuList'
import Paper from '@mui/material/Paper'
import Popper from '@mui/material/Popper'
import Typography from '@mui/material/Typography'

import { useSettings } from '@core/hooks/useSettings'
import { getGreenhouseNavigationCopy } from '@/config/greenhouse-navigation-copy'
import { GH_MESSAGES } from '@/lib/copy/client-portal'
import { buildMyNavItems } from '@/lib/navigation/my-nav-items'
import { getInitials } from '@/utils/getInitials'

const BadgeContentSpan = styled('span')({
  width: 8,
  height: 8,
  borderRadius: '50%',
  cursor: 'pointer',
  backgroundColor: 'var(--mui-palette-success-main)',
  boxShadow: '0 0 0 2px var(--mui-palette-background-paper)'
})

type Props = {
  /**
   * TASK-1388 — avatar resuelto server-side con `resolveAvatarUrl` (server-only)
   * en `(dashboard)/layout.tsx` y pasado como prop: el cliente nunca compone la
   * URL del proxy de media. Sin valor → fallback a iniciales.
   */
  avatarUrl?: string | null
}

const UserDropdown = ({ avatarUrl = null }: Props) => {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { settings } = useSettings()
  const { data: session } = useSession()
  const locale = useLocale()
  const dashboardHref = session?.user?.portalHomePath || '/home'
  const routeGroups = session?.user?.routeGroups ?? []

  // Mismo predicado que `VerticalMenu` — el dropdown y el rail reparten las
  // superficies de la MISMA población (TASK-1388).
  const isInternalPortalUser = ['internal', 'admin', 'commercial', 'finance', 'hr', 'people', 'ai_tooling'].some(
    group => routeGroups.includes(group)
  )

  const isMyUser = routeGroups.includes('my')
  const authorizedViews = session?.user?.authorizedViews ?? []
  const { client: GH_CLIENT_NAV, my: GH_MY_NAV } = getGreenhouseNavigationCopy(locale)

  const myNavItems = isMyUser
    ? buildMyNavItems(
        {
          authorizedViews,
          hasActiveContractorEngagement: session?.user?.hasActiveContractorEngagement ?? false,
          hasWorkforceContractingDocument: session?.user?.hasWorkforceContractingDocument ?? false
        },
        { includeHome: true }
      )
    : []

  const profileHref = myNavItems.find(item => item.href === '/my/profile')?.href ?? null
  const userName = session?.user?.name || ''

  // Solo letras/números para las iniciales: un nombre como "Agente (E2E)"
  // no debe rendir "A(" en el avatar.
  const userInitials = userName
    ? getInitials(userName.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim()).slice(0, 2).toUpperCase() || null
    : null

  const handleDropdownOpen = () => {
    setOpen(previous => !previous)
  }

  const handleDropdownClose = (event?: MouseEvent<HTMLLIElement> | (MouseEvent | TouchEvent), url?: string) => {
    if (url) {
      router.push(url)
    }

    if (anchorRef.current && anchorRef.current.contains(event?.target as HTMLElement)) {
      return
    }

    setOpen(false)
  }

  const handleUserLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  const profileHeader = (
    <div className='flex items-center plb-2 pli-6 gap-2'>
      <Avatar alt={userName || 'Greenhouse'} src={avatarUrl ?? undefined}>
        {userInitials}
      </Avatar>
      <div className='flex items-start flex-col'>
        <Typography className='font-medium' color='text.primary'>
          {session?.user?.name || 'Greenhouse Demo'}
        </Typography>
        <Typography variant='caption'>{session?.user?.email || 'client.portal@efeonce.com'}</Typography>
      </div>
    </div>
  )

  return (
    <>
      <Badge
        ref={anchorRef}
        overlap='circular'
        badgeContent={<BadgeContentSpan onClick={handleDropdownOpen} />}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        className='mis-2'
      >
        <Avatar
          ref={anchorRef}
          alt={userName || 'Greenhouse'}
          src={avatarUrl ?? undefined}
          onClick={handleDropdownOpen}
          className='cursor-pointer bs-[38px] is-[38px]'
          data-capture='avatar-trigger'
        >
          {userInitials}
        </Avatar>
      </Badge>
      <Popper
        open={open}
        transition
        disablePortal
        placement='bottom-end'
        anchorEl={anchorRef.current}
        className='min-is-[240px] !mbs-3 z-[1]'
      >
        {({ TransitionProps, placement }) => (
          <Fade
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom-end' ? 'right top' : 'left top'
            }}
          >
            <Paper className={settings.skin === 'bordered' ? 'border shadow-none' : 'shadow-lg'}>
              <ClickAwayListener onClickAway={e => handleDropdownClose(e as MouseEvent | TouchEvent)}>
                <MenuList
                  className='max-bs-[70vh] overflow-y-auto'
                  data-capture='avatar-dropdown'
                  onKeyDown={event => {
                    // Flow contract TASK-1388: Esc cierra el dropdown.
                    if (event.key === 'Escape') setOpen(false)
                  }}
                >
                  {/* TASK-1388 — header de perfil clickeable: es la puerta a Mi Perfil. */}
                  {profileHref ? (
                    <MenuItem className='p-0' onClick={e => handleDropdownClose(e, profileHref)}>
                      {profileHeader}
                    </MenuItem>
                  ) : (
                    <div tabIndex={-1}>{profileHeader}</div>
                  )}
                  <Divider className='mlb-1' />
                  {isInternalPortalUser ? (
                    // TASK-1388 — el dropdown del avatar es el hogar de lo personal
                    // (`/my/*`). Los atajos admin que duplicaban el sidebar se
                    // retiraron: la zona Administración del rail los cubre.
                    myNavItems.map(item => (
                      <MenuItem key={item.href} className='mli-2 gap-3' onClick={e => handleDropdownClose(e, item.href)}>
                        <i className={item.icon} />
                        <Typography color='text.primary'>{GH_MY_NAV[item.copyKey].label}</Typography>
                      </MenuItem>
                    ))
                  ) : (
                    <>
                      <MenuItem className='mli-2 gap-3' onClick={e => handleDropdownClose(e, dashboardHref)}>
                        <i className='tabler-layout-dashboard' />
                        <Typography color='text.primary'>{GH_CLIENT_NAV.dashboard.label}</Typography>
                      </MenuItem>
                      <MenuItem className='mli-2 gap-3' onClick={e => handleDropdownClose(e, '/proyectos')}>
                        <i className='tabler-folders' />
                        <Typography color='text.primary'>{GH_CLIENT_NAV.projects.label}</Typography>
                      </MenuItem>
                      <MenuItem className='mli-2 gap-3' onClick={e => handleDropdownClose(e, '/sprints')}>
                        <i className='tabler-bolt' />
                        <Typography color='text.primary'>{GH_CLIENT_NAV.sprints.label}</Typography>
                      </MenuItem>
                      <MenuItem className='mli-2 gap-3' onClick={e => handleDropdownClose(e, '/settings')}>
                        <i className='tabler-settings' />
                        <Typography color='text.primary'>{GH_CLIENT_NAV.settings.label}</Typography>
                      </MenuItem>
                      <MenuItem className='mli-2 gap-3' onClick={e => handleDropdownClose(e, '/updates')}>
                        <i className='tabler-bell' />
                        <Typography color='text.primary'>{GH_CLIENT_NAV.updates.label}</Typography>
                      </MenuItem>
                    </>
                  )}
                  <div className='flex items-center plb-2 pli-3'>
                    <Button
                      fullWidth
                      variant='contained'
                      color='error'
                      size='small'
                      endIcon={<i className='tabler-logout' />}
                      onClick={handleUserLogout}
                      sx={{ '& .MuiButton-endIcon': { marginInlineStart: 1.5 } }}
                    >
                      {GH_MESSAGES.logout_button}
                    </Button>
                  </div>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default UserDropdown
