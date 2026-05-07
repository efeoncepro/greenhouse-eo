'use client'

import type { ReactNode } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'

import CustomAvatar from '@core/components/mui/Avatar'
import type { ThemeColor } from '@core/types'

export interface OperationalPanelProps {
  title: ReactNode
  subheader?: ReactNode
  icon?: string
  iconColor?: ThemeColor
  action?: ReactNode
  children: ReactNode
  fullHeight?: boolean
  divided?: boolean
}

/**
 * Standard section container for operational surfaces.
 *
 * It keeps Vuexy Card semantics, default theme padding, and one consistent
 * radius/elevation behavior so module screens do not invent local panel shells.
 */
const OperationalPanel = ({
  title,
  subheader,
  icon,
  iconColor = 'primary',
  action,
  children,
  fullHeight = false,
  divided = true
}: OperationalPanelProps) => (
  <Card
    sx={theme => ({
      height: fullHeight ? '100%' : undefined,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`
    })}
  >
    <CardHeader
      title={title}
      subheader={subheader}
      avatar={
        icon ? (
          <CustomAvatar skin='light' color={iconColor} variant='rounded'>
            <i className={icon} aria-hidden='true' />
          </CustomAvatar>
        ) : undefined
      }
      action={action}
    />
    {divided ? <Divider /> : null}
    <CardContent>{children}</CardContent>
  </Card>
)

export default OperationalPanel
