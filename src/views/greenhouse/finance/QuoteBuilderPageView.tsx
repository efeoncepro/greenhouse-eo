'use client'

import Box from '@mui/material/Box'

import QuoteBuilderShell, {
  type QuoteBuilderMode,
  type QuoteBuilderShellQuote
} from './workspace/QuoteBuilderShell'
import type { QuoteLineItem } from './workspace/QuoteLineItemsEditor'
import type { QuoteCreateOrganization, QuoteCreateTemplate } from './workspace/quote-builder-types'

export interface QuoteBuilderPageViewProps {
  mode: QuoteBuilderMode
  quote?: QuoteBuilderShellQuote
  initialLines?: QuoteLineItem[]
  templates: QuoteCreateTemplate[]
  organizations: QuoteCreateOrganization[]
  canSeeCostStack: boolean
}

const QuoteBuilderPageView = ({
  mode,
  quote,
  initialLines,
  templates,
  organizations,
  canSeeCostStack
}: QuoteBuilderPageViewProps) => {
  return (
    <Box sx={{ pb: 4 }}>
      <QuoteBuilderShell
        mode={mode}
        quote={quote}
        initialLines={initialLines}
        templates={templates}
        organizations={organizations}
        canSeeCostStack={canSeeCostStack}
      />
    </Box>
  )
}

export default QuoteBuilderPageView
