import 'server-only'

import { resolve } from 'node:path'

import { Font } from '@react-pdf/renderer'

/**
 * TASK-629 — Font registration for the quotation PDF.
 *
 * Each weight is registered as its OWN family name (e.g. "DM Sans" for
 * regular 400, "DM Sans Medium" for 500, "DM Sans Bold" for 700). This
 * is the idiomatic React-PDF pattern when components don't want to pass
 * fontWeight on every Text style — they just reference the family name
 * that matches the visual intent.
 *
 * Robustness:
 * - `registrationPromise` cache: dedupe concurrent registrations.
 * - `tryRegister` swallows individual font failures so a missing TTF
 *   doesn't break the entire PDF render — React-PDF falls back to
 *   Helvetica for any unregistered family.
 * - Hyphenation callback disabled (Spanish names get split badly by
 *   the default English-tuned hyphenator).
 */

const FONT_DIR = resolve(process.cwd(), 'src/assets/fonts')

let registrationPromise: Promise<void> | null = null

const tryRegister = (family: string, src: string): boolean => {
  try {
    Font.register({ family, src })
    
return true
  } catch (error) {
    console.warn(
      `[pdf-fonts] Failed to register ${family}:`,
      error instanceof Error ? error.message : error
    )
    
return false
  }
}

const registerFontsOnce = async (): Promise<void> => {
  if (registrationPromise) return registrationPromise

  registrationPromise = (async () => {
    tryRegister('DM Sans', resolve(FONT_DIR, 'DMSans-Regular.ttf'))
    tryRegister('DM Sans Medium', resolve(FONT_DIR, 'DMSans-Medium.ttf'))
    tryRegister('DM Sans Bold', resolve(FONT_DIR, 'DMSans-Bold.ttf'))
    tryRegister('Poppins Medium', resolve(FONT_DIR, 'Poppins-Medium.ttf'))
    tryRegister('Poppins', resolve(FONT_DIR, 'Poppins-SemiBold.ttf'))
    tryRegister('Poppins Bold', resolve(FONT_DIR, 'Poppins-Bold.ttf'))

    Font.registerHyphenationCallback(word => [word])
  })()

  return registrationPromise
}

export const ensurePdfFontsRegistered = registerFontsOnce
