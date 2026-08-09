# TASK-1681 — Que el batch policy deje de contar comentarios como cambios de dominio

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El `release_batch_policy` clasifica los archivos de un release **por path**, no por contenido del diff.
Un cambio de comentario en `src/lib/entitlements/` cuenta igual que otorgar un permiso. Esta task hace
que un dominio irreversible no cuente cuando todos sus archivos cambiaron sólo comentarios o son
archivos generados.

## Why This Task Exists

Medido sobre los 8 releases del historial (2026-07-30 → 2026-08-09): **6 pidieron break-glass, y de
esos sólo 1 fue ruido**. El gate acierta en la mayoría — cuatro tenían migraciones reales o payroll.

Ese uno es el release `49f86c98cda6` del 2026-08-09, marcado por `auth_access` porque tocó
`entitlements-catalog.ts` y `runtime.ts`. El diff eran **cinco líneas de comentario** renombrando
`seo_v1` a `seo_v2` tras el contract del cutover. Cero cambio funcional de entitlements.

Vale registrar por qué esta task existe y por qué es P3: la alternativa evaluada era **relajar la
severidad** —que un solo dominio irreversible baje a `warning`—, y los datos la descartaron. Habría
bajado el break-glass de 75% a 50%, pero dejando pasar sin fricción un release con **tres
migraciones**: quita el freno justo donde más se necesita. El ruido no venía de la severidad sino de
la granularidad de la clasificación.

## Goal

- Un dominio irreversible cuyos archivos sólo cambiaron comentarios no dispara `requires_break_glass`.
- Los archivos generados (`src/types/db.d.ts`) dejan de contar como cambio de dominio.
- Los cuatro frenos legítimos del historial siguen disparando.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` (§check #4)
- `docs/operations/runbooks/production-release.md`

Reglas obligatorias:

- **Invocar la skill MANDATORIA `greenhouse-production-release`** antes de tocar cualquier check del preflight.
- **NUNCA** hacer el gate más permisivo para destrabar un release (anti-pattern #1 del playbook). Esta
  task mejora la **precisión**, no afloja el criterio: los cuatro frenos legítimos del historial deben
  seguir disparando después del cambio, y eso es criterio de aceptación.
- **NUNCA** relajar la severidad ante un dominio irreversible: evaluado con datos y descartado (ver §Why).

## Normative Docs

- `docs/tasks/complete/TASK-1676-release-preflight-truthful-gates-and-non-rotting-runbook.md` — dejó esta pregunta como Open Question
- `docs/issues/resolved/ISSUE-145-release-batch-policy-anchored-to-wrong-base-in-ci.md`

## Dependencies & Impact

### Depende de

- `src/lib/release/preflight/batch-policy/classifier.ts` y `domains.ts` — existen
- `src/lib/release/preflight/checks/release-batch-policy.ts` — el check que provee los archivos

### Impacta a

- Todo release futuro: cambia qué dispara break-glass
- `TASK-1678` / `TASK-1679`: sus releases tocan `src/lib/entitlements` con cambio **funcional**, así que
  seguirán —correctamente— pidiendo break-glass

### Files owned

- `src/lib/release/preflight/batch-policy/classifier.ts`
- `src/lib/release/preflight/batch-policy/domains.ts`
- `src/lib/release/preflight/checks/release-batch-policy.ts`
- Sus tests

## Current Repo State

### Already exists

- `classifyFileDomain` y `DOMAIN_PATTERNS` en `domains.ts` — clasifican por path
- `collectChangedFiles` en el check — usa `git diff --name-only`
- El evidence ya declara `diffBase` / `diffBaseSource` (TASK-1676)

### Gap

- El check pide `--name-only`, así que el classifier nunca ve el contenido del diff.
- `src/types/db.d.ts` está en `DOMAIN_PATTERNS` como `db_migrations` pese a ser un archivo **generado**
  por `kysely-codegen` en cada migración.
- No hay forma de distinguir "tocó entitlements" de "cambió un comentario en entitlements".

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/release/preflight/**`, ejecutado por el CLI y el job de preflight
- Future candidate home: `remain-shared`
- Boundary: el classifier sigue siendo puro; el check le pasa más información, no más responsabilidad
- Server/browser split: `n/a`
- Build impact: `none`
- Extraction blocker: `none`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — El check aporta el contenido, no sólo el nombre

- `collectChangedFiles` pasa a exponer, por archivo, si su diff toca líneas de código o sólo
  comentarios/documentación. Implementación sugerida: `git diff -U0` y evaluar las líneas `+`/`-`.
- El classifier sigue siendo **puro**: recibe el dato, no lo computa.

### Slice 2 — Un dominio irreversible sólo cuenta si cambió código

- Si todos los archivos que aportan un dominio irreversible cambiaron sólo comentarios, ese dominio no
  entra en `irreversibilityFlags`.
