# Operar la Remediación de Nombres de Candidatos

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-08-16 por Claude (TASK-1736 Slice 4)
> **Ultima actualizacion:** 2026-08-17 por Claude (cierre del programa — remediacion EJECUTADA 2026-08-16, 3 personas reales)
> **Documentacion tecnica:** [identidad-de-candidatos-intake](../../documentation/hr/identidad-de-candidatos-intake.md) · runbook [candidate-identity-rollout](../../operations/runbooks/candidate-identity-rollout.md)

## Para qué sirve

Reparar los nombres de candidatos que quedaron guardados "degenerados" (todo en minúsculas o todo
en mayúsculas, como `valentina villa`) **antes** de que existiera la normalización automática. El
proceso es gobernado: nada se cambia sin que un humano revise y apruebe cada caso, todo queda
auditado y todo es reversible registro por registro.

Este manual NO cubre el encendido del sistema nuevo de intake (eso es el runbook
`docs/operations/runbooks/candidate-identity-rollout.md`). La remediación es **independiente del
flag**: no necesita que esté prendido y el flag por sí solo jamás la autoriza.

## Antes de empezar

- Necesitas acceso local al repo con conexión a PostgreSQL (`pnpm pg:connect` funcionando).
- Ten claro tu `user-id` de operador (será el `--actor` del apply, queda en la auditoría).
- **El output contiene nombres reales (PII)**: solo se mira en tu terminal local y en el archivo
  de allowlist gitignoreado. Jamás pegarlo en issues, chat, logs compartidos ni capturas.

## Paso a paso

### 1. Dry-run (solo lectura)

```bash
pnpm hiring:candidates:remediate-display
```

Imprime cuántos perfiles de candidato hay, cómo clasifica cada nombre la política vigente, cuántos
quedan excluidos por tener corrección humana previa, y la lista de propuestas
(`"antes" → "propuesto"`). No escribe nada en la base.

### 2. Emitir la allowlist para revisión

```bash
pnpm hiring:candidates:remediate-display --emit-allowlist \
  ./task-1736.candidate-remediation-allowlist.json
```

El nombre del archivo DEBE terminar en `.candidate-remediation-allowlist.json` (patrón
gitignoreado: contiene PII y nunca se commitea).

### 3. Revisar y podar línea a línea

Abre el archivo y revisa **cada** entrada. Elimina toda entrada que no apruebes. Criterios:

- ¿La propuesta es realmente el mismo nombre con el casing digno? Si dudas, elimínala (quedará
  para corrección manual caso a caso).
- **Poda los perfiles sintéticos/QA**: en la ejecución real del 2026-08-16 se aplicaron **3 personas
  reales** (Valentina Villa, Stana Medina, Aldo Romano) y se **podaron a mano 2 perfiles de prueba
  QA**: "arreglar" un perfil de prueba es ruido en la auditoría, no valor. Esa poda es el protocolo
  funcionando, no una omisión.
- No edites los valores `beforeFullName`/`proposedFullName` a mano: si la propuesta no te gusta,
  elimina la entrada (el apply detecta ediciones y las manda a `needs_review` sin tocar la DB).

### 4. Apply (con actor y motivo)

```bash
pnpm hiring:candidates:remediate-display --apply \
  --allowlist ./task-1736.candidate-remediation-allowlist.json \
  --actor <tu-user-id> --reason "TASK-1736 remediación casing histórico"
```

- El motivo exige mínimo 10 caracteres.
- El archivo debe terminar en `.candidate-remediation-allowlist.json` (el comando lo verifica
  también en el apply — protege contra archivos fuera del flujo canónico o commiteables con PII).
- Aplica de a **un registro por vez**, cada uno con compare-and-set sobre el valor anterior exacto
  y una fila de auditoría permanente **que registra tu `--actor` y tu `--reason`**.
- Si el resumen final muestra `applied + already_canonical != expected`, el comando marca ABORT: el
  estado en la base cambió desde el dry-run (o alguien corrigió a mano). Regenera el dry-run y la
  allowlist; no reintentes con el archivo viejo.
- **Repetir un apply exitoso es seguro**: los registros ya corregidos salen
  `skipped (already_canonical)`, cuentan como éxito y el comando termina bien (exit 0).

