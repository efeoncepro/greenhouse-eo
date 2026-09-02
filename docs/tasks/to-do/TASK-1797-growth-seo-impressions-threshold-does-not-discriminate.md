# TASK-1797 — El umbral de impresiones del striking-distance no discrimina

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El striking-distance filtra keywords por un umbral de impresiones declarado como **relativo**
(`max(minImpressionsFloor, percentil_75)`), con la razón escrita de que «alta impresión es un
percentil, no un número». Medido contra las dos orgs con datos, el percentil **cae sobre el piso y
no separa nada**: Berel p75 = 10 con piso 10, Efeonce p75 = 12 con piso 10. El umbral declara ser
adaptativo y opera como una constante.

## Why This Task Exists

El diseño asume que una distribución de impresiones tiene una cola alta que un percentil puede
cortar. La demanda de búsqueda no se distribuye así: es cola larga con masa en el mínimo. Medido el
2026-08-29 sobre la ventana canónica de 28 días:

| target | queries | p50 | p75 | p90 | máximo |
|---|---|---|---|---|---|
| `seot-berel-mx` | 18 677 | 2 | **10** | 44 | 94 117 |
| `seot-berel-fase0` | 18 677 | 2 | **10** | 44 | 94 117 |
| `seot-efeonce-own-brand` | 251 | 3 | **12** | 38 | 430 |

Dos orgs con escalas separadas por dos órdenes de magnitud (18 677 vs 251 queries; 94 117 vs 430 de
máximo) y **el mismo p75 pegado al piso**. No es la distribución de un cliente: es la forma del
fenómeno. Con la mediana en 2 impresiones en 28 días, un umbral de 10 admite prácticamente todo lo
que tenga señal.

🔴 **Y el arreglo obvio es probablemente el equivocado.** Subir el umbral no cambia lo que el
operador ve, porque **la cola está limitada por el cap, no por el umbral**: para Berel hay 1748
queries elegibles, el colector pide 600 (`maxItemsPerOrigin * 3`, `ORDER BY impressions DESC`) y el
cap por origen recorta a 200. Mover el umbral de 10 a 44 elimina candidatos que **ya estaban fuera
por rank**. Lo que decide qué ve el operador es el ORDEN, no el filtro — así que esta task tiene que
medir el efecto antes de mover la constante, no después.

La pregunta real no es «qué valor debería tener el umbral» sino **qué trabajo hace el umbral hoy y
si ese trabajo lo debería hacer el umbral**. Puede terminar en subirlo, en cambiar el estadístico, en
volverlo dependiente del volumen, o en declarar que el umbral no es el discriminador y documentarlo
para que nadie vuelva a leerlo como si lo fuera.

## Goal

- Determinar, con medición y no con criterio, qué separa el umbral hoy en cada org con datos.
- Decidir explícitamente si el umbral debe discriminar; si sí, con qué estadístico y por qué; si no,
  dejarlo declarado como piso de ruido y mover la discriminación a donde corresponda.
- Que la razón escrita en el código coincida con lo que el código hace: hoy dice «percentil» y opera
  como constante.
- Cerrar la duplicación: el mismo par percentil/piso vive en dos archivos con valores idénticos y
  ninguno referencia al otro.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- La lente `●` medida / `◑` estimada es un campo estructural, no prosa: cualquier cifra nueva que la
  task exponga declara su `provenance`. Fuente `src/lib/growth/seo/lens.ts` (TASK-1785).
- El umbral se aplica **dentro** del predicado de elegibilidad. Un cambio acá mueve la población, no
  el orden — verificar los dos efectos por separado y no confundirlos.
- Cambiar el valor del umbral **no** es cambiar la versión del score. `ACTIVE_PRIORITY_SCORE_VERSION`
  gobierna la fórmula; el umbral gobierna la población. Si la decisión de esta task altera el
  ranking resultante, evaluar si necesita versión nueva del score en vez de mutar la vigente.
