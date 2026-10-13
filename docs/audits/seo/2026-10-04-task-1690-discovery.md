# TASK-1690 — Discovery de población cliente SEO

Fecha: 2026-10-04. Base: `22d24c713`. Alcance: lectura de código, contratos, fixtures,
documentación y referencias visuales; propuesta de UI, sin implementación ni readback productivo.
Task: [TASK-1690](../../tasks/in-progress/TASK-1690-growth-seo-client-surface-population-states.md).

## Decisión de discovery

El Resumen comienza por **clics y CTR de Search Console**, si hay capturas en la ventana.
El seguimiento de posiciones conserva una región propia; sin capturas declara que todavía no
arrancó. **No sustituye su posición por posición GSC**. GSC puede aportar su posición ponderada
en un detalle expresamente etiquetado, pero nunca como sustituto silencioso del seguimiento.
Rank sin GSC sigue visible; un fallo de fuente no oculta las restantes. AEO conserva su eje de
dominio, fuente y corte, sin número combinado SEO/AEO.

Es la decisión pedida por la pregunta abierta de TASK-1690: da valor al cliente desde el primer
período sin alterar la promesa ni la procedencia del seguimiento. La selección visual está pendiente.
[Tres propuestas visuales persistidas](../../ui/visual-directions/TASK-1690-client-population/README.md).

### Corrección de la propuesta visual — AEO disponible

El operador aclara el 2026-10-04 que AEO ya existe y es robusto. Las imágenes iniciales1/2
confundieron un estado sintético `no-aeo` con la capacidad del producto. **AEO no es una promesa
«Próximamente» ni se considera ausente por faltar rank.** La propuesta1 se revisa con GSC
disponible, seguimiento rank pendiente y análisis AEO disponible, con corte propio y enlace
al análisis existente. `no-aeo` sigue como fixture condicional de ausencia de evidencia para una
organización/período; no es el default del producto ni indica una capability sin implementar.
Los índices de las imágenes son datos de ejemplo, no un nuevo readback de un cliente real.

## Hallazgos y owners

| Hallazgo actual | Evidencia / owner |
| --- | --- |
| El compositor corta por conexión GSC y no consulta rank/gap independientes. | `src/lib/growth/seo/client/read-seo-client-surface.ts:31` |
| La página también usa ausencia GSC como empty global. | `src/app/(dashboard)/growth/seo/page.tsx:61` y `:78` |
| DTO sin cobertura, clics/CTR ni cola cliente. | `read-seo-client-surface.ts:17` |
| Resumen promedia últimos puntos rank de fechas potencialmente distintas; copy los atribuye a Search Console. | `src/views/greenhouse/growth/seo/client/SeoClientDashboardView.tsx:81`; `src/lib/copy/growth.ts:1813` |
| Fallo tipado `ok:false/query_failed` y excepción no tienen la misma representación. | `read-seo-client-surface.ts:43`; `src/lib/growth/seo/rank-evolution-reader.ts:242` |
| CTR ya es razón de sumas; posición GSC ya es ponderada por impresiones. | `src/lib/growth/seo/overview/read-overview-kpis.ts:100` y `:164` |
| `previous` usa volumen, no existencia de capturas: puede perder un cero medido real. | `read-overview-kpis.ts:116` y `:291` |
| Empty interno de KPIs contiene ceros; no acredita medición. | `read-overview-kpis.ts:123` |
| Destacado aún ordena por mejor posición. Hay orden canónico de cola persistida. | `src/lib/growth/seo/client/select-featured-series.ts:8`; `src/lib/growth/seo/work-queue/reader.ts:271` |
| Una única fixture; mockups autenticados sin selector por estado. | `src/lib/growth/seo/client/mock-surface.ts:10`; rutas `growth/seo/mockup` y `report/mockup` |

### Correcciones de contexto

- La función real es `readSeoOverviewKpis`, no `readOverviewKpis`.
- El ledger registra cola ON y scheduler enabled desde 2026-08-29; la nota de agosto que los
  describe OFF es histórica. No hubo readback live de flags en este discovery.
- `resolveActiveSeoTarget` ya delega en `resolveUnambiguousSeoTarget` (ISSUE-153). No elige un
  mercado por `LIMIT 1`; devuelve null ante conflicto. Su comentario anterior quedó atrasado.
  El wrapper por ID pierde la razón: conservar `not_configured` frente a `ambiguous`, sin construir
  un selector de mercados en esta task.
- El compositor hoy sólo lo consumen portal y mockups. No afirmar que Nexa/MCP ya consumen
  este DTO; identificar el contrato compartido y el carril de exposición antes de implementar.

## Contrato propuesto para el plan de implementación

Cambio aditivo en `SeoClientSurfaceRead`, sin tablas, migración, backfill ni proveedor nuevo.
El compositor sigue como adapter: usa readers/resolver existentes, sin SQL ni fórmulas propias.

