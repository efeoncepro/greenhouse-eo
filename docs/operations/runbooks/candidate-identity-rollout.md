# Runbook — Rollout de la identidad del intake de candidatos (canary → prod → remediación)

> **Tipo de documento:** Runbook operativo
> **Task dueña:** `TASK-1736` (Slice 4) · **ADR:** `docs/architecture/GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1.md`
> **Creado:** 2026-08-16 (Claude, Slice 4 code-only)
> **Estado (2026-08-18):** flag **ON en staging y en Production** (release `fa54670470c1`); remediación
> histórica **ejecutada** el 2026-08-16 (3 personas reales); **canary EJECUTADO el 2026-08-18** con los 5
> puntos del Paso 2 verdes contra PG real — ver §Canary ejecutado. Queda pendiente **purgar el residuo del
> canary**, bloqueado por la credencial `greenhouse_ops` (mismo bloqueo que `ISSUE-159`).

## Para qué sirve

Ejecutar el flip del writer nuevo de identidad de candidatos (evidencia application-scoped +
reconciliación de display CAS) y la remediación histórica gobernada, sin improvisar comandos. El
flag es **Vercel-only** (ningún Cloud Run lo lee) y **default OFF**; la remediación por allowlist
es un acto humano independiente del flag (ADR D4: el flag por sí solo jamás autoriza backfill).

## Antes de empezar

- Leer el ADR — en especial D3 (precondiciones del reconcile), D4 (remediación) y las Hard rules.
- Read-sites del flag `HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED` (verificado por grep):
  `src/lib/hiring/candidate-intake/config.ts`, consumido por `submitPublicHiringApplication` y por
  la señal `hiring.candidate_identity.evidence_coverage_gap`. **Solo Vercel.**
- Verificar estado live ANTES de tocar nada (nunca confiar en docs):

```bash
vercel env ls --scope efeonce-7670142f | grep HIRING_CANDIDATE_IDENTITY
```

- La migración `20260816203411170_task-1736-candidate-identity-evidence.sql` ya está aplicada
  (dev/staging/prod comparten `greenhouse-pg-dev`). Para un environment fresco: `pnpm pg:connect:migrate`.

## Secuencia de rollout

### Paso 1 — Flip en staging

```bash
vercel env add HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED staging --scope efeonce-7670142f   # valor: true
# Redeploy de staging para calentar la env (las env de Vercel no calientan solas)
```

### Paso 2 — Canary: postulación sintética con nombre degenerado

> ⚠️ **NO postular contra una vacante real.** Ejecutar este canary por el endpoint público contra
> `EO-OPN-0009` / `EO-OPN-0061` mete un candidato falso en el pipeline de una vacante VIVA (al
> 2026-08-18 llevaban 15 y 33 candidatos en proceso) y dispara el aviso interno a People. Y como la
> evidencia es **append-only por grant**, ese candidato falso **no se puede borrar** con el perfil
> runtime: queda pinneado por FK hasta que un humano corra la purga con `ops`. La base es **una sola,
> compartida por dev, staging y producción**.

**Carril canónico del canary** — live test gobernado sobre una vacante desechable propia:

```bash
set -a && . ./.env.local && set +a
HIRING_CANARY_T1736=1 pnpm vitest run src/lib/hiring/candidate-intake/canary.live.test.ts
```

Es opt-in a propósito (`HIRING_CANARY_T1736=1`): sin esa variable el archivo se salta. Ejercita el
MISMO command canónico (`submitPublicHiringApplication`), que es la única puerta que comparten las
DOS entradas públicas (Careers custom y Growth Forms nativo) — la paridad de entradas queda cubierta
por construcción, sin duplicar la postulación. Crea su propia vacante sintética, la despublica en el
teardown y purga sus eventos de outbox de inmediato para que **no salga ningún correo**.

Verificar en DB (read-only, `pnpm pg:connect:shell`):

1. **Evidencia**: fila nueva en `greenhouse_hiring.candidate_identity_intake_evidence` con
   `submitted_full_name` EXACTO a lo escrito (raw intacto), `casing_classification='degenerate_lower'`
   y `proposed_display_name` capitalizado.
2. **Reconcile**: `greenhouse_core.identity_profiles.full_name` quedó con el display propuesto
   (p. ej. `Canario Sintetico`) y NO el verbatim.
3. **Audit**: fila en `greenhouse_hiring.candidate_identity_display_audit` con `source='reconcile'`
   y `outcome='applied'` (o `skipped/needs_review` con su reason code si la Person ya existía).