- El evidence declara cuáles se descartaron y por qué, para que la decisión sea auditable desde el
  `preflight-result.json`.

### Slice 3 — Los archivos generados no son cambio de dominio

- `src/types/db.d.ts` deja de clasificar como `db_migrations`.
- Test que fije que una migración real **sí** sigue clasificando.

### Slice 4 — Regresión contra el historial

- Test con los diffs reales de los 8 releases medidos: los 4 legítimos siguen disparando
  break-glass, y el release `49f86c98cda6` deja de hacerlo.
- Es el criterio que separa "mejorar la precisión" de "aflojar el gate".

## Out of Scope

- Relajar la severidad ante un dominio irreversible — evaluado con datos y descartado.
- Cambiar la lista `IRREVERSIBLE_DOMAINS`.
- Revisar si `cloud_release` pertenece a esa lista: es una pregunta legítima pero distinta, y merece su
  propia discusión (ver §Open Questions).

## Detailed Spec

**Por qué el classifier no debe computar el contenido.** Hoy es una función pura y sus tests son
triviales de escribir, que es parte de por qué el fix de `ISSUE-114` pudo verificarse. Meterle
ejecución de `git` adentro lo convertiría en algo que hay que mockear para probar. El check ya hace
I/O; que siga haciéndolo él.

**Qué cuenta como "sólo comentarios".** Un diff donde todas las líneas agregadas y quitadas, después de
recortar espacios, empiezan con `//`, `*`, `/*` o `#`, o son líneas vacías. Es deliberadamente
conservador: ante la duda, cuenta como código y el gate frena. Un falso freno cuesta una frase escrita;
un falso paso puede costar un rollback manual.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 antes que 2 (el 2 consume el dato del 1).
- Slice 4 al final: es la red que prueba que no se aflojó nada.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| El gate deja pasar un cambio funcional leído como comentario | Release | Baja | Heurística conservadora: ante la duda cuenta como código. Slice 4 lo verifica contra 8 releases reales | `preflight-result.json` del siguiente release |
| Se convierte en la puerta para aflojar el gate | Gobernanza | Media | Criterio de aceptación explícito: los 4 frenos legítimos siguen disparando | Diff de `IRREVERSIBLE_DOMAINS`: si cambia, se salió del alcance |
| El parseo del diff falla y el check queda `unknown` | Release | Baja | El check ya degrada a `unknown` ante error de git, y `unknown` no aprueba (TASK-1676) | severidad del check |

### Feature flags / cutover

`N/A — cambio de un gate de solo lectura, sin runtime de producto.` El peor caso es visible en el
propio artefacto del preflight. Rollback: revert del PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | revert PR | <5 min | sí |
| 2 | revert PR | <5 min | sí |
| 3 | revert PR | <5 min | sí |
| 4 | Nada que revertir: sólo agrega tests | — | sí |

### Production verification sequence

En el release siguiente, leer el `preflight-result.json` del orquestador: si hay un dominio irreversible
descartado por ser sólo comentarios, debe aparecer declarado en el evidence, no desaparecido en silencio.

### Out-of-band coordination required

Ninguna.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un dominio irreversible cuyos archivos sólo cambiaron comentarios no dispara `requires_break_glass`.
- [ ] `src/types/db.d.ts` no clasifica como `db_migrations`; una migración real sí.
- [ ] El evidence declara qué dominios se descartaron y por qué.
- [ ] Los 4 releases del historial con migraciones o payroll reales **siguen** disparando break-glass.
- [ ] El release `49f86c98cda6` deja de dispararlo.
- [ ] `IRREVERSIBLE_DOMAINS` no cambió.
- [ ] El classifier sigue siendo una función pura.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/release/`
- `pnpm release:preflight --target-sha=<sha> --target-branch=main` contra un batch real

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si cambia lo que el operador ve en el preflight
- [ ] §check #4 de `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` actualizado
- [ ] Ambas skills `greenhouse-production-release` (`.claude` + `.codex`) actualizadas y byte-idénticas
- [ ] la Open Question de `TASK-1676` sobre la severidad queda cerrada con el rationale de esta task

## Follow-ups

- `azure_wif_subject` falla abierto: ante `Insufficient privileges` devuelve `severity: 'ok'` sin haber podido listar las federated credentials. Sigue sin dueño desde `ISSUE-145`.

## Open Questions

1. ¿`cloud_release` pertenece a `IRREVERSIBLE_DOMAINS`? El argumento del código es que un cambio de workflow puede romper el propio rollback. Es real, pero de segundo orden comparado con una migración destructiva o un pago ejecutado. En el historial medido, un release lo disparó por sí solo (`b99b7ad97`, el fix del preflight). Queda fuera del alcance a propósito: sacarlo de la lista es aflojar el gate, y eso merece su propia discusión con datos, no un cambio de paso.