### 5. Verificación

- Readback: consulta el `full_name` de cada identidad remediada (debe ser la propuesta aprobada).
- Auditoría: cada caso tiene su fila `source='reconcile'`, `outcome='applied'` en
  `greenhouse_hiring.candidate_identity_display_audit`, con tu `actor_user_id` y el motivo del
  apply en `reason`.
- Señales: en `/admin/operations`, `hiring.candidate_identity.needs_review_backlog` no debe crecer
  por el apply.

### 6. Rollback de un registro (si un apply debe revertirse)

```bash
pnpm hiring:candidates:remediate-display --rollback <auditId> \
  --actor <tu-user-id> --reason "TASK-1736 rollback: <motivo>"
```

- El `<auditId>` es el `audit_id` de la fila `source='reconcile'` + `outcome='applied'` del apply
  que quieres revertir (búscalo por identidad en la tabla de auditoría).
- Restaura el valor anterior exacto **solo si** el nombre vigente sigue siendo el que dejó ese
  apply (compare-and-set). Si alguien lo cambió después, reporta
  `needs_review (rollback_cas_mismatch)` sin tocar nada — resuélvelo con corrección manual.
- La reversión queda registrada como **corrección humana**: desde ahí ningún automatismo vuelve a
  tocar ese nombre (deliberado).

## Qué significan los resultados por registro

| Resultado | Significa | Qué hacer |
|---|---|---|
| `applied (display_refreshed)` | Corregido con éxito | Nada |
| `skipped (already_canonical)` | Ya estaba en la forma propuesta (p. ej. retry de un apply exitoso) — cuenta como éxito | Nada |
| `applied (rollback_applied)` | Rollback: el display volvió al valor previo al apply | Nada |
| `needs_review (rollback_cas_mismatch)` | Rollback: el nombre vigente ya no es el que dejó ese apply | Corrección manual caso a caso |
| `needs_review (rollback_before_value_unavailable)` | Rollback: el apply llenó un display vacío; no se restaura a vacío | Corrección manual caso a caso |
| `skipped (human_correction_present)` | Hay corrección humana previa — siempre gana | Nada; no insistir |
| `needs_review (cas_conflict)` | El nombre cambió en la base entre dry-run y apply | Regenerar dry-run |
| `needs_review (substantive_name_discrepancy)` | El nombre actual difiere de verdad del revisado | Revisión humana caso a caso |
| `needs_review (allowlist_version_drift)` | La política cambió de versión desde el dry-run | Regenerar dry-run + allowlist |
| `needs_review (allowlist_proposal_drift)` | El archivo fue editado a mano o la propuesta ya no coincide | Regenerar allowlist sin editarla |

## Qué NO hacer

- NO ejecutar `UPDATE` manual sobre `identity_profiles.full_name`: la única puerta es el command
  con CAS + auditoría.
- NO aplicar una allowlist vieja "porque ya estaba revisada": siempre dry-run vigente.
- NO remediar perfiles de prueba/QA.
- NO compartir el reporte ni la allowlist por canales compartidos (contienen nombres).
- NO borrar filas de evidencia ni de auditoría (son append-only; la base lo impide con trigger).

## Problemas comunes

- **`FAIL: la allowlist se generó con la versión de policy "X"`** → la política de normalización
  cambió; regenera dry-run + allowlist con la versión vigente.
- **`ABORT: applied != esperado`** → revisa los `needs_review`/`skipped` uno a uno en el output;
  la causa típica es una corrección humana nueva o un re-submit del candidato entre medio.
- **El dry-run muestra 0 remediables pero ves un nombre feo en pantalla** → puede estar clasificado
  como ambiguo (`mixed_ambiguous`, no automatizable): corresponde corrección manual con la
  capability `hiring.candidate.correct_display`, no remediación por lote.

## Referencias técnicas

- CLI: `scripts/hiring/remediate-candidate-display-names.ts` (`pnpm hiring:candidates:remediate-display`)
- Primitives: `src/lib/hiring/candidate-intake/{detect-degenerate,remediate,reconcile-display}.ts`
- ADR: `docs/architecture/GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1.md`
- Runbook de rollout: `docs/operations/runbooks/candidate-identity-rollout.md`