4. **Caso identity preexistente**: repetir el submit con el mismo email y otro casing — no duplica
   Person; el audit registra el outcome del CAS (nunca last-write-wins).
5. **Idempotencia**: re-submit idéntico ⇒ cero filas nuevas de evidencia (dedupe por digest).

#### Residuo del canary (leer ANTES de correrlo)

Con el flag ON el canary escribe en dos tablas **append-only por grant**
(`candidate_identity_intake_evidence` y `candidate_identity_display_audit`): `greenhouse_runtime`
**no tiene DELETE** sobre ellas por diseño. Esas filas **pinnean por FK** toda la cadena
—application → candidate_facet → Person → opening → talent_demand— así que **el canary no puede
limpiarse a sí mismo**. El teardown despublica la vacante (lo único que importa hacia afuera) y
reporta por consola el residuo exacto:

```
[CANARY TASK-1736] RESIDUO NO PURGADO — requiere perfil `ops` (acto humano):
  identity_profile_id: …   application_id(s): …   opening_id: … (despublicado)   demand_id: …
```

Retirarlo es un **acto humano con el perfil `ops`**, en el mismo orden FK: evidencia → audit →
application → facet → Person → opening → demand. El script `pnpm hiring:candidates:purge-test-facets`
**no sirve acá**: exige cero postulaciones y consentimiento `not_captured`, y este sujeto tiene una
postulación con consentimiento `granted`.

#### Canary ejecutado — 2026-08-18

Los 5 puntos verdes contra PG real (4/4 tests). Evidencia observada: `submitted_full_name` con el raw
EXACTO, `casing_classification='degenerate_lower'`, propuesta capitalizada; `identity_profiles.full_name`
quedó con el display propuesto y no con el verbatim; audit `source='reconcile'` / `outcome='applied'`;
el re-submit en MAYÚSCULAS no duplicó Person y registró el outcome del CAS; el re-submit idéntico no
agregó evidencia. **Cero correos** emitidos (verificado en `email_deliveries`) y el listado público
volvió a tener exactamente las 2 vacantes reales.

Residuo pendiente de purga con `ops` (bloqueado por la misma credencial que `ISSUE-159`):

| Objeto | Id |
|---|---|
| Person sintética | `identity-public-careers-candidate-canary-t1736-1787066079713-live-test-invalid` |
| Application | `happ-ffebd53b-a76d-435a-95bd-538838a52db4` |
| Opening (**ya despublicado**, `internal_only`) | `opng-ef6e58c2-7b63-4549-9e31-4239edaaac2e` (`EO-OPN-0101`) |
| Evidencia / audit | 2 filas / 3 filas de esa Person |

### Paso 3 — Flip en producción

Solo con el canary de staging verde y `evidence_coverage_gap` en `ok`:

```bash
vercel env add HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED production --scope efeonce-7670142f   # valor: true
# Redeploy de production
```

Cooldown 24 h vigilando las señales (sección siguiente) antes de la remediación histórica.

### Paso 4 — Remediación histórica con el CLI (independiente del flag)

Manual completo: `docs/manual-de-uso/hr/operar-remediacion-nombres-candidatos.md`. Resumen:

```bash
# 1. Dry-run (read-only)
pnpm hiring:candidates:remediate-display

# 2. Emitir allowlist (archivo local GITIGNOREADO — contiene PII)
pnpm hiring:candidates:remediate-display --emit-allowlist ./task-1736.candidate-remediation-allowlist.json

# 3. Revisar/podar línea a línea (caso real 2026-08-16 EJECUTADO: lote de 3 personas reales;
#    los perfiles QA se PODARON a mano — remediar un perfil sintético es ruido, no valor)

# 4. Apply con actor + reason (lotes de 1, CAS + audit)
pnpm hiring:candidates:remediate-display --apply \
  --allowlist ./task-1736.candidate-remediation-allowlist.json \
  --actor <user-id> --reason "TASK-1736 remediación casing histórico"
```

El apply aborta solo si `applied + already_canonical != expected` (CAS/searchKey detectó cambios en
DB o corrección humana nueva). El **retry de un apply exitoso es idempotente**: los
`skipped (already_canonical)` cuentan como estado prometido y el comando sale con exit 0.
Verificación post-apply: readback de `full_name` de cada identidad remediada + filas
`reconcile/applied` en el audit (con `actor_user_id` y el motivo del apply persistidos) +
`needs_review_backlog` sin crecer.

## Verificación por señales

