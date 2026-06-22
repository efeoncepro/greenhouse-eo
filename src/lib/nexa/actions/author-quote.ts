import 'server-only'

import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

import {
  submitQuoteFromBuilder,
  type SubmitQuoteFromBuilderResult
} from '@/lib/commercial/submit-quote-from-builder'
import {
  submitQuoteFromBuilderPayloadSchema,
  type SubmitQuoteFromBuilderPayload
} from '@/lib/commercial/submit-quote-from-builder-schema'

import { isNexaActionRuntimeEnabled, isNexaQuoteAuthorActionEnabled } from '../flags'
import type {
  NexaActionContext,
  NexaActionDefinition,
  NexaActionExecutionResult,
  NexaActionPreviewResult
} from './types'

/**
 * TASK-1212 — Governed action de AUTORÍA/EMISIÓN de cotización (`author_quote`).
 *
 * Primera acción PARAMETRIZADA del runtime gobernado de Nexa: el LLM PROPONE un payload de
 * autoría (validado por el MISMO Zod schema que las rutas Product-API), el humano ve un preview
 * read-only y confirma, y el endpoint de confirmación ejecuta el command canónico
 * `submitQuoteFromBuilder` — la ÚNICA mutación. El LLM nunca escribe directo.
 *
 * Un primitive, muchos consumers: UI (Slice 2), rutas y esta acción consumen el MISMO command.
 * No hay nada "Nexa-específico". La idempotencia la provee la foundation de command (TASK-655) del
 * confirm endpoint; por eso el command NO recibe `idempotencyKey` desde aquí (evita doble-claim
 * sobre `api_platform_command_executions` con el mismo principal+key).
 */

const buildSubjectFromContext = (context: NexaActionContext): TenantEntitlementSubject => ({
  userId: context.userId,
  tenantType: context.tenantType,
  roleCodes: context.roleCodes,
  primaryRoleCode: context.roleCodes[0] ?? '',
  routeGroups: context.routeGroups,
  authorizedViews: [],
  memberId: context.memberId
})

export const authorQuoteAction: NexaActionDefinition<SubmitQuoteFromBuilderPayload> = {
  actionKey: 'author_quote',
  intent: 'Crear o emitir una cotización',
  sensitivity: 'high',
  // Dominio del frente Q2C; comparte governed-action surface con el close (TASK-1206).
  domain: 'commercial-q2c',
  requiredCapability: 'commercial.quotation',
  inputSchema: submitQuoteFromBuilderPayloadSchema,
  isEnabled: () => isNexaActionRuntimeEnabled() && isNexaQuoteAuthorActionEnabled(),
  // Gate síncrono: autorar requiere `commercial.quotation` create. La emisión (approve) y todos los
  // invariantes de datos los re-enforza el command en el confirm — esto es defensa adelantada.
  isPermitted: (context: NexaActionContext) =>
    Boolean(context.userId) && can(buildSubjectFromContext(context), 'commercial.quotation', 'create', 'tenant'),
  async buildPreview(
    _context: NexaActionContext,
    input: SubmitQuoteFromBuilderPayload
  ): Promise<NexaActionPreviewResult> {
    const willIssue = input.issueAfterSave
    const lineCount = input.lines.length
    const verb = input.mode === 'create' ? 'crear' : 'actualizar'
    const issueClause = willIssue ? ' y emitirla' : ''

    return {
      title: willIssue ? 'Crear y emitir cotización' : 'Guardar cotización',
      summary:
        `Al confirmar, voy a ${verb} una cotización en ${input.header.currency} con ${lineCount} ` +
        `línea${lineCount === 1 ? '' : 's'}${issueClause}. El precio lo calcula el motor de pricing ` +
        `(no honra precios manuales de catálogo).`,
      metrics: [
        { label: 'Acción', value: input.mode === 'create' ? 'Crear' : 'Actualizar' },
        { label: 'Moneda', value: input.header.currency },
        { label: 'Líneas', value: String(lineCount) },
        { label: 'Emitir', value: willIssue ? 'Sí' : 'No (borrador)' }
      ]
    }
  },
  async execute(
    context: NexaActionContext,
    input: SubmitQuoteFromBuilderPayload
  ): Promise<NexaActionExecutionResult> {
    const result: SubmitQuoteFromBuilderResult = await submitQuoteFromBuilder({
      ...input,
      subject: buildSubjectFromContext(context),
      actor: { userId: context.userId, name: context.userId }
      // Sin idempotencyKey: la idempotencia la provee el confirm endpoint (TASK-655).
    })

    const summary =
      result.finalState === 'issued'
        ? `Listo: creé y emití la cotización (${result.lineCount} línea${result.lineCount === 1 ? '' : 's'}).`
        : result.finalState === 'pending_approval'
          ? `Creé la cotización y la mandé a aprobación (${result.lineCount} línea${result.lineCount === 1 ? '' : 's'}).`
          : `Listo: guardé la cotización como borrador (${result.lineCount} línea${result.lineCount === 1 ? '' : 's'}).`

    return {
      ok: true,
      summary,
      metrics: [
        { label: 'Estado', value: result.finalState },
        { label: 'Líneas', value: String(result.lineCount) }
      ],
      raw: { quotationId: result.quotationId, operationId: result.operationId, finalState: result.finalState }
    }
  },
  confirmation: {
    title: 'Confirmar cotización',
    body: 'Voy a escribir esta cotización en el sistema. Revisa el resumen antes de confirmar.',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar'
  },
  deepLinkFallback: '/finance/quotes/new',
  expirationSeconds: 300
}
