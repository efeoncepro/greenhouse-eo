'use client'

import { useRouter } from 'next/navigation'

import { NexaGreetingsCard, type NexaGreetingsAction } from '@/components/greenhouse/nexa/NexaGreetingsCard'

import type { HomeHeroAiData } from '@/lib/home/contract'

interface HomeHeroAiProps {
  data: HomeHeroAiData
}

// Tabler icon per suggestion-intent family — adds scannability to the chips.
const ICON_BY_INTENT_FAMILY: Record<string, string> = {
  inbox: 'tabler-checklist',
  capacity: 'tabler-clock-hour-4',
  payroll: 'tabler-cash',
  leaves: 'tabler-calendar-event',
  finance: 'tabler-coin',
  delivery: 'tabler-truck-delivery',
  reliability: 'tabler-activity-heartbeat',
  agency: 'tabler-users-group',
  people: 'tabler-cake',
  attendance: 'tabler-clock-check',
  reports: 'tabler-mail'
}

const iconForIntent = (intent: string): string =>
  ICON_BY_INTENT_FAMILY[intent.split('.')[0]] ?? 'tabler-sparkles'

// Rotating prompt examples — teach what to ask Nexa. First entry matches the
// design's static placeholder; the rest are concrete, broadly-applicable es-CL
// questions that work across audiences.
const HOME_PROMPT_EXAMPLES = [
  'Pregunta sobre RpA, Cycle Time…',
  '¿Cómo va el OTD del equipo?',
  '¿Cuál es el estado de la nómina?',
  '¿Qué tengo pendiente hoy?',
  '¿Cómo viene el cierre del mes?'
]

/**
 * Smart Home v2 Hero — thin data adapter around the reusable
 * `NexaGreetingsCard`. It owns only the home-specific plumbing (prompt routing
 * to `/home?nexa=...` and mapping the loader payload to card props); all
 * presentation + entrance motion lives in the shared Greenhouse component.
 */
export const HomeHeroAi = ({ data }: HomeHeroAiProps) => {
  const router = useRouter()

  const submitPrompt = (text: string) => {
    if (!text.trim()) return
    router.push(`/home?nexa=${encodeURIComponent(text.trim())}`)
  }

  const roleLine = data.identity
    ? [data.identity.role, data.identity.tenantLabel].filter(Boolean).join(' · ')
    : data.subtitle

  const actions: NexaGreetingsAction[] = data.suggestions.slice(0, 3).map(suggestion => ({
    key: suggestion.intent,
    label: suggestion.shortLabel,
    iconClass: iconForIntent(suggestion.intent),
    onSelect: () => submitPrompt(suggestion.prompt)
  }))

  return (
    <NexaGreetingsCard
      greeting={data.greeting}
      roleLine={roleLine}
      onSubmitPrompt={submitPrompt}
      actions={actions}
      placeholderExamples={HOME_PROMPT_EXAMPLES}
      disclaimer={data.disclaimer}
    />
  )
}

export default HomeHeroAi
