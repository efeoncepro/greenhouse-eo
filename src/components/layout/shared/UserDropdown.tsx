'use client'

import { useRef, useState } from 'react'
import type { MouseEvent } from 'react'

import { useRouter } from 'next/navigation'

import { signOut, useSession } from 'next-auth/react'

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
import { GH_CLIENT_NAV, GH_INTERNAL_NAV, GH_MESSAGES } from '@/config/greenhouse-nomenclature'
import { resolveAvatarPath } from '@/lib/people/resolve-avatar-path'

const BadgeContentSpan = styled('span')({
  width: 8,
  height: 8,
  borderRadius: '50%',
  cursor: 'pointer',
  backgroundColor: 'var(--mui-palette-success-main)',
  boxShadow: '0 0 0 2px var(--mui-palette-background-paper)'
})

const UserDropdown = () => {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { settings } = useSettings()
  const { data: session } = useSession()
  const dashboardHref = session?.user?.portalHomePath || '/dashboard'
  const isInternalUser = session?.user?.routeGroups?.includes('internal') ?? false
  const isAdminUser = session?.user?.routeGroups?.includes('admin') ?? false

  const sessionAvatarPath = resolveAvatarPath({
    name: session?.user?.name,
    email: session?.user?.email
  })

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
          alt='Greenhouse Workspace'
          src={sessionAvatarPath || '/images/avatars/1.png'}
          onClick={handleDropdownOpen}
          className='cursor-pointer bs-[38px] is-[38px]'
        />
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
                <MenuList>
                  <div className='flex items-center plb-2 pli-6 gap-2' tabIndex={-1}>
                    <Avatar alt='Greenhouse Workspace' src={sessionAvatarPath || '/images/avatars/1.png'} />
                    <div className='flex items-start flex-col'>
                      <Typography className='font-medium' color='text.primary'>
                        {session?.user?.name || 'Greenhouse Demo'}
                      </Typography>
                      <Typography variant='caption'>{session?.user?.email || 'client.portal@efeonce.com'}</Typography>
                    </div>
                  </div>
                  <Divider className='mlb-1' />
                  <MenuItem className='mli-2 gap-3' onClick={e => handleDropdownClose(e, dashboardHref)}>
                    <i className='tabler-layout-dashboard' />
                    <Typography color='text.primary'>
                      {isInternalUser ? GH_INTERNAL_NAV.internalDashboard.label : GH_CLIENT_NAV.dashboard.label}
                    </Typography>
                  </MenuItem>
                  {!isInternalUser ? (
                    <>
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
                  ) : null}
                  {isAdminUser ? (
                    <MenuItem className='mli-2 gap-3' onClick={e => handleDropdownClose(e, '/admin/tenants')}>
                      <i className='tabler-building-community' />
                      <Typography color='text.primary'>{GH_INTERNAL_NAV.adminTenants.label}</Typography>
                    </MenuItem>
                  ) : null}
                  {isAdminUser ? (
                    <MenuItem className='mli-2 gap-3' onClick={e => handleDropdownClose(e, '/admin/users')}>
                      <i className='tabler-shield' />
                      <Typography color='text.primary'>{GH_INTERNAL_NAV.adminUsers.label}</Typography>
                    </MenuItem>
                  ) : null}
                  {isAdminUser ? (
                    <MenuItem className='mli-2 gap-3' onClick={e => handleDropdownClose(e, '/admin/roles')}>
                      <i className='tabler-shield-lock' />
                      <Typography color='text.primary'>{GH_INTERNAL_NAV.adminRoles.label}</Typography>
                    </MenuItem>
                  ) : null}
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
