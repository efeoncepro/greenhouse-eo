# GREENHOUSE Runtime Synergy Gaps v1

## Objetivo

Documentar las brechas reales de sinergia cross-module que siguen abiertas en el runtime del portal a partir de evidencia del codebase y de las superficies de datos actuales, no solo de la arquitectura escrita.

Este documento no reemplaza la arquitectura ni el backlog. Su función es:

- fijar una lectura común de qué sinergias ya están materializadas
- separar esas sinergias reales de los puntos donde el sistema todavía opera de forma híbrida o fragmentada
- derivar tasks nuevas y ejecutables para cerrar esas brechas

## Contexto validado en runtime

Como baseline operativa, ya existen integraciones cross-module reales:

- `Account 360 + Finance + Payroll + ICO` ya convergen en `src/lib/account-360/organization-economics.ts`
- `Organization -> Projects` ya converge en `src/lib/account-360/organization-projects.ts`
- `Person + ICO` ya converge en `src/lib/person-360/get-person-ico-profile.ts`
- `Person + Finance` ya converge en `src/lib/person-360/get-person-finance.ts`
- `People detail` ya compone HR, delivery, finance, payroll y memberships desde `src/lib/people/get-person-detail.ts`
- `Nubox reconciliation + Finance + Organizations` ya converge en `src/lib/nubox/reconciliation.ts`
- `Outbox + Webhooks` ya existen como capa reusable en `src/lib/sync/*` y `src/lib/webhooks/*`

Conclusión: la sinergia del portal ya no es hipotética. La brecha actual no es “crear integración desde cero”, sino consolidar y hacer más homogéneas las integraciones que hoy todavía viven en caminos híbridos.

## Metodología

Brechas derivadas de revisar:

- stores runtime en `src/lib/**`
- rutas API activas en `src/app/api/**`
- vistas serving ya materializadas en `greenhouse_serving`
- tests que delatan fallbacks o acoplamientos transitorios
- changelog reciente del repo

## Matriz de brechas

| Gap                                                                   | Evidencia en repo                                                                                                                                             | Riesgo operativo                                                                           | Cierre propuesto                                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Métricas operativas de persona no canónicas                           | `src/lib/people/get-person-operational-metrics.ts` sigue leyendo `notion_ops.tareas` y haciendo matching por display name, emails y aliases                   | métricas inconsistentes, joins frágiles y dependencia de heurísticas en runtime            | materializar serving operacional por `member_id` y cortar People a lectura canónica |
| Person 360 sigue compuesto por fan-out de stores y fallbacks híbridos | `src/lib/people/get-person-detail.ts` compone múltiples stores; `src/lib/people/get-person-detail.test.ts` valida fallback Postgres -> BigQuery por sub-query | latencia variable, payloads inconsistentes y mayor costo de mantenimiento                  | consolidar una lectura serving-first para People y reducir fan-out transitorio      |
| Executive context de organización sigue fragmentado                   | existen rutas separadas para `/economics`, `/projects` y `/dte-coverage`, pero no una proyección ejecutiva única                                              | la vista de organización depende de múltiples fetches y no hay snapshot ejecutivo reusable | crear snapshot ejecutivo por organización con API unificada                         |
| Refresh reactivo de proyecciones cross-module no es uniforme          | `outbox-react` existe, pero hoy no hay un patrón genérico para refrescar nuevas proyecciones de persona y organización                                        | datos frescos dependen de crons aislados o recomputes ad hoc                               | formalizar projection refresh reactivo sobre outbox y serving                       |

## Gap 1 - Persona operacional todavía depende de matching heurístico

### Evidencia

- `src/lib/people/get-person-operational-metrics.ts` consulta BigQuery sobre `notion_ops.tareas`
- la resolución usa señales como `displayName`, `publicEmail`, `internalEmail`, `emailAliases`, `identityMatchSignals` y `notionUserCandidates`
- el path de lectura sigue atado a columnas de tablas fuente como `responsables_ids`, `responsables_names`, `responsable_texto`, `status`, `rpa`, `deadline`

### Diagnóstico