- **NUNCA** citar un conteo sin decir en qué etapa del pipeline se midió: elegibles en SQL (1748),
  pedidos por el colector (600) y sobrevivientes al cap (200) son tres números distintos del mismo
  embudo, y confundirlos se equivoca por un orden de magnitud. Ya pasó durante el diagnóstico.

## Normative Docs

- `docs/tasks/complete/TASK-1792-growth-seo-ctr-curve-declares-usability.md` — separó los dos usos de
  `MIN_IMPRESSIONS_FLOOR` (piso de validez de la curva vs umbral de la lente) y **conservó
  deliberadamente** el segundo, que es el que esta task cuestiona. Leerlo antes de tocar la
  constante: su §«Por qué el piso de 10 es indefendible» ya contiene la aritmética del intervalo de
  confianza para el uso de curva, y ese razonamiento **no** se traslada automáticamente al uso de
  elegibilidad.
- `docs/tasks/complete/TASK-1700-growth-seo-prioritized-work-queue-aggregate.md` — dueño del cap por
  origen y del orden servido.

## Dependencies & Impact

### Depends on

- `greenhouse_growth.seo_gsc_daily` — fuente de la distribución (lente `●` medida).
- `greenhouse_growth.seo_targets` — resolución org ↔ target.
- TASK-1792 (complete) — separó los dos usos de la constante; esta task opera sobre el uso que aquella
  conservó.

### Blocks / Impacts

- Cola priorizada (`work-queue`): cambia la población del origen `gsc_striking_distance`.
- Lente de oportunidades del operador: `/admin/growth/seo/keywords`.
- Lane ecosystem / MCP: `get_seo_keyword_opportunities`.
- **No impacta** `gap/read-seo-aeo-gap.ts`, que comparte el nombre `MIN_IMPRESSIONS_FLOOR` pero es
  otro uso — contraejemplo verificado durante TASK-1792, no tocar.

### Files owned

- `src/lib/growth/seo/keyword-opportunities-reader.ts`
- `src/lib/growth/seo/work-queue/score-versions.ts`
- `src/lib/growth/seo/work-queue/collectors/gsc-striking-distance.ts`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `keyword-opportunities-reader.ts:51` `DEFAULT_IMPRESSIONS_PERCENTILE = 0.75` y `:69`
  `MIN_IMPRESSIONS_FLOOR = 10`.
- `work-queue/score-versions.ts:144-145` `impressionsPercentile: 0.75`, `minImpressionsFloor: 10`
  dentro de `PRIORITY_SCORE_CONFIGS`, **duplicando** los valores del reader sin referenciarlo.
- `collectors/gsc-striking-distance.ts` `resolveImpressionsThreshold(...)` que devuelve
  `Math.max(floor, round(p75))`, y `SEO_KEYWORD_OPPORTUNITIES_SQL` con `ORDER BY pq.impressions DESC
  LIMIT $6`.
- `WORK_QUEUE_RUNTIME_CONFIG.maxItemsPerOrigin = 200` en `score-versions.ts:230`.

### Gap

- Ninguna medición registrada de qué separa el umbral: se eligió `0.75` sin evidencia de la
  distribución, y la evidencia disponible hoy lo contradice.
- El comentario del código afirma un comportamiento adaptativo que no ocurre. Es una afirmación sin
  mecanismo, la misma clase que TASK-1785 cerró para la lente.
