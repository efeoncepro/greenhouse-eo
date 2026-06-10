export type GreenhouseNexaGreetingVariant = 'hero' | 'compactContextual'

export type GreenhouseNexaGreetingKind = 'homeOperatorGreeting' | 'funnelStageAdvisor' | 'custom'

export type GreenhouseNexaGreetingVariantConfig = {
  label: string
  description: string
}

export type GreenhouseNexaGreetingKindConfig = {
  variant: GreenhouseNexaGreetingVariant
  label: string
  description: string
  dataCapture: string
}

export const GREENHOUSE_NEXA_GREETING_VARIANT_CONFIG: Record<
  GreenhouseNexaGreetingVariant,
  GreenhouseNexaGreetingVariantConfig
> = {
  hero: {
    label: 'Hero greeting',
    description: 'Entrada conversacional principal para Home o superficies donde Nexa abre la experiencia.'
  },
  compactContextual: {
    label: 'Compact contextual',
    description: 'Entrada conversacional compacta para leer una superficie existente sin duplicar sus datos.'
  }
}

export const GREENHOUSE_NEXA_GREETING_KIND_CONFIG: Record<
  GreenhouseNexaGreetingKind,
  GreenhouseNexaGreetingKindConfig
> = {
  homeOperatorGreeting: {
    variant: 'hero',
    label: 'Home operator greeting',
    description: 'Greeting principal de Nexa para orientar la operacion diaria desde Home.',
    dataCapture: 'nexa-greeting-home-operator'
  },
  funnelStageAdvisor: {
    variant: 'compactContextual',
    label: 'Funnel stage advisor',
    description: 'Nexa interpreta la etapa activa de un funnel y sugiere conversaciones accionables sin repetir la tabla.',
    dataCapture: 'nexa-greeting-funnel-stage-advisor'
  },
  custom: {
    variant: 'compactContextual',
    label: 'Custom',
    description: 'Uso controlado cuando un consumer define todo el contexto y mantiene el contrato de Nexa Greeting.',
    dataCapture: 'nexa-greeting-custom'
  }
}

export const resolveGreenhouseNexaGreetingKind = (kind?: GreenhouseNexaGreetingKind) =>
  GREENHOUSE_NEXA_GREETING_KIND_CONFIG[kind ?? 'homeOperatorGreeting']

export const resolveGreenhouseNexaGreetingVariant = (
  variant?: GreenhouseNexaGreetingVariant,
  kind?: GreenhouseNexaGreetingKind
) => variant ?? resolveGreenhouseNexaGreetingKind(kind).variant
