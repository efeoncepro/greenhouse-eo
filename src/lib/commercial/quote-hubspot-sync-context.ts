export interface HubSpotQuoteCommercialContext {
  organizationId?: string | null
  hubspotCompanyId?: string | null
  contactIdentityProfileId?: string | null
  hubspotDealId?: string | null
  sourceSystem?: string | null
  hubspotQuoteId?: string | null
}

export const requiresHubSpotQuoteCommercialContext = (
  context: Pick<HubSpotQuoteCommercialContext, 'hubspotDealId' | 'sourceSystem' | 'hubspotQuoteId'>
) => Boolean(context.hubspotDealId || context.hubspotQuoteId || context.sourceSystem === 'hubspot')

export const validateHubSpotQuoteCommercialContext = (
  context: HubSpotQuoteCommercialContext
): string | null => {
  if (!requiresHubSpotQuoteCommercialContext(context)) {
    return null
  }

  if (!context.organizationId) {
    return 'Las cotizaciones sincronizadas con HubSpot requieren una organización asociada.'
  }

  if (!context.hubspotCompanyId) {
    return 'La organización seleccionada no tiene company de HubSpot vinculada. Vincula la company antes de sincronizar la cotización.'
  }

  if (!context.contactIdentityProfileId) {
    return 'Las cotizaciones sincronizadas con HubSpot requieren un contacto activo de esa organización.'
  }

  if (!context.hubspotDealId) {
    return 'Las cotizaciones sincronizadas con HubSpot requieren un deal vinculado.'
  }

  return null
}
