import type { IOptions } from 'sanitize-html'

export interface RichHtmlSanitizationPolicy {
  id: string
  version: number
  sanitizeOptions: IOptions
}

export const HUBSPOT_PRODUCT_DESCRIPTION_POLICY_ID = 'hubspot_product_description_v1'

export const HUBSPOT_PRODUCT_DESCRIPTION_POLICY: RichHtmlSanitizationPolicy = {
  id: HUBSPOT_PRODUCT_DESCRIPTION_POLICY_ID,
  version: 1,
  sanitizeOptions: {
    allowedTags: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'br'],
    allowedAttributes: {
      a: ['href']
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    parseStyleAttributes: false
  }
}

const POLICIES = new Map<string, RichHtmlSanitizationPolicy>([
  [HUBSPOT_PRODUCT_DESCRIPTION_POLICY_ID, HUBSPOT_PRODUCT_DESCRIPTION_POLICY]
])

export const getRichHtmlSanitizationPolicy = (
  policyId: string
): RichHtmlSanitizationPolicy => {
  const policy = POLICIES.get(policyId)

  if (!policy) {
    throw new Error(`Unknown rich HTML sanitization policy: ${policyId}`)
  }

  return policy
}
