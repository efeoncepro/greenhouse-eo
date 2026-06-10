'use client'

import NexaGreetingsCard, {
  type NexaGreetingsAction,
  type NexaGreetingsCardProps
} from '@/components/greenhouse/nexa/NexaGreetingsCard'

import {
  type GreenhouseNexaGreetingKind,
  type GreenhouseNexaGreetingVariant,
  resolveGreenhouseNexaGreetingKind,
  resolveGreenhouseNexaGreetingVariant
} from './greenhouse-nexa-greeting-controller'

export type GreenhouseNexaGreetingProps = Omit<NexaGreetingsCardProps, 'variant' | 'dataCapture' | 'dataKind'> & {
  variant?: GreenhouseNexaGreetingVariant
  kind?: GreenhouseNexaGreetingKind
  dataCapture?: string
}

export type { NexaGreetingsAction }

const GreenhouseNexaGreeting = ({
  variant,
  kind = 'homeOperatorGreeting',
  dataCapture,
  ...props
}: GreenhouseNexaGreetingProps) => {
  const resolvedKind = resolveGreenhouseNexaGreetingKind(kind)
  const resolvedVariant = resolveGreenhouseNexaGreetingVariant(variant, kind)

  return (
    <NexaGreetingsCard
      {...props}
      variant={resolvedVariant}
      dataCapture={dataCapture ?? resolvedKind.dataCapture}
      dataKind={kind}
    />
  )
}

export default GreenhouseNexaGreeting
