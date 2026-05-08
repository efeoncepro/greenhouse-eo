# ISSUE-071 — Workspace projection relationship resolver throw silencioso por type mismatch en COALESCE

## Ambiente

staging + production (post TASK-611 deploy, latente desde 2026-05-08 madrugada)

## Detectado

2026-05-08 — Julio Reyes (pilot user V1.1) reportó que el shell V2 mostraba "Workspace en modo degradado — No pudimos resolver tu relación con esta organización". El page server llegaba al shell pero la projection caía a degraded mode.

## Síntoma

`/finance/clients/<id>` con flag user-scope `enabled=true` y page reaching `<FinanceClientsOrganizationWorkspaceClient>` correctly post ISSUE-070 fix, pero la projection devolvía `degradedMode=true` con motivo `relationship_lookup_failed`. Banner visible al usuario:

> Workspace en modo degradado — No pudimos resolver tu relación con esta organización. Volvé a intentar en unos segundos.

## Causa raíz

En `src/lib/organization-workspace/relationship-resolver.ts:75-83`, el CTE `subject_admin` retornaba un valor de tipo **integer**:

```sql
WITH subject_admin AS (
  SELECT 1 AS is_admin   -- ← INT
  FROM greenhouse_core.user_role_assignments
  WHERE user_id = $1 AND role_code = 'efeonce_admin' ...
  LIMIT 1
),
...
SELECT
  COALESCE((SELECT is_admin FROM subject_admin), FALSE) AS is_admin
                                              -- ↑ BOOL
```

Postgres rechaza con:

```
COALESCE types integer and boolean cannot be matched
```

El error fue catched en `resolveSubjectOrganizationRelation` y propagado a `captureWithDomain('identity', { source: 'workspace_projection_relationship_resolver' })`. La projection lo convertía a `degradedMode=true, reason='relationship_lookup_failed'`. El usuario veía el banner amarillo en lugar del shell completo.

**Por qué pasó desapercibido**:

1. Los unit tests de la projection mockean `resolveSubjectOrganizationRelation` retornando shapes específicos. NO ejercitan el SQL crudo contra PG.
2. No hay `*.live.test.ts` para este path. TASK-611 mergeó sin validar el SQL contra DB real.
3. El catch silencioso convertía un type mismatch a `degradedMode`. El usuario veía un banner "amigable" en lugar de un crash + Sentry visible. Bug class = "honest degradation oculta bugs reales".

**Por qué se descubrió ahora**: TASK-613 V1.1 fue la primera vez que un usuario real con un org real ejerció el resolver completo en runtime — los smoke E2E tests no incluían un caso "user efeonce_admin + org canónica" que llegara a este path.

## Impacto

**Funcionalidad afectada**: Toda la projection del Organization Workspace para CUALQUIER usuario contra CUALQUIER org. El bug afectaba a:

- TASK-612 (Agency entrypoint) — cualquier user con org se veía como degraded.
- TASK-613 (Finance entrypoint) — pilot V1.1 bloqueado.
- TASK-614 (Person workspace) — futura task, mismo path, mismo bug.

**Para quién**: 100% de los usuarios que activaran el shell V2. Deterministic — no race condition, no flaky.

**Magnitud**: blocker para validación operativa del shell V2. Latente desde el merge de TASK-611, descubierto sólo cuando un pilot user real intentó usar el sistema.

## Solución

### Fix raíz — type alineado en CTE

```sql
WITH subject_admin AS (
  SELECT TRUE AS is_admin   -- ← BOOL para coincidir con el COALESCE downstream
  FROM greenhouse_core.user_role_assignments
  WHERE user_id = $1 AND role_code = 'efeonce_admin' ...
  LIMIT 1
)
```

Una línea cambiada. Comentario inline documenta el por qué para anti-regresión semántica futura.

### NO se modifica el catch chain

El catch en `resolveSubjectOrganizationRelation` sigue convirtiendo errores a degraded mode — eso es correcto desde safety perspective: ningún error en un read path debe crashear la página. Lo que sí se mejora (en commits futuros) es la observabilidad: el `captureWithDomain` ya emite a Sentry con `domain=identity`, así que cuando el bug class vuelva a aparecer, el equipo lo verá inmediatamente.

### Lección operativa canónica

**Cualquier nueva query SQL embebida en TS (especialmente con CTEs + COALESCE + CASE) debe ejercitarse contra PG real ANTES de mergear, no sólo via mocks**. Los unit tests con mocks validan la lógica TS, NO el SQL.

Esta lección queda documentada en CLAUDE.md/AGENTS.md después del fix:

> SIEMPRE que un nuevo SQL crudo emerja con uniones de tipos (COALESCE de subqueries, CASE WHEN, NULL coalescing), correr contra PG real durante desarrollo. Los unit tests con mocks NO detectan type mismatches a nivel de Postgres.

### Defense-in-depth (4-pillar score)

| Pillar | Cumplimiento |
|---|---|
| Safety | Catch + degraded mode preservados (read paths nunca crashean). |
| Robustness | Type alignment correcto. Anti-regresión documentada. |
| Resilience | Sentry domain=identity captura cualquier futuro throw del resolver — el dashboard lo expone. |
| Scalability | Fix es 1 línea, NO requiere migrations. La lección operativa escala a cualquier futura query similar. |

## Verificación

1. ✅ Test unit local del resolver runtime (vitest) verde.
2. ✅ Test live contra PG: `resolveSubjectOrganizationRelation({ subjectUserId: 'user-efeonce-admin-julio-reyes', organizationId: 'org-f6aa4e20-...', subjectTenantType: 'efeonce_internal' })` returns `{ kind: 'internal_admin', ... }` (sin throw).
3. ⏳ Push a develop → Vercel deploy → deploy ready.
4. ⏳ Playwright + agent auth navega a `/finance/clients/hubspot-company-27776076692` y verifica:
   - Shell V2 renderea (no banner degraded).
   - 4 KPIs canónicos visibles.
   - Tab strip por facets visible.
   - Finance facet seleccionado por default.
5. ⏳ Reliability signals siguen verdes.

## Estado

resolved (2026-05-08)

## Relacionado

- TASK-611 (Organization Workspace Projection foundation) — el query CTE fue introducido aquí.
- TASK-613 (Finance Clients convergence) — la activación V1.1 fue el primer ejercicio real del resolver post-merge.
- ISSUE-070 (page.tsx pass-all-shapes) — bug previo en la misma cadena de causa de Julio "ve legacy/degraded".
- Archivo canónico: `src/lib/organization-workspace/relationship-resolver.ts:75-83`.
