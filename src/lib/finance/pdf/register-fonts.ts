import 'server-only'

import { resolve } from 'node:path'

import { Font } from '@react-pdf/renderer'

/**
 * TASK-629 — Font registration for PDFs.
 *
 * Each weight is registered as its OWN family name (e.g. "Geist" for
 * regular 400, "Geist Medium" for 500, "Geist Bold" for 700). This
 * is the idiomatic React-PDF pattern when components don't want to pass
 * fontWeight on every Text style — they just reference the family name
 * that matches the visual intent.
 *
 * TASK-862 — Geist added as canonical body font per DESIGN.md
 * (lines 380+384: max 2 families = Poppins + Geist; DM Sans deprecated).
 * Geist TTFs sourced from Google Fonts via gwfh helper:
 *   https://gwfh.mranftl.com/api/fonts/geist?variants=regular,500,700&formats=ttf
 * License: SIL Open Font License 1.1 (free redistribution).
 *
 * DM Sans kept TEMPORARILY registered to not break PDFs that still
 * reference it (e.g. current document-pdf.tsx finiquito). TASK-862
 * Slice D migrates it; once no callsites remain, remove the 3 DM Sans
 * lines + delete src/assets/fonts/DMSans-*.ttf.
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
    // Geist — canonical body font (DESIGN.md). Source: Google Fonts.
    // Registrado POR NOMBRE DE FAMILIA (no por fontWeight): un componente PDF
    // referencia 'Geist Bold' etc. La escala del SoT (TASK-1036/1038) usa
    // 400/500/600/700/800 — TASK-1040 sumó SemiBold(600)+ExtraBold(800) para
    // paridad de peso PDF↔web (section-titles 600, KPI hero / display 800).
    tryRegister('Geist', resolve(FONT_DIR, 'Geist-Regular.ttf'))
    tryRegister('Geist Medium', resolve(FONT_DIR, 'Geist-Medium.ttf'))
    tryRegister('Geist SemiBold', resolve(FONT_DIR, 'Geist-SemiBold.ttf'))
    tryRegister('Geist Bold', resolve(FONT_DIR, 'Geist-Bold.ttf'))
    tryRegister('Geist ExtraBold', resolve(FONT_DIR, 'Geist-ExtraBold.ttf'))

    // Poppins — canonical display font (DESIGN.md).
    tryRegister('Poppins Medium', resolve(FONT_DIR, 'Poppins-Medium.ttf'))
    tryRegister('Poppins', resolve(FONT_DIR, 'Poppins-SemiBold.ttf'))
    tryRegister('Poppins Bold', resolve(FONT_DIR, 'Poppins-Bold.ttf'))

    // Poppins ExtraBold / Black (+ italics) — Efeonce slogan "Empower your Growth".
    // Source: Google Fonts (fonts.gstatic.com Poppins v24, Latin subset), SIL OFL 1.1.
    // Typography contract in src/config/efeonce-brand.ts (EFEONCE_SLOGAN_PARTS).
    tryRegister('Poppins ExtraBold', resolve(FONT_DIR, 'Poppins-ExtraBold.ttf'))
    tryRegister('Poppins ExtraBold Italic', resolve(FONT_DIR, 'Poppins-ExtraBoldItalic.ttf'))
    tryRegister('Poppins Black', resolve(FONT_DIR, 'Poppins-Black.ttf'))
    tryRegister('Poppins Black Italic', resolve(FONT_DIR, 'Poppins-BlackItalic.ttf'))

    // DM Sans — DEPRECATED per DESIGN.md. Kept registered until last
    // consumer migrates; see register-fonts.ts header comment.
    tryRegister('DM Sans', resolve(FONT_DIR, 'DMSans-Regular.ttf'))
    tryRegister('DM Sans Medium', resolve(FONT_DIR, 'DMSans-Medium.ttf'))
    tryRegister('DM Sans Bold', resolve(FONT_DIR, 'DMSans-Bold.ttf'))

    Font.registerHyphenationCallback(word => [word])
  })()

  return registrationPromise
}

export const ensurePdfFontsRegistered = registerFontsOnce
