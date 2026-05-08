# ISSUE-070 — Finance Clients page caía silenciosamente a legacy por validación estricta del resolver canónico

## Ambiente

staging + production (post TASK-613 deploy)

## Detectado

2026-05-08 — Julio Reyes (pilot user V1.1) reportó que después de activar el flag `organization_workspace_shell_finance` con `scope=user`, seguía viendo el legacy `<ClientDetailView />` en lugar del shell V2. Verificación visual: header con solo "ANAM" + ID, 3 KPIs flat, 4 sub-tabs sin facets — sin chrome del shell.

## Síntoma

`/finance/clients/<id>` con flag user-scope `enabled=true` para Julio devolvía legacy view en lugar del shell V2. Server logs sin errores visibles. Reliability signals todos verdes. Test Playwright verde. Sólo el operador notaba la divergencia visual.

## Causa raíz

En el page server `src/app/(dashboard)/finance/clients/[id]/page.tsx` (TASK-613 Slice 2), el código pasaba el URL `[id]` como **los 4 shapes simultáneamente** al resolver canónico:

```ts
// Anti-patrón — el code original:
const finance = await resolveFinanceClientContext({
  clientProfileId: id,
  organizationId: id,
  clientId: id,
  hubspotCompanyId: id
}).catch(error => {
  captureWithDomain(error, 'finance', { ... })
  return null
})
```

`resolveFinanceClientContext` valida estrictamente cada shape pasado: si pasás `hubspotCompanyId="hubspot-company-27776076692"`, el resolver verifica que ese valor exista en la columna `hubspot_company_id` de DB. Pero la columna real tiene `"27776076692"` (sin prefix). La validación falla → `FinanceValidationError` → catch → `return null` → page cae a legacy.

Mismo problema con `organizationId`: el ID URL `"hubspot-company-27776076692"` no matchea ninguna `organization_id` real (que tienen formato `"org-f6aa4e20-..."`).

**Por qué pasó desapercibido**: el catch silencioso a legacy fallback es zero-risk para el rollout V1 (default OFF), pero en V1.1 cuando se activó el flag para Julio, el comportamiento esperado era ver el shell V2. El catch ocultó el error de validación del operador y de los reliability signals (eran throws de validación, no de connection/data).

**Por qué el resolver es estricto**: `resolveFinanceClientContext` se diseñó para WRITE paths (registrar income/expense) donde pasás los shapes que ya conocés y el resolver verifica consistencia. Si pasás `hubspotCompanyId` que no existe en DB, eso es un bug del caller — el throw es correcto en write context.

## Impacto

**Funcionalidad afectada**: TASK-613 V1.1 pilot rollout. Julio (único pilot user) no podía validar el shell V2.

**Para quién**: cualquier futuro pilot user del shell, y cualquier surface READ-only que reciba URL `[id]` y use `resolveFinanceClientContext` directamente con el patrón "pass-all-shapes". A partir de V2 (role=efeonce_admin, ~1 semana), todo internal admin habría visto legacy en lugar del shell — potencialmente hubiera pasado desapercibido durante semanas.

**Magnitud**: blocker para validación operativa del shell V2 (no para datos).

## Solución

### Fix raíz — separar contratos canónicos de READ vs WRITE paths

En `src/lib/finance/canonical.ts` se introdujo un helper canónico nuevo:

```ts
export const findFinanceClientContextByLookupId = async (
  lookupId: string
): Promise<ResolvedFinanceClientContext | null>
```

**Contrato**:

- **Prefix-aware**: detecta el shape canónico según prefijo de URL conocido:
  - `org-...` → `organizationId`
  - `hubspot-company-...` o `client-profile-...` → `clientProfileId`
  - sin prefix → intenta `clientProfileId` → `organizationId` → `clientId` en orden de prioridad
- **No-throw**: catchea `FinanceValidationError` y devuelve `null`. NO propaga errores de validación a callers de READ paths.
- **Propaga errores no-validation**: si PG cae u otro error infraestructural, sí throw para que el caller decida (capture domain + degradar a legacy).

**Por qué es canónico, NO parche**:

| Pillar | Cumplimiento |
|---|---|
| Safety | No-throw garantiza que callers READ no crashean por validación. Errores reales (PG down) sí propagan. |
| Robustness | Maneja todas las convenciones de URL conocidas + fallthrough explícito. |
| Resilience | Cada intento de shape es independiente — si un shape fail, prueba el siguiente. Devuelve null en miss → legacy fallback honesto. |
| Scalability | Nuevo prefix = 1 línea. Reusable cross-surface (futuras: `/edit`, `/quotes/`, etc.). Worst-case 3 PG roundtrips por URL inexistente. |

**Diferenciación de contratos**:

| Contexto | Helper | Validación |
|---|---|---|
| WRITE (registrar pago, factura) | `resolveFinanceClientContext` | **Estricta** — previene drift al escribir |
| READ (renderear detail desde URL) | `findFinanceClientContextByLookupId` | **Lenient + prefix-aware** |

NO se modifica `resolveFinanceClientContext` (load-bearing en write paths). NO se mezcla la responsabilidad.

### Update page.tsx

`src/app/(dashboard)/finance/clients/[id]/page.tsx` ahora usa `findFinanceClientContextByLookupId(id)` en lugar de pasar 4 shapes a `resolveFinanceClientContext`.

### Anti-regresión

8 tests Vitest en `src/lib/finance/canonical.test.ts` (sección `findFinanceClientContextByLookupId — ISSUE-070 fix`):

- `org-` prefix resuelve como organizationId
- `hubspot-company-` prefix resuelve como clientProfileId
- `client-profile-` prefix resuelve como clientProfileId
- ID sin prefix conocido prueba múltiples shapes
- ID inexistente devuelve null sin throw
- Input vacío devuelve null sin tocar PG
- `FinanceValidationError` NO se propaga (degradación honesta)
- Errores no-validation (PG down) SÍ se propagan

## Verificación

1. ✅ Tests Vitest 14/14 verdes en `canonical.test.ts`.
2. ✅ TypeScript check clean.
3. ⏳ Push a develop → Vercel deploy.
4. ⏳ Verificar Julio ve shell V2 al refrescar `/finance/clients/<id>`.
5. ⏳ Reliability signals siguen verdes.
6. ⏳ Playwright smoke verde.

## Estado

resolved (2026-05-08)

## Relacionado

- TASK-613 (Finance Clients → Organization Workspace convergence) — el page Slice 2 introdujo el anti-patrón.
- TASK-611 (Organization Workspace Projection) — la projection Subjet usa el `userId` correctamente; el bug era en el lookup previo.
- TASK-780 (Home Rollout Flag Platform) — el flag V1.1 estaba correctamente activado, el bug era downstream.
- Archivo canónico: `src/lib/finance/canonical.ts` (función `findFinanceClientContextByLookupId`).
- Test anti-regresión: `src/lib/finance/canonical.test.ts` describe block "findFinanceClientContextByLookupId — ISSUE-070 fix".
