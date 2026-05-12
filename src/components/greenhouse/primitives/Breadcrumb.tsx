'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import { getMicrocopy } from '@/lib/copy'

/**
 * Breadcrumb — navegación jerárquica clickeable canónica.
 *
 * Implementa el contrato info-architecture-greenhouse-overlay §7:
 * - `<nav aria-label>` semantic
 * - `<ol>` con `<li>` por nivel
 * - parents clickeables (Link de Next.js)
 * - current page non-clickable con `aria-current="page"`
 * - chevron separator entre items (decorativo, aria-hidden)
 *
 * Tipografía: caption all-caps con letter-spacing — eyebrow visual + nav semantic.
 * Hover: parent links cambian a primary color + underline + transición 150ms.
 * Focus-visible: outline 2px primary.
 *
 * A11y:
 * - aria-label canónico vía getMicrocopy().aria.breadcrumb
 * - cada link recibe focus
 * - last item con aria-current
 *
 * Composición:
 * ```
 * <Breadcrumb items={[
 *   { label: 'Mi Greenhouse', href: '/home' },
 *   { label: 'Cola de offboarding' }  // no href = current page
 * ]} />
 * ```
 */
export interface BreadcrumbItem {
  /** Label visible (será uppercase + letter-spaced) */
  label: string

  /** Si está presente, el item es clickeable. Si ausente, es current-page */
  href?: string
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

const Breadcrumb = ({ items }: BreadcrumbProps) => {
  const theme = useTheme()
  const t = getMicrocopy()

  if (items.length === 0) return null

  return (
    <Box
      component='nav'
      aria-label={t.aria.breadcrumb}
      sx={{
        '& ol': {
          display: 'flex',
          flexWrap: 'wrap',
          listStyle: 'none',
          m: 0,
          p: 0,
          gap: 1,
          alignItems: 'center'
        },
        '& a': {
          color: theme.palette.text.secondary,
          textDecoration: 'none',
          fontSize: '0.75rem',
          fontWeight: 500,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          transition: 'color 150ms cubic-bezier(0.2, 0, 0, 1)',
          '&:hover': { color: theme.palette.primary.main, textDecoration: 'underline' },
          '&:focus-visible': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
            borderRadius: `${theme.shape.customBorderRadius.xs}px`
          }
        }
      }}
    >
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <Box component='li' key={`${item.label}-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isLast || !item.href ? (
                <Typography
                  component='span'
                  aria-current={isLast ? 'page' : undefined}
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: isLast ? 700 : 500,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    color: isLast ? 'text.primary' : 'text.secondary'
                  }}
                >
                  {item.label}
                </Typography>
              ) : (
                <Link href={item.href}>{item.label}</Link>
              )}
              {!isLast ? (
                <Box component='span' aria-hidden='true' sx={{ display: 'inline-flex', alignItems: 'center', color: 'text.disabled' }}>
                  <i className='tabler-chevron-right' style={{ fontSize: 14, opacity: 0.55 }} />
                </Box>
              ) : null}
            </Box>
          )
        })}
      </ol>
    </Box>
  )
}

export default Breadcrumb
