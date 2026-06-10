'use client'

// TASK-1075 — Mi Desempeño · editorial brief (concept A v2).
// Collaborator lens: calidad → tu ritmo → tu foco (NOT revenue/client lens).
// MODULAR product dashboard: page-chrome header on the canvas, then distinct surface
// panels with clear hierarchy (Linear/Vercel/Stripe-dashboard pattern) — NOT one mega-card,
// NOT bare canvas, NOT a flat grid of equal cards. Sibling panels, no nesting (no card-on-card).
// Tier 1: dominant Story hero panel (verdict + score + the chart that IS the story).
// Tier 2: diagnosis row — Causal chain | Nexa coaching.
// Tier 3: supporting metrics ribbon.
// Tokenized (AXIS / SoT / elevation). Reference north: .captures/concepts/v2-a-editorial-brief.png

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import NexaInsightsBlock from '@/components/greenhouse/NexaInsightsBlock'

import { editorialBrief } from './data'
import PerformanceHeader from './components/PerformanceHeader'
import StoryHeroPanel from './components/StoryHeroPanel'
import CausalChainPanel from './components/CausalChainPanel'
import MetricsRibbonPanel from './components/MetricsRibbonPanel'

const MyPerformanceEnterpriseMockupView = () => {
  const b = editorialBrief

  return (
    <Box sx={{ maxWidth: 1140, mx: 'auto', pt: { xs: 1, md: 2 }, pb: 2 }}>
      <Stack spacing={{ xs: 3, md: 3.5 }}>
        {/* Page chrome — on the canvas */}
        <PerformanceHeader eyebrow={b.eyebrow} member={b.member} space={b.space} periods={b.periods} />

        {/* Tier 1 — the dominant story module */}
        <StoryHeroPanel headline={b.headline} subline={b.subline} score={b.score} hero={b.hero} />

        {/* Tier 2 — diagnosis: the causal chain */}
        <CausalChainPanel nodes={b.causal} />

        {/* Tier 3 — Nexa Insights (the REAL hardened component): severity-led cards,
            recommended action, "Ver causa raíz" drill CTA. Self-view (mentionSafeMode). */}
        <NexaInsightsBlock
          insights={b.nexaBlock.insights}
          totalAnalyzed={b.nexaBlock.totalAnalyzed}
          lastAnalysis={b.nexaBlock.lastAnalysis}
          runStatus={b.nexaBlock.runStatus}
          dataStatus='ready'
          defaultExpanded
          mentionSafeMode
        />

        {/* Tier 4 — supporting metrics */}
        <MetricsRibbonPanel metrics={b.ribbon} />

        <Typography variant='caption' sx={{ color: 'text.disabled', display: 'block', mt: 1 }}>
          Nexa Insights es una lectura operativa personal. No reemplaza procesos de HR ni otras acciones formales.
        </Typography>
      </Stack>
    </Box>
  )
}

export default MyPerformanceEnterpriseMockupView