- `coverage.searchConsole` y `coverage.rankTracking`, con disponibilidad
  `available|absent|failed|disabled|unknown`, densidad `complete|sparse|partial|null`, frescura
  `fresh|stale|unknown`, `asOf`, ventana solicitada/servida, días capturados y razón client-safe.
  Densidad y frescura son ejes independientes. Los umbrales y nombres finales se fijan en el
  plan con policy existente; no inventar un umbral desde la UI.
- `gscMetrics`, compuesto desde `readSeoOverviewKpis`: clics, impresiones, CTR, período y
  `previous`. La existencia de filas/capturas define cobertura; cero medido se conserva.
  Resolver `previous` con cobertura de la ventana anterior **en el reader dueño**, sin consultas
  paralelas en este adapter. Con denominador cero, el delta relativo queda no comparable.
- `targetResolution`, usando el resolver canónico: configurado, sin configurar, ambiguo o fallo.
- Cola cliente con `toClientWorkQueueDto` y disponibilidad explícita. No filtrar DTO interno por
  blacklist ni exponer costes, dificultad, raw evidence refs o desglose de score. Mantener separados
  los orígenes degradados de cola y la cobertura GSC/rank. Disabled/query_failed no significan
  simplemente «no hay trabajo».
- Selección destacada server-side según el **orden canónico de TASK-1700**: deduplicar keyword
  preservando primera aparición, omitir candidatos sin serie y no fabricar historia. No otro
  score de «clics en juego», ni ordenar por score redondeado/posición en React. Sin cola,
  declarar prioridades no disponibles, sin resucitar fallback local de la nota OFF histórica.

Posición rank null con captura significa seguimiento sin posición observada, no ausencia de fuente.
La intención de keyword no viaja hoy en rank DTO: no inventar una clasificación objetivo/oportunidad.

## Checks formales de discovery

Dependencias TASK-1310/1303/1305 satisfechas en código: rutas cliente/mockups, reader de evolución
y reader gap existen y sus tasks están complete. TASK-1700 también tiene reader/orden/redactor;
no bloquear por reconstruir esa foundation. **Ningún blocker externo identificado** para backend.
Esto no confirma disponibilidad live ni certifica una nueva release.

Modular placement validado: composición en `src/lib/growth/seo/client/`, GSC en su reader de
overview, scoring/redacción en work-queue, fixtures sólo `/mockup`. Tipos compartidos browser-safe
sin DB/provider imports; auth y readers server-only. Sin paquete, pool, dependencia o topology nuevos.
Rigor backend-standard; read-only/idempotency N/A; migration/backfill none, rollback revert.

ADR existentes aplicables: `GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md`,
`GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` y `GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`
(Accepted). Este adapter aditivo aplica sus contratos, sin nuevo source of truth, scoring o auth;
no requiere un ADR genérico adicional. Una exposición nueva API/MCP exige contrato, manifest y
gates propios antes de implementarse, no un endpoint por componente.
UI: `GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md` y
`EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`, más operating model UI vigente.

### Access model resolution

- Sesión + tenant cliente + routeGroup `client` (`src/lib/tenant/authorization.ts:299`).
- Capability `growth.seo.report.read_client`, acción read/scope own; org deriva server-side.
- Flag `GROWTH_SEO_ENABLED` y assignment `seo_v2` activo/pilot, sin effective_to, por organización.
- Views `cliente.growth_seo_dashboard` y `cliente.growth_seo_report`; dashboard module-navigation,
  report child/header CTA, sin destino sidebar nuevo. Startup policy `client_default→/home`
  decide landing y no concede acceso.
- **Brecha de guard identificada en código:** las páginas SEO aplican capability/assignment, pero
  no `requireViewCodeAccess`. El grant cliente es por rol (`entitlements/runtime.ts:3107`),
  no demuestra que se honre una revocación individual de esa view. Guard canónico:
  `src/lib/client-portal/guards/require-view-code-access.ts:56`. Verificar con test de revocación
  de view/menú/puerta antes de release; owner Client Portal/Identity. Sin canary live ni prueba
  de explotación en este discovery. Cualquier fix de acceso sigue carril issue/ADR/hook propio,
  sin introducirlo silenciosamente en el adapter de población.

Skills: `seo-aeo` para fuentes/honestidad, Product Design (`get-context`/`ideate`) para alternativas,
`greenhouse-ai-design-studio` para reuso/contrato visual y `greenhouse-documentation-governor`
para continuidad documental. Antes de código: goal/task-hook y plan formal; antes de JSX/copy,
follow-up UI, selección, wireframe/flow/motion aplicables y GVC. No se inició implementación.

## Matriz de verificación pendiente