Dashboard: `/admin/operations` (módulo **Hiring / ATS**). Readers:
`src/lib/reliability/queries/hiring-candidate-identity-signals.ts`.

| Señal | Steady | Alerta significa |
|---|---|---|
| `hiring.candidate_identity.needs_review_backlog` | 0 | derivaciones a humano sin resolver (warning 1-5; error >5) ⇒ drenar con el command de corrección (capability `hiring.candidate.correct_display`), nunca SQL |
| `hiring.candidate_identity.evidence_coverage_gap` | 0 (flag ON) / `ok` con nota (flag OFF) | applications nuevas sin fila de evidencia con flag ON = silent-skip del write path ⇒ revisar Sentry dominio `hiring` + repetir canary |

## Rollback

- **Flag OFF + redeploy** (staging y/o production): el intake vuelve al comportamiento previo en
  <15 min; las filas de evidencia/audit quedan **inertes y auditables** (aditivas, jamás se borran).
- **Las correcciones ya aplicadas se CONSERVAN por diseño**: el modelo es append-only y la
  evidencia raw de cada aplicación permite reconstruir todo. Si un display remediado debe volver a
  su valor anterior, se revierte **por registro** con el subcomando real del CLI (CAS del
  before-value exacto del audit `reconcile/applied`) — nunca un UPDATE masivo:

  ```bash
  # 1. Ubicar el audit_id del apply a revertir (read-only, pnpm pg:connect:shell):
  #    SELECT audit_id, before_full_name, after_full_name, created_at
  #      FROM greenhouse_hiring.candidate_identity_display_audit
  #     WHERE identity_profile_id = '<profile-id>' AND source='reconcile' AND outcome='applied'
  #     ORDER BY created_at DESC;

  # 2. Rollback per-record (CAS: sólo si el full_name vigente sigue siendo el after de ese apply)
  pnpm hiring:candidates:remediate-display --rollback <auditId> \
    --actor <user-id> --reason "TASK-1736 rollback: <motivo>"
  ```

  El rollback queda registrado como **corrección humana** (`source='human'` en el audit) — bloquea
  automatismos futuros sobre esa identidad, deliberado. Si el `full_name` vigente ya no es el
  `after` de ese apply (re-submit o corrección posterior), el comando reporta
  `needs_review (rollback_cas_mismatch)` **sin mutar** y sale con exit 1: resolver caso a caso con
  el command de corrección humana. Un apply nacido de display vacío (`empty_display_filled`) no es
  restaurable a vacío (`rollback_before_value_unavailable`): también va a corrección humana.
- La remediación en curso se detiene sola ante cualquier drift (`countMatchesExpected=false` aborta).

## Qué NO hacer

- NO ejecutar el apply histórico sin dry-run vigente + allowlist revisada línea a línea (el lote de 3
  de 2026-08-16 es historia, no contrato — regenerar siempre).
- NO remediar perfiles sintéticos/QA: podarlos de la allowlist.
- NO tocar `identity_profiles.full_name` con SQL manual — la única puerta es
  `reconcileCandidateIdentityDisplayName` (CAS + audit).
- NO pegar el output del dry-run/allowlist (contiene nombres) en logs compartidos, issues ni chat.
- NO asumir que prender el flag autoriza el backfill: son actos independientes (ADR D4).

## Problemas comunes

- **`evidence_coverage_gap` en warning recién prendido el flag** → la ventana de 24 h puede incluir
  applications previas al flip; confirmar con el canary y re-mirar tras el cooldown.
- **Apply reporta `needs_review (allowlist_version_drift)`** → la policy cambió de versión desde el
  dry-run: regenerar dry-run + allowlist.
- **Apply reporta `skipped (human_correction_present)`** → alguien corrigió a mano entre dry-run y
  apply; la corrección humana gana — no reintentar.
- **`needs_review_backlog` crece tras el flip** → intakes con discrepancia sustantiva de nombre
  (posible cambio real/homónimo): resolver una a una con el command de corrección humana.

## Referencias

- Spec: `docs/tasks/in-progress/TASK-1736-candidate-identity-intake-canonicalization-remediation.md` (§Rollout Plan)
- ADR: `docs/architecture/GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1.md`
- Ledger de flags: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- CLI: `scripts/hiring/remediate-candidate-display-names.ts` (`pnpm hiring:candidates:remediate-display`)
- Manual: `docs/manual-de-uso/hr/operar-remediacion-nombres-candidatos.md`
- Señales: `src/lib/reliability/queries/hiring-candidate-identity-signals.ts`
