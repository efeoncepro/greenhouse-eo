'use client'

// React Imports
import type { ReactNode } from 'react'

// MUI Imports
import Zoom from '@mui/material/Zoom'
import { styled } from '@mui/material/styles'
import useScrollTrigger from '@mui/material/useScrollTrigger'

interface ScrollToTopProps {
  className?: string
  docked?: boolean
  children: ReactNode
}

const ScrollToTopStyled = styled('div', {
  shouldForwardProp: prop => prop !== 'docked'
})<{ docked?: boolean }>(({ theme, docked }) => docked
  ? ({
      position: 'static',
      zIndex: 'inherit'
    })
  : ({
      zIndex: 'var(--mui-zIndex-fab)',
      position: 'fixed',
      insetInlineEnd: theme.spacing(10),
      insetBlockEnd: theme.spacing(14)
    }))

const ScrollToTop = (props: ScrollToTopProps) => {
  // Props
  const { children, className, docked = false } = props

  // Hooks
  // init trigger
  const trigger = useScrollTrigger({
    threshold: 400,
    disableHysteresis: true
  })

  const handleClick = () => {
    const anchor = document.querySelector('body')

    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <Zoom in={trigger}>
      <ScrollToTopStyled className={className} docked={docked} onClick={handleClick} role='presentation'>
        {children}
      </ScrollToTopStyled>
    </Zoom>
  )
}

export default ScrollToTop
