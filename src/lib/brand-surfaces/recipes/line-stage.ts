/**
 * Builders de las dieciséis láminas del deck Salesforce (TASK-1942): el estilo «vivo» con el escenario, la plataforma de luz
 * y los haces en el acento de la LÍNEA de la pieza. Un archivo por lámina en `line-stage/`; lo compartido (escenario,
 * vidrio, documento, voz, nota e íconos oficiales de producto) vive en `line-stage/kit.ts`.
 */

import type { RecipeBuilder } from './deck'
import { contentOnePlatform } from './line-stage/content-one-platform'
import { methodAgentSupervisor } from './line-stage/method-agent-supervisor'
import { decisionPlatformCoexistence } from './line-stage/decision-platform-coexistence'
import { decisionProviderFit } from './line-stage/decision-provider-fit'
import { contentServiceLanes } from './line-stage/content-service-lanes'
import { contentSeasonLaunches } from './line-stage/content-season-launches'
import { methodIdentityConsent } from './line-stage/method-identity-consent'
import { methodMigrationReconcile } from './line-stage/method-migration-reconcile'
import { contentDayReleaseCycle } from './line-stage/content-day-release-cycle'
import { contentDayLiveLibrary } from './line-stage/content-day-live-library'
import { contentLiveChat } from './line-stage/content-live-chat'
import { contentMeasureFormulas } from './line-stage/content-measure-formulas'
import { decisionDiagnosisVerdict } from './line-stage/decision-diagnosis-verdict'
import { methodWaves } from './line-stage/method-waves'
import { contentDayLiveConsole } from './line-stage/content-day-live-console'
import { contentDayLiveApproval } from './line-stage/content-day-live-approval'

export const LINE_STAGE_BUILDERS: Record<string, RecipeBuilder> = {
  'content-one-platform': contentOnePlatform,
  'method-agent-supervisor': methodAgentSupervisor,
  'decision-platform-coexistence': decisionPlatformCoexistence,
  'decision-provider-fit': decisionProviderFit,
  'content-service-lanes': contentServiceLanes,
  'content-season-launches': contentSeasonLaunches,
  'method-identity-consent': methodIdentityConsent,
  'method-migration-reconcile': methodMigrationReconcile,
  'content-day-release-cycle': contentDayReleaseCycle,
  'content-day-live-library': contentDayLiveLibrary,
  'content-live-chat': contentLiveChat,
  'content-measure-formulas': contentMeasureFormulas,
  'decision-diagnosis-verdict': decisionDiagnosisVerdict,
  'method-waves': methodWaves,
  'content-day-live-console': contentDayLiveConsole,
  'content-day-live-approval': contentDayLiveApproval
}