Esta capa funciona, pero no es una sinergia estable. A diferencia de `person_finance_360` o `ico_member_metrics`, aquí no existe todavía una proyección canónica con llave `member_id` lista para consumo de `People`.

### Brecha real

- falta una proyección operacional en Postgres o serving equivalente por persona y período
- falta cortar el runtime de People a esa proyección
- falta observabilidad sobre cobertura y frescura de esa proyección

### Task derivada

- `TASK-042 - Person Operational Serving Cutover`

## Gap 2 - Person 360 todavía no tiene una lectura consolidada y homogénea

### Evidencia

- `src/lib/people/get-person-detail.ts` hace fan-out hacia HR, finance, delivery, payroll, memberships, profile e indicadores operativos
- `src/lib/people/get-person-detail.test.ts` valida escenarios de fallback aislado desde Postgres a BigQuery
- parte de la información ya viene de serving (`person_finance_360`, `ico_member_metrics`) y parte sigue llegando desde queries específicas por dominio

### Diagnóstico

El portal ya ofrece una ficha de persona muy rica, pero su composición sigue siendo más un orquestador de varias fuentes que un read model maduro y consistente.

### Brecha real

- falta una consolidación serving-first para la ficha de persona
- falta definir qué campos son snapshot operativo y cuáles siguen siendo drill-down especializado
- falta reducir dependencia de fallbacks por sub-query para la lectura normal de la ficha

### Task derivada

- `TASK-043 - Person 360 Runtime Consolidation`

## Gap 3 - La organización no tiene aún un snapshot ejecutivo único

### Evidencia

- `src/app/api/organizations/[id]/economics/route.ts` expone economics + ICO
- `src/app/api/organizations/[id]/projects/route.ts` expone projects por organización
- `src/app/api/organizations/[id]/dte-coverage/route.ts` existe como otra superficie separada
- `organization_360` sigue siendo un backbone útil, pero no la vista ejecutiva cross-module completa

### Diagnóstico

La organización ya tiene buenos bridges, pero siguen dispersos. Eso limita reutilización en Home, dashboards ejecutivos, APIs externas y refresh reactivo.

### Brecha real

- falta un snapshot ejecutivo por organización y período
- falta una API unificada reusable para surfaces ejecutivas
- falta una frontera clara entre snapshot ejecutivo y breakdowns especializados

### Task derivada

- `TASK-044 - Organization Executive Snapshot`

## Gap 4 - La actualización reactiva de nuevas proyecciones no está cerrada end-to-end

### Evidencia

- `TASK-012` ya materializó outbox y consumer reactivo base
- `TASK-006` ya materializó webhook infrastructure reusable
- el runtime nuevo depende de proyecciones como `ico_member_metrics`, `person_finance_360`, `organization economics`, `projects per org`
- no hay todavía una lane explícita para refrescar de forma homogénea las nuevas proyecciones que derivan de cambios en assignments, payroll, finance, services o reconciliation

### Diagnóstico

Sin este cierre, cada proyección nueva corre el riesgo de nacer con refresh aislado por cron o con invalidación parcial.

### Task derivada

- `TASK-045 - Reactive Projection Refresh`

## Orden recomendado de cierre

1. `TASK-042` — convertir persona operacional en un read model canónico
2. `TASK-043` — consolidar Person 360 sobre read models maduros
3. `TASK-044` — unificar organization executive snapshot
4. `TASK-045` — cerrar refresh reactivo para los nuevos snapshots

## Relación con backlog existente

Estas brechas no reabren tasks ya cerradas como `TASK-010`, `TASK-011`, `TASK-013`, `TASK-014`, `TASK-015`, `TASK-017`, `TASK-022` o `TASK-023`.

Las tasks derivadas nacen porque, tras esos cierres, quedó más visible qué partes del sistema ya están bien integradas y cuáles siguen operando con fragmentación o heurísticas.

## Regla operativa derivada

Cuando una task nueva reclame “sinergia cross-module”, debe explicitar si está:

- materializando una proyección canónica nueva
- consolidando una lectura ya existente pero fragmentada
- cerrando refresh reactivo e invalidación de una proyección ya materializada

Si no aclara cuál de esas tres cosas hace, la task queda demasiado ambigua para ejecutarse con seguridad.
