import { describe, expect, it } from 'vitest'

import { selectEmailTemplateCopy } from './template-copy'

describe('email template copy selector', () => {
  const platformCopy = { heading: 'Confirma tu correo' }
  const legacyEnglishCopy = { heading: 'Confirm your email' }

  it('uses platform dictionary copy for Spanish and unknown locales', () => {
    expect(selectEmailTemplateCopy('es', platformCopy, legacyEnglishCopy)).toBe(platformCopy)
    expect(selectEmailTemplateCopy('es-CL', platformCopy, legacyEnglishCopy)).toBe(platformCopy)
    expect(selectEmailTemplateCopy(undefined, platformCopy, legacyEnglishCopy)).toBe(platformCopy)
    expect(selectEmailTemplateCopy('fr-FR', platformCopy, legacyEnglishCopy)).toBe(platformCopy)
  })

  it('preserves legacy English copy while en-US dictionary is still a mirror stub', () => {
    expect(selectEmailTemplateCopy('en', platformCopy, legacyEnglishCopy)).toBe(legacyEnglishCopy)
    expect(selectEmailTemplateCopy('en-US', platformCopy, legacyEnglishCopy)).toBe(legacyEnglishCopy)
  })
})
