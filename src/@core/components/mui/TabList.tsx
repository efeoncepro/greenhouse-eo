// MUI Imports
import MuiTabList from '@mui/lab/TabList'
import MuiTabs from '@mui/material/Tabs'
import { styled } from '@mui/material/styles'
import type { TabListProps } from '@mui/lab/TabList'
import type { TabsProps } from '@mui/material/Tabs'

// Type Imports
import type { ThemeColor } from '@core/types'

export type CustomTabListProps = TabListProps & {
  color?: ThemeColor
  pill?: 'true' | 'false'
}

const TabList = styled(MuiTabList)<CustomTabListProps>(({ color, theme, pill, orientation }) => ({
  ...(pill === 'true' && {
    minHeight: 38,
    ...(orientation === 'vertical'
      ? {
          borderInlineEnd: 0
        }
      : {
          borderBlockEnd: 0
        }),
    '&, & .MuiTabs-scroller': {
      ...(orientation === 'vertical' && {
        boxSizing: 'content-box'
      }),
      margin: `${theme.spacing(-1, -1, -1.5, -1)} !important`,
      padding: theme.spacing(1, 1, 1.5, 1)
    },
    '& .MuiTabs-indicator': {
      display: 'none'
    },
    '& .MuiTabs-flexContainer': {
      gap: theme.spacing(1)
    },
    '& .Mui-selected': {
      backgroundColor: `var(--mui-palette-${color}-main) !important`,
      color: `var(--mui-palette-${color}-contrastText) !important`,
      boxShadow: `var(--mui-customShadows-${color}-sm)`
    },
    '& .MuiTab-root': {
      minHeight: 38,
      padding: theme.spacing(2, 5),
      borderRadius: 'var(--mui-shape-borderRadius)',
      '&:hover': {
        border: 0,
        backgroundColor: `var(--mui-palette-${color}-lightOpacity)`,
        color: `var(--mui-palette-${color}-main)`,
        ...(orientation === 'vertical'
          ? {
              paddingInlineEnd: theme.spacing(5)
            }
          : {
              paddingBlockEnd: theme.spacing(2)
            })
      }
    }
  })
}))

const CustomTabList = (props: CustomTabListProps) => {
  // Props
  const { color = 'primary', ...rest } = props

  return <TabList color={color} {...rest} />
}

export type CustomTabsNavProps = TabsProps & {
  color?: ThemeColor
  pill?: 'true' | 'false'
}

// TASK-1307 — variante para TABS-QUE-SON-LINKS (navegación entre rutas hermanas).
// El TabList de @mui/lab clona cada Tab inyectándole `aria-controls` hacia un TabPanel
// que en una navegación NO existe (el "panel" es la página siguiente) — axe lo marca
// `aria-valid-attr-value` critical y el clone pisa cualquier override del consumer.
// `MuiTabs` plano emite las MISMAS clases (.MuiTabs-*/.MuiTab-root), así que el estilo
// pill se comparte por CSS sin duplicarlo; acá solo cambia el componente base y que
// nadie fabrica ARIA hacia paneles fantasma. Ver SeoSearchVisibilityTabs (consumer).
const TabsNav = styled(MuiTabs)<CustomTabsNavProps>(({ color, theme, pill, orientation }) => ({
  ...(pill === 'true' && {
    minHeight: 38,
    ...(orientation === 'vertical' ? { borderInlineEnd: 0 } : { borderBlockEnd: 0 }),
    '&, & .MuiTabs-scroller': {
      ...(orientation === 'vertical' && { boxSizing: 'content-box' }),
      margin: `${theme.spacing(-1, -1, -1.5, -1)} !important`,
      padding: theme.spacing(1, 1, 1.5, 1)
    },
    '& .MuiTabs-indicator': { display: 'none' },
    '& .MuiTabs-flexContainer': { gap: theme.spacing(1) },
    '& .Mui-selected': {
      backgroundColor: `var(--mui-palette-${color}-main) !important`,
      color: `var(--mui-palette-${color}-contrastText) !important`,
      boxShadow: `var(--mui-customShadows-${color}-sm)`
    },
    '& .MuiTab-root': {
      minHeight: 38,
      padding: theme.spacing(2, 5),
      borderRadius: 'var(--mui-shape-borderRadius)',
      '&:hover': {
        border: 0,
        backgroundColor: `var(--mui-palette-${color}-lightOpacity)`,
        color: `var(--mui-palette-${color}-main)`,
        ...(orientation === 'vertical' ? { paddingInlineEnd: theme.spacing(5) } : { paddingBlockEnd: theme.spacing(2) })
      }
    }
  })
}))

export const CustomTabsNav = (props: CustomTabsNavProps) => {
  const { color = 'primary', ...rest } = props

  return <TabsNav color={color} {...rest} />
}

export default CustomTabList
