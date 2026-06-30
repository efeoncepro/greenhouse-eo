/**
 * TASK-1266 — Growth AI Visibility · Structural AEO probes (eje `structural`).
 *
 * Probes que explican la CAUSA estructural de la (in)visibilidad: "¿por qué no te citan?".
 * robots IA + JSON-LD + llms.txt + sitemap (HTTP read-only) + Core Web Vitals (headless,
 * degrada a skipped sin Chromium). Orden = el de ejecución secuencial del gatherer.
 */

import { type Probe } from '../contracts'
import { robotsTxtProbe } from './robots-txt'
import { jsonLdProbe } from './json-ld'
import { llmsTxtProbe } from './llms-txt'
import { sitemapProbe } from './sitemap'
import { coreWebVitalsProbe } from './core-web-vitals'

export const STRUCTURAL_PROBES: Probe[] = [
  robotsTxtProbe,
  jsonLdProbe,
  llmsTxtProbe,
  sitemapProbe,
  coreWebVitalsProbe
]