- El par percentil/piso está duplicado en dos archivos: cambiar uno y no el otro deja la cola y la
  lente del operador discrepando sobre qué keyword es elegible, **sin que nada falle**.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/growth/seo/**`, ejecutado por el `ops-worker` (colector) y por Vercel (reader)
- Future candidate home: `remain-shared`
- Boundary: el umbral es política de elegibilidad del dominio SEO; su único consumidor legítimo es el
  predicado de `SEO_KEYWORD_OPPORTUNITIES_SQL` y la config de `PRIORITY_SCORE_CONFIGS`
- Server/browser split: `n/a` — la resolución del umbral es server-only y nunca cruza al cliente
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `greenhouse_growth.seo_gsc_daily` (lectura); la política vive en
  `score-versions.ts` y `keyword-opportunities-reader.ts`
- Consumidores afectados: cola priorizada (worker), lente del operador (UI), lane ecosystem/MCP
- Runtime target: `worker` + `production`

### Contract surface

- Contrato existente a respetar: `SEO_KEYWORD_OPPORTUNITIES_SQL`, `PRIORITY_SCORE_CONFIGS`,
  `resolveSeoLens` / `SeoProvenance`
- Contrato nuevo o modificado: la política de umbral y su declaración; ninguna ruta nueva
- Backward compatibility: `gated` — si la decisión cambia el ranking, entra como versión nueva de
  score, no como mutación de la vigente
- Full API parity: no introduce capability nueva; es política interna de un reader ya expuesto por
  app + ecosystem/MCP. El cambio llega a los tres consumidores por el mismo primitive

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_gsc_daily` (solo lectura),
  `greenhouse_growth.seo_work_queue_snapshots` / `_items` (población resultante)
- Invariantes que no se pueden romper:
  - El umbral filtra POBLACIÓN; el cap y el `rank_in_snapshot` deciden ORDEN. No mezclar los efectos
    al medir ni al reportar.
  - Un snapshot ya persistido es inmutable: cambiar el umbral produce un snapshot nuevo, jamás
    reescribe uno existente.
  - Las cifras derivadas de `seo_gsc_daily` son lente `●` medida y así deben declararse.
- Write-target allowlist: `N/A` — la task no crea tablas
- Tenant/space boundary: el umbral se resuelve **por organización**, y debe seguir siendo así:
  un valor global reintroduce el defecto en la dirección opuesta
- Idempotency/concurrency: sin cambios; el materializador ya es idempotente por hash de input
- Audit/outbox/history: sin evento nuevo; el cambio de política se audita por
  `priority_score_version` cuando aplique

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `read-only` — Slice 1 y 2 no cambian comportamiento
- Backfill plan: rematerialización de la cola tras el cambio, ejecutada por el scheduler canónico
  (`gcloud scheduler jobs run ops-seo-work-queue-materialize`, identidad OIDC del job). Correr
  **sin** `force`: el piso de recomputación filtra por `priority_score_version`, así que una versión
  nueva recalcula sola y esa corrida además ejercita la red de seguridad
- Rollback path: revert del PR; si hubo versión de score nueva, revertir
  `ACTIVE_PRIORITY_SCORE_VERSION` y rematerializar
- External coordination: `N/A — repo-only change`

### Security and access

- Auth/access gate: sin cambios; hereda el gate del reader y del lane
- Sensitive data posture: `no sensitive data` — volúmenes de búsqueda agregados
- Error contract: sin errores nuevos; el vacío legítimo ya se distingue del fallo en el colector
- Abuse/rate-limit posture: `none with rationale` — no hay llamada externa nueva

### Runtime evidence

- Local checks: tests focales del dominio + `pnpm test` completo antes de cerrar
- DB/runtime checks: la medición de distribución de Zone 3 corrida contra PG real, por org
- Integration checks: `N/A` — sin proveedor externo
- Reliability signals/logs: `growth.seo.work_queue.score_version_drift` si entra versión nueva
- Production verification sequence: ver `Production verification sequence` abajo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Medir qué separa el umbral hoy, por org y por etapa

- Script versionado bajo `scripts/growth/` que, por cada `seo_target` con datos, emite: total de
  queries, percentiles 50/75/90/95/99, máximo, umbral resuelto, y el conteo de elegibles en las
  **tres** etapas del embudo (predicado SQL → `LIMIT` del colector → cap por origen).
- Emite además el conteo bajo umbrales alternativos (p90, p95, absolutos 25/50/100) para que la
  decisión del Slice 2 se tome sobre efecto medido, no sobre intuición.
- Entregable: salida cruda de las orgs con datos, embebida en el propio archivo de la task como
  `## Delta`.

### Slice 2 — Decidir la política y escribirla donde se pueda verificar

- Decisión explícita entre: (a) subir el piso, (b) cambiar el estadístico, (c) hacerlo dependiente
  del volumen de la org, (d) declarar que el umbral es piso de ruido y NO el discriminador.
- La decisión se justifica con la tabla del Slice 1, nombrando qué población gana o pierde cada org.
- Si la opción elegida cambia el ranking, entra como **versión nueva** de `PRIORITY_SCORE_CONFIGS`,
  no como mutación de la vigente.
- El comentario del código pasa a describir lo que el código hace. Si el umbral no discrimina por
  diseño, decirlo ahí en vez de dejar la afirmación del percentil.

### Slice 3 — Cerrar la duplicación entre reader y work-queue

- El par percentil/piso deja de existir dos veces con valores independientes: una fuente, la otra la
  referencia.
- Test que falla si los dos lados divergen — hoy nada lo impide y la divergencia sería silenciosa: la
  cola y la lente del operador mostrarían poblaciones distintas sin error.
- 🔴 El test debe **ejercitar** la resolución del umbral en ambos caminos, no comparar el texto de
  las constantes. Una guarda que afirma la forma textual no verifica nada
  (`GREENHOUSE_CANONICAL_PATTERNS_V1.md` §7).

### Slice 4 — Rematerializar y verificar el efecto real

- Rematerializar por el scheduler canónico, **sin** `force`.
- Verificar los dos efectos **por separado**: cambio de población (cuántos entran/salen por origen) y
  cambio de orden (`rank_in_snapshot` vs posición servida).
- Caso testigo elegido **del snapshot previo**, no del nuevo: verificar que la keyword existe en el
  estado anterior ANTES de colgarle una predicción.

## Out of Scope

- El piso de validez de la **curva de CTR**: es de TASK-1792, ya cerrado, y su aritmética no aplica
  acá.
- `gap/read-seo-aeo-gap.ts`, que comparte el nombre de la constante y es otro uso legítimo.
- El cap por origen (`maxItemsPerOrigin`) y el orden servido: son de TASK-1700. Esta task **mide** su
  interacción con el umbral pero no los cambia.
- La ventana de posición 8–20 y `targetPosition`: otro eje de política, sin evidencia que lo
  cuestione hoy.
- Cualquier cambio de UI en `/admin/growth/seo/keywords`.

## Detailed Spec

### La medición que origina la task

Ejecutada el 2026-08-29 contra PG productivo, ventana 28 días, agregando impresiones por query:

```
target                    queries    p50   p75   p90   max
seot-berel-mx              18 677      2    10    44   94 117
seot-berel-fase0           18 677      2    10    44   94 117
seot-efeonce-own-brand        251      3    12    38      430
```

`resolveImpressionsThreshold` devuelve `Math.max(minImpressionsFloor, round(p75))`. Para Berel eso es
`max(10, 10) = 10` y para Efeonce `max(10, 12) = 12`. En los dos casos el percentil **empata o roza**
el piso, así que el mecanismo relativo no está aportando separación.

⚠️ Precisión sobre el mecanismo: **no** es que el piso «tape» un percentil más bajo. Se midió el p75
crudo y para Berel es exactamente 10, igual al piso. Un valor que la propia herramienta clampea no
dice cuál era antes del clamp; hay que imprimir el crudo, y este slice lo hace.

### El embudo, y por qué el umbral no es la palanca obvia

Para Berel, con el umbral vigente:

```
1748  queries pasan el predicado SQL (posición 8–20, impresiones ≥ umbral)
 600  es lo único que el colector pide  (maxItemsPerOrigin * 3, ORDER BY impressions DESC)
 200  sobrevive al cap por origen
```

Subir el umbral a p90 (44) recorta el primer número, pero los candidatos que elimina ya estaban fuera
por rank: el `ORDER BY impressions DESC` los dejaba después del puesto 600. **El operador vería lo
mismo.** El umbral solo cambia lo que ve si además cambia el orden — por ejemplo si se decide ordenar
por otra cosa, o si el cap sube.

Esto es lo que obliga a que el Slice 1 mida las tres etapas y no solo la primera. Una decisión tomada
sobre el número 1748 puede ser inútil en la práctica y verse como una mejora.

### Lo que la task NO afirma

No se afirma que el umbral de 10 esté mal calibrado. Se afirma que **no hace lo que su comentario
dice que hace**, y que nunca se midió. Cuál es el valor correcto —o si el umbral debe ser el
discriminador— es una decisión de oficio SEO que el Slice 2 toma con la evidencia del Slice 1, y que
puede legítimamente concluir «se queda como está, documentado como piso de ruido».

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (medición) → Slice 2 (decisión) → Slice 3 (deduplicación) → Slice 4 (rematerializar +
  verificar).
- **Slice 1 DEBE cerrar antes que Slice 2.** Decidir la política sin la tabla de efecto por etapa es
  exactamente el error que esta task existe para evitar: mover una constante y llamarlo mejora.
- Slice 3 puede correr en paralelo con Slice 2 sólo si Slice 2 ya fijó el valor; si no, la
  deduplicación consolidaría un valor que está por cambiar.
- Slice 4 va SIEMPRE al final y **después** del deploy del código, nunca antes: rematerializar con el
  worker sirviendo la política vieja produce un snapshot que no corresponde a ninguna versión.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Cambiar el umbral altera el ranking y se muta la versión de score vigente en vez de crear una nueva | cola SEO | medium | Slice 2 obliga a versión nueva si el ranking cambia; el snapshot es inmutable | `growth.seo.work_queue.score_version_drift` |
| Se cambia un lado del par duplicado y no el otro: cola y lente del operador discrepan sin error | reader + worker | high | Slice 3 deja una sola fuente + test que ejercita ambos caminos | no signal — emerge como discrepancia reportada por el operador |
| Se sube el umbral, la población baja y se reporta como mejora sin que el operador vea nada distinto | cola SEO | high | Slice 1 mide las tres etapas del embudo; Slice 4 verifica población Y orden por separado | no signal — se detecta sólo comparando el snapshot servido |
| Rematerializar antes del deploy escribe un snapshot con la política vieja bajo versión nueva | worker | medium | Slice 4 es post-deploy por contrato; verificar `GIT_SHA` de la revisión activa ANTES de rematerializar | `GIT_SHA` de `ops-worker` ≠ SHA promovido |
| Un umbral global reemplaza al per-org y rompe la org chica | cola SEO | low | invariante declarado: la resolución sigue siendo por organización | conteo de elegibles de `seot-efeonce-own-brand` cae a 0 |

### Feature flags / cutover

Sin flag de env var. El cutover es la **versión del score**: si la decisión del Slice 2 cambia el
ranking, entra como entrada nueva en `PRIORITY_SCORE_CONFIGS` y el flip es mover
`ACTIVE_PRIORITY_SCORE_VERSION`. Revert = volver la constante y rematerializar; los snapshots viejos
siguen existiendo porque la tabla es append-only. Si la decisión NO cambia el ranking (por ejemplo
sólo corregir el comentario y deduplicar), es aditivo y no necesita cutover.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR — el script es sólo lectura, no muta nada | <5 min | sí |
| Slice 2 | revertir `ACTIVE_PRIORITY_SCORE_VERSION` a la anterior + rematerializar sin `force` | ~10 min | sí |
| Slice 3 | revert PR; la deduplicación es refactor sin cambio de valor | <5 min | sí |
| Slice 4 | no aplica — no muta código; si el snapshot nuevo es peor, el rollback es el del Slice 2 | — | sí |

### Production verification sequence

1. Correr el script del Slice 1 contra PG productivo y guardar la salida cruda en el `## Delta`.
2. Merge del Slice 2/3 a develop, verde en CI — **y resolver el veredicto por SHA**, no asumirlo
   (`gh run list --workflow=ci.yml ... select(.headSha==...)`; vacío o `cancelled` NO es verde).
3. Promoción a `main` por el control plane de release.
4. Verificar `GIT_SHA` de la revisión activa del `ops-worker` **antes** de rematerializar. Si no
   coincide con el SHA promovido, PARAR: rematerializar contra código viejo produce un snapshot que
   miente sobre su versión.
5. Rematerializar por el scheduler canónico, sin `force`.
6. Verificar población por origen (antes vs después) y orden servido vs `rank_in_snapshot`, por
   separado.
7. Verificar el caso testigo, elegido del snapshot PREVIO.

### Out-of-band coordination required

`N/A — repo-only change.` La rematerialización usa el scheduler ya existente y no requiere cambios de
secretos, env vars ni configuración de proveedor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una tabla, medida contra PG real, con percentiles y umbral resuelto por cada `seo_target`
      con datos, y el conteo de elegibles en las tres etapas del embudo (SQL, `LIMIT`, cap).
- [ ] La tabla incluye el conteo bajo al menos tres umbrales alternativos, para que la decisión sea
      comparativa y no puntual.
- [ ] El p75 se reporta **crudo**, antes del `Math.max`, en todas las orgs medidas.
- [ ] La política queda decidida entre las cuatro opciones del Slice 2, con la razón escrita y
      apoyada en la tabla, nombrando qué población gana o pierde cada org.
- [ ] El comentario del código describe lo que el código hace: si el umbral no discrimina, lo dice.
- [ ] El par percentil/piso existe en UNA sola fuente; el otro lado la referencia.
- [ ] Existe un test que falla si los dos caminos resuelven umbrales distintos, y ese test
      **ejercita** la resolución en ambos, no compara texto de constantes.
- [ ] Si el ranking cambia, entró como versión nueva de `PRIORITY_SCORE_CONFIGS` y no como mutación
      de la vigente.
- [ ] La rematerialización post-deploy se corrió **sin** `force` y devolvió `materialized > 0`.
- [ ] Se verificó `GIT_SHA` de la revisión activa del `ops-worker` ANTES de rematerializar.
- [ ] Se reportan población y orden como efectos **separados**; no se declara mejora por una caída de
      población sin mostrar qué cambió en lo que el operador ve.
- [ ] Source of truth, contract surface y consumidores están nombrados con paths reales.
- [ ] Invariantes de datos, boundary por organización e idempotencia están explícitos.
- [ ] La postura de migración/rollback es explícita y proporcional al riesgo.
- [ ] Hay evidencia runtime/DB listada para todo cambio más allá de docs/tooling.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (suite completa, no focal — el gate de cierre lo exige y un cambio de política cruza
  módulos)
- Medición contra PG real vía `pnpm pg:connect` o script con credenciales de `.env.local`
- Resolver el veredicto de CI por SHA después de cada push

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] La arquitectura del módulo SEO documenta la política de umbral resultante y su razón medida

## Follow-ups

- Si el Slice 1 muestra que el cap es la restricción efectiva y no el umbral, evaluar una task propia
  para la política de cap por origen — hoy es `200` fijo para todas las orgs, y una org de 251
  queries y una de 18 677 comparten ese número.
- El mismo par percentil/piso puede existir en otros colectores del módulo; barrer por símbolo al
  cerrar el Slice 3.

## Delta YYYY-MM-DD

## Open Questions

- ¿El umbral debe discriminar, o su trabajo es sólo excluir ruido y la discriminación pertenece al
  orden? Es la decisión central del Slice 2 y no está pre-decidida: la evidencia del embudo sugiere
  que el cap manda, pero eso no resuelve qué debería hacer el umbral.
- ¿La ventana de 28 días es la correcta para estimar la distribución? Una org nueva con pocos días de
  captura tiene una distribución que no representa su estado estable, y el umbral se resuelve igual.
  Fuera de alcance salvo que el Slice 1 muestre que muerde.
