'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import ContractDocument from './ContractDocument'
import OfferLetterDocument from './OfferLetterDocument'
import { DOC_MOCKUP_COPY } from './document-mock-data'

const DISPLAY_FONT = 'Poppins, var(--font-poppins), sans-serif'

type DocKind = 'offer' | 'contract'
type DocStatus = 'draft' | 'signed'

const ContractingDocumentFormatMockupView = () => {
  const [kind, setKind] = useState<DocKind>('offer')
  const [status, setStatus] = useState<DocStatus>('draft')

  const draft = status === 'draft'

  return (
    <Box sx={{ pb: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography component='h1' sx={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 24, lineHeight: 1.2 }}>
          {DOC_MOCKUP_COPY.pageTitle}
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 14, mt: 1, maxWidth: 760 }}>
          {DOC_MOCKUP_COPY.pageSubtitle}
        </Typography>
      </Box>

      {/* Toolbar */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 4, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
      >
        <ToggleButtonGroup
          exclusive
          color='primary'
          size='small'
          value={kind}
          onChange={(_, v: DocKind | null) => v && setKind(v)}
        >
          <ToggleButton value='offer' data-capture-toggle='offer'>
            <i className='tabler-mail-heart' style={{ fontSize: 18, marginInlineEnd: 8 }} />
            {DOC_MOCKUP_COPY.toggleOffer}
          </ToggleButton>
          <ToggleButton value='contract' data-capture-toggle='contract'>
            <i className='tabler-file-certificate' style={{ fontSize: 18, marginInlineEnd: 8 }} />
            {DOC_MOCKUP_COPY.toggleContract}
          </ToggleButton>
        </ToggleButtonGroup>

        <Stack direction='row' spacing={1.5} alignItems='center'>
          <Chip
            size='small'
            variant='tonal'
            color='info'
            label='Bilingüe es-CL + en-US'
            icon={<i className='tabler-language' />}
          />
          <ToggleButtonGroup
            exclusive
            size='small'
            value={status}
            onChange={(_, v: DocStatus | null) => v && setStatus(v)}
          >
            <ToggleButton value='draft' data-capture-toggle='draft'>{DOC_MOCKUP_COPY.statusDraft}</ToggleButton>
            <ToggleButton value='signed' data-capture-toggle='signed'>{DOC_MOCKUP_COPY.statusSigned}</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {/* Paper stage */}
      <Box
        data-capture-stage='contracting-document'
        sx={{
          bgcolor: theme => theme.palette.action.hover,
          borderRadius: 2,
          border: theme => `1px solid ${theme.palette.divider}`,
          px: { xs: 2, md: 5 },
          py: { xs: 3, md: 6 }
        }}
      >
        {kind === 'offer' ? <OfferLetterDocument draft={draft} /> : <ContractDocument draft={draft} />}
      </Box>
    </Box>
  )
}

export default ContractingDocumentFormatMockupView