| Familia | Resultado esperado |
| --- | --- |
| Ambas fuentes | Ventanas y cortes propios; sin fusión. |
| GSC-only / onboarding | Clics/CTR visibles; rank pendiente sin cero ni sustitución GSC. |
| Rank-only | Trayectoria rank disponible; tráfico GSC ausente. |
| Connected-empty | OAuth activo sin capturas; no invita a conectar otra vez. |
| Ninguna / unknown | Razones distintas para ausencia y fallo al determinar conexión. |
| Sparse y stale | Pueden coexistir; no aparentar continuidad ni actualidad. |
| Partial | Excepción y fallo tipado de una fuente conservan las otras. |
| Sin período previo | `previous:null`; «Primer período con datos», sin delta contra cero. |
| Cero medido actual/previo | Conserva cero respaldado por capturas; CTR null sin impresiones. |
| Rank capturado sin posición | Sin posición cero ni cobertura ausente fabricada. |
| No-AEO | GSC/rank conservados; AEO ausente declarado. |
| Sin target / mercado ambiguo | Razones distintas; sin resolver un país al azar. |
| Cola absent/stale/failed/disabled | Disponibilidad y motivos separados, sin ranking alternativo. |
| Locked | Mock revisable; permisos de rutas reales intactos. |

Fixtures de ejemplo con selector autenticado `?fixture=`, reloj fijo y nombres ficticios.
Una org con score AEO de dominio constante no puede poblar los cuatro cuadrantes a la vez.
Una vista didáctica requiere ejemplos separados rotulados como ilustración; nunca AEO por keyword
fabricado. El test de clasificación ya cubre los cuatro cuadrantes.

Pruebas futuras: matriz del compositor, paridad contra reader GSC, null/cero, selección canónica,
frontera de imports de fixtures, guards de rutas y desktop/390px por familia semántica.
El guard debe detectar atribución cruzada de fuente, no sólo replicar un caso feliz.

## Brief de UI y ownership

Persona: cliente contratado de Search Visibility 360, mono-organización. Objetivo: entender qué
resultado orgánico existe, qué fuente falta y qué revisión procede, sin configurar capturas pagadas.
Superficie: Resumen de `/growth/seo`; tabs y acceso actuales conservados como base.

TASK-1690 conserva `backend-data / UI impact:none`. La implementación visible pertenece al
follow-up `ui-ux` todavía sin ID; no reabrir TASK-1310 complete ni convertir1690 en híbrida por
esta propuesta. El backend debe dejar el contrato listo para ese consumidor.

Tres direcciones a explorar con Product Design, sin cambio de marca:

- Hoja ejecutiva: clics dominantes, CTR/contexto y evolución; una superficie de evidencia con divisores.
- Cobertura primero: fuentes independientes y observaciones de onboarding; evita gráfico vacío enorme.
- Prioridad con evidencia: lista canónica cliente con contexto de selección; requiere cola disponible.

Reuso: `SurfaceRecipe analyticsReport`, `CompositionShell`, `WorkbenchHeader report` en `header`,
`SignalStrip integrated`, `OperationalSection open`, estados y alternativas tabulares existentes.
Geist para producto/números; Poppins sólo títulos; Core Blue para primaria, neutrales AXIS/MUI.
Sin cards anidadas, score combinado, rainbow de estados ni chrome por delante del primer dato.

Mobile390: título/período → conclusión → cifra válida o razón → siguiente acción → evidencia.
Serie escasa usa observaciones/cobertura antes que gran chart. Estado onboarding: «Ver cobertura»;
cola válida: «Revisar prioridades». Acciones sólo de lectura, contextualizadas por disponibilidad.
Informes Insights como secundaria sólo con edición/binding/autorización reales. El renderer legacy
`/growth/seo/report` conserva compatibilidad; no ampliarlo como segundo sistema de informes.

Referencias inspeccionadas: las dos PNG históricas bajo `docs/ui/evidence/task-1675/`.
Son referencia visual, **no captura del estado actual**. No se encontró una app Greenhouse local
corriendo; los servidores de Studio/AXIS/Think no se usaron como si fueran Greenhouse.

## Evidencia y límites

Tres subagentes autorizados, lanes independientes: contratos/data; fixtures/anti-regresión;
UX/reuso/acceso. Sin ediciones de subagentes ni llamadas a proveedores.

Baseline ejecutado:

```text
pnpm vitest run src/lib/growth/seo/client \
  src/components/growth/seo/report-artifact/__tests__/model.test.ts \
  src/lib/growth/seo/__tests__/grounded-query-bridge.test.ts \
  src/lib/efeonce-insights/editorial/editorial.test.ts
5 archivos / 53 tests PASS
```

Esto acredita el código existente, no los estados todavía sin implementar. Authoring IA conserva
fallback determinista: no se convierte en dependencia de los estados cliente. No se ejecutó la
sonda PG antigua: imprime emails y referencia asignaciones históricas; actualizar/redactar antes
de usarla. Sin GVC nuevo, consulta PG, readback live, código, commit, push, deploy ni cierre de task.
Selección de UI y goal/preflight de implementación quedan pendientes para el siguiente pase.
