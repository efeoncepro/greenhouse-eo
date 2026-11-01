# QA Release Audit - TASK-2094 permisos/contexto local

## Verdict

PASS del incremento local. BLOCK para aceptar bridge o desplegar split.

Closure state: operativamente bloqueado para apertura departamental; TASK-2094 continúa localmente.

## Scope

- Owned: experiments SKY, auditoría nueva, task/plan, ADR Proposed, continuidad Insights y manual/funcional.
- Runtime: PG16 efímero, sin IP; datos inventados. Ningún src/migration/env/paquete productivo cambia.
- WIP ajeno: archivos de prospección, archivo mensual de handoff y artefactos gráficos permanecen fuera.

## Risk Classification

| Riesgo | Nivel | Control |
| --- | --- | --- |
| Laboratorio de acceso | Medio | Destino fijo, schema privado efímero, red IP bloqueada, sin fallback BQ |
| Inferencia de seguridad productiva | Alto | Separar callbacks/recursos ejercitados de HTTP/browser/issuer y writes no probados |

## Injected Skills

software-architect-2026, efeonce-insights, greenhouse-secret-hygiene, greenhouse-documentation-governor y greenhouse-qa-release-auditor;
invariantes Identity/Organization. Contrato candidato dentro del ADR existente Proposed.

## Evidence

- 167/167 PASS, 4 suites, exit 0 y cleanup; 78 casos nuevos (39 por variante), preservación de tres filas históricas
  sintéticas comprobada después de cada caso nuevo. Recibo en results.json.
- `node scripts/experiments/sky-measurement-bridge/check-types.mjs`: 0 diagnósticos, raíces locales y dependencias
  importadas con `src/types/next-auth.d.ts`. No es typecheck de todo el repo.
- El conteo anterior de 112 diagnósticos transitivos provenía de un programa focal sin esa ampliación de tipos.
  Esta revisión corrige el checker; no prueba que hubiera 112 defectos del repositorio.
- ESLint focal, sintaxis runner/checker y task lint: PASS; task 0 errores/0 warnings. Ops lint: sin errores,
  15 warnings de paridad de epics ajenos. QA advisory revisado, paths ajenos excluidos del cierre efectivo.
- Closure focal: exit 0 con 2 advertencias revisadas (project_context y registro de skills); continuidad
  en skill existente/Handoff/changelog. project_context fue revisado y no hay nuevo runtime ni nueva skill.
- Context strict global: baseline de project_context ~12035>12000, Handoff 23>20 sesiones y changelog 61>60
  entradas; no se declara verde. HEAD ya contiene 23 sesiones y 61 entradas; project_context sin cambios.
  No rotar historia ajena con WIP compartido. La posición del enlace de historial se conserva al consolidar
  exclusivamente nuestra entrada de SKY.

## Blockers

1. Sin integración productiva de grants/contexto ni solución de semántica de revocación cookie.
2. Sin certificación de auth HTTP/UI, refresh concurrente, autoridad externa, revocación atómica durante writes.
3. Owner/allocations/provisioning/sync/historia ICO y distribución no certificados integralmente.

## Conditional Follow-Ups

Comparar owner comercial/routing de writers A′/B sobre las mismas fixtures y continuar prueba histórica.

## False-Closure Traps Checked

- Verde de CURRENT GAP es reproducción; no fix ni incidencia productiva confirmada.
- Contexto candidato no es credencial: exige principal autenticado separado y vigente.
- El listado org vigente mezcla departamentos; no se debe envolver sin hacer el reader Space-aware.
- La membership descriptiva no es el grant candidato. Definir operación de revocación duradera antes de rollout.
- Fixtures de reports/permissions no reemplazan schema completo, UI ni correos. No se emite ni comparte nada.

## Final Call

El corte solicitado de permisos/renovación/contexto queda reproducible localmente. La evidencia permite descartar
que A′ aisle Insights por sí solo. Ambos admiten el mismo contrato de permisos, pero la elección final aún depende
de compatibilidad de consumers y conservación histórica, que quedan en TASK-2094 y el ADR sin aceptar.
