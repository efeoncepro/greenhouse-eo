'use client'

import { useRouter } from 'next/navigation'

import { motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'
import { NexaGreetingsCard, type NexaGreetingsAction } from '@/components/greenhouse/nexa/NexaGreetingsCard'

import type { HomeHeroAiData } from '@/lib/home/contract'

interface HomeHeroAiProps {
  data: HomeHeroAiData
}

/**
 * Smart Home v2 Hero — thin data adapter around the reusable
 * `NexaGreetingsCard`. It owns only the home-specific plumbing (prompt routing
 * to `/home?nexa=...` and mapping the loader payload to card props); all
 * presentation lives in the shared Greenhouse component.
 */
export const HomeHeroAi = ({ data }: HomeHeroAiProps) => {
  const router = useRouter()
  const reduced = useReducedMotion()

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
    onSelect: () => submitPrompt(suggestion.prompt)
  }))

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={reduced ? undefined : { opacity: 1, y: 0 }}
      transition={reduced ? undefined : { duration: 0.32, ease: [0.2, 0, 0, 1] }}
    >
      <NexaGreetingsCard
        greeting={data.greeting}
        roleLine={roleLine}
        onSubmitPrompt={submitPrompt}
        actions={actions}
        disclaimer={data.disclaimer}
      />
    </motion.div>
  )
}

export default HomeHeroAi
