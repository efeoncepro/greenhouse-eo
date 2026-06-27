export const EMAIL_COLORS = {
  background: '#F2F4F7',
  containerBg: '#FFFFFF',
  headerBg: '#022a4e',       // Midnight Navy
  headerAccent: '#0375db',   // Core Blue — gradient stop
  primary: '#0375db',        // Core Blue
  primaryHover: '#025bb0',
  text: '#1A1A2E',
  secondary: '#344054',
  muted: '#667085',
  border: '#E4E7EC',
  success: '#12B76A',
  warning: '#B54708',        // amber ink — partial/degraded notice text
  warningBg: '#FFFAEB',      // soft amber — partial/degraded notice background
  infoBg: '#F0F9FF',         // soft blue — informational box background (provenance/consent)
  footerBg: '#F9FAFB',
} as const

export const EMAIL_FONTS = {
  heading: 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif',
  body: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
} as const

export const LOGO_URL = 'https://greenhouse.efeoncepro.com/branding/logo-white-email.png'
export const APP_URL = 'https://greenhouse.efeoncepro.com'

/**
 * Efeonce (agency/group) brand masthead for AGENCY-facing public surfaces — e.g. the
 * public AI Visibility Grader lead magnet (TASK-1250), whose attachment is already
 * 100% Efeonce-branded. Distinct from the Greenhouse PORTAL masthead (`LOGO_URL`):
 * a cold prospect sees Efeonce, not the internal portal product. White wordmark
 * (520×122) reused from the report PDF, served by the prod custom domain (no SSO).
 * The Efeonce URL / legal name / slogan live in the brand SSOT (`@/config/efeonce-brand`) — import there, never redefine.
 */
export const EFEONCE_LOGO_URL = 'https://greenhouse.efeoncepro.com/branding/pdf/efeonce-wordmark-white.png'
