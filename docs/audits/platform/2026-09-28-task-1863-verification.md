# TASK-1863 — evidencia de implementación y límites de rollout

Fecha: 2026-09-28. Checkout develop compartido. Implementación publicada en staging; main en espera.
Las secciones locales documentan la fase previa. El estado vigente está en «Rollout staging autorizado».

## Google AI Mode: evidencia directa

- Catálogo vivo gratuito: 23 mercados verificados y 4 códigos de idioma (`es`, `en`, `pt-BR`, `fr`).
  [Readback sanitizado](evidence/task-1863/provider-catalog.json).
- Canary del adapter canónico con una pregunta por país: **22 succeeded**, **Cuba skipped:market_unsupported**,
  cero errores y cero fallback de país. Los 22 calls devuelven task `20000` y cuestan USD 0,004 cada uno:
  **USD 0,088** para la ronda completa. Cinco probes previos por idioma costaron USD 0,020; total USD 0,108.
  [Resultados por país, locale, ubicación y costo](evidence/task-1863/google-ai-mode-markets.jsonl).
- España `2724/es`, México `2484/es`, EE. UU. `2840/en`, Brasil `2076/pt-BR`, Haití `2332/fr`.
- Un resultado sin citas atribuibles se conserva como tal; no se convierten redirects Google en dominios
  citados del cliente. No se almacenaron estos probes como informes ni se tocaron runs históricos.
- Estas pruebas verifican el adapter local contra el proveedor, **no** un despliegue de Vercel/worker.

Fuentes de contrato: [AI Mode Live Advanced](https://docs.dataforseo.com/v3/serp-google-ai_mode-live-advanced/),
[catálogo de idiomas](https://docs.dataforseo.com/v3/serp/google/ai_mode/languages/),
[catálogo de ubicaciones](https://docs.dataforseo.com/v3/serp-se-locations/).

## Pruebas locales ejecutadas

- Regresión ampliada: **103 archivos / 810 pruebas PASS** (Grader, catálogo, gap SEO, clientes HTTP,
  entitlements y renderizadores de informe). Se agregaron después pruebas explícitas Cuba y es-419;
  el resultado final se registra al cierre de QA.
- PostgreSQL efímero, puerto 55463 y data_directory validado antes de cualquier escritura:
  **11 pruebas PASS**, incluyendo enqueue real que persiste país/locale/snapshot/prompts; rollback total
  ante fallo del segundo mercado; dos solicitudes concurrentes compitiendo por cuota; presupuesto total;
  asignación vencida, mercado no contratado, conflicto de idempotencia y denegación de autoridad.
  Incluye flag OFF en mercado secundario, reserva diaria y concurrencia sobre presupuesto recurrente.
- Migraciones **Up → invariantes → Down → Up PASS** en una base temporal que el harness retira.
  Identidad de mercado, set de competidores y snapshot inmutables; principal único, transferencia atómica,
  ausencia de principal rechazada, FK entre perfiles rechazada y espejo de cadencia trimestral comprobado.
  La prueba encontró y corrigió el orden de DROP INDEX antes de DROP COLUMN en Down.
- `pnpm migration-marker-gate`: 0 errores, dos warnings de migraciones anteriores ajenas a TASK-1863.
- `pnpm worker:build-contract-gate`: PASS. No se crea un servicio/worker nuevo.
- Build de producción Next: compilación, TypeScript y generación de 26 páginas completados, exit 0.
  La envoltura local restauró tsconfig.json después del build aislado.
- PDF real sintético generado y portada inspeccionada: texto **“4 de 5 motores respondieron”** visible,
  sin recorte. Artifact local `.captures/task-1863-report-proof/report.pdf` y `cover.png`.
  Es prueba del renderizador del PDF y copy compartido; no certifica navegación de un portal desplegado.

## Esquema y datos

El DDL aditivo y la compatibilidad legacy están aplicados; 27 perfiles tienen principal tras el backfill.
Los cuatro perfiles Efeonce siguen activos. El contract destructivo sigue parqueado y no se aplica
antes de main. No se reescribió la geografía histórica ni se consumió la cuota de Sky.

## QA local

- Typecheck final PASS, lint del alcance PASS; formato del archivo generado DB preservado (66 líneas aditivas).
- PostgreSQL efímero recreado después de interrupción: Up/Down/Up y 11 tests transaccionales PASS.
- Matriz: 4 pruebas PASS (separación, ausencia de medición, selección ajena y autoridad).
- Scoring/matching/tendencia/señales: 22 pruebas PASS; legacy con recompute conserva evidencia persistida.
- Skills mirrors, flags strict sin Vercel, worker dependencies/build contract, migration marker y reachability PASS.
- Task lint sin warnings. Ops lint sin errores; warnings previos de paridad de epics.
- `pnpm docs:closure-check` completo PASS (incluye flags, índice Creative Studio, inventario y frescura).
  Cierre scoped: 0 errores, 2 warnings de tamaño/estructura de los canones existentes;
  se conserva el ADR temático y no se mezcla una reestructuración documental global.
- Suite general `vitest --project unit --maxWorkers=4`: **1.852 archivos PASS, 2 omitidos; 15.886 tests PASS,
  33 omitidos, cero fallos** (350,45 s). Matriz y refuerzo legacy se verificaron además en la ronda enfocada.
- El lint global inicial detectó formato en WIP DataForSEO concurrente; el operador pidió corregirlo.
  Autofix aplicado y comprobado: `pnpm exec eslint scripts/dataforseo src/lib/ai`, 0 errores.
  Pre-push compartido final PASS: lint global 0 errores/26 warnings existentes y TypeScript PASS.
- Build final de producción PASS (exit 0): compilación, TypeScript, páginas y rutas. El wrapper
  restauró tsconfig.json; `git diff --check` PASS. Logs locales en `.captures/task-1863-qa/`.

La suite `live` del repo escribe en Cloud SQL compartido; no se ejecuta como prueba local. El alcance DB
se verifica con el harness efímero y se deja el canary de rollout sin tildar.

## Veredicto

**Staging verificado para Efeonce, Sky y entrada directa BR; main en espera.** La entrega satisface catálogo,
localización, ubicación nativa, Google AI Mode, snapshots, lotes y matriz. La última protección de
comparabilidad de identidad está en publicación; el cierre se registra al final.

## Rollout staging autorizado (2026-09-28)

Main sigue en espera. Migraciones `20260928094832901` y `20260928095058691` aplicadas;
backfill transaccional aplicado a 27 perfiles, 27 principales creados. La suposición de perfiles
duplicados de Efeonce fue corregida: tres archivados temporalmente fueron restaurados y auditados,
los cuatro permanecen activos con 14 runs históricos intactos. CL/CO/PE/MX confirmados por operador;
las filas legacy registran CL y no se reasignan por inferencia. Evidencia en `evidence/task-1863/`.

Lint de `scripts/dataforseo` y `src/lib/ai`: 0 errores tras autofix solicitado por el operador.
Compatibilidad de nombres de un carácter preservada (fixture legacy y marcas como X), con word boundaries
y prueba dedicada. El backfill usa el mismo cliente transaccional para leer cada perfil.

### Publicación y configuración verificadas

- Commits de implementación `ddcf2ca4e`, compatibilidad `eabd3a29d` y contexto `6d25fac68` en develop remoto.
- Vercel staging READY: `dpl_FxC9XctgFsRB1S4tzBiksQGzYhzY`, SHA `6d25fac68`.
- Ops Worker Deploy [36406811838](https://github.com/efeoncepro/greenhouse-eo/actions/runs/36406811838): success.
  Revisión `ops-worker-00730-jdk`, Ready/RoutesReady/ConfigurationsReady=True, tráfico 100%, SHA `eabd3a29d`.
- Flag multimer­cado ON sólo en custom environment staging; producción sin habilitar. Worker compartido
  conserva OFF para recurrencia secundaria mientras main usa el writer anterior; ejecuta los lotes explícitos.
- Main leído directamente: `92002873ced9508433e9c6d56000417a9193886b`, igual al preflight.
- Cuatro mercados Efeonce creados por API autenticada staging: CL/es-CL, CO/es-CO, PE/es-PE y MX/es-MX.
  CL conserva cuatro competidores; los otros sets esperan confirmación de correspondencia, no se infieren.

### Corrección de categoría solicitada por el operador

Efeonce es agencia de marketing, creatividad, SEO y RevOps. El perfil `EO-GAVP-0020` tenía categoría
legacy “Growth Operating System”. Se corrigió mediante reconciliación transaccional auditada a
`sector:marketing_services` (resolución canónica taxonomy_alias), conservando el modelo B2B.
La descripción explícita conserva marketing, creatividad, SEO y RevOps.

El primer lote `EO-GRBT-00001` fue sustituido: runs 58/59/60 aún pending se cerraron como failed antes
de gastar; run 57 ya running conserva sus snapshots/evidencia original. No representa la categoría corregida.
El lote corregido `EO-GRBT-00002` contiene runs 61–64, cuatro mercados, techo agregado USD 2.
Repetir el POST devuelve los mismos cuatro IDs con `idempotentHit:true`. Su resultado final se registra abajo.

### Hallazgo del recorrido completo: reader de tendencias

Los modelos terminaron y los scores se persistieron, pero el reader de informe devolvió 500.
PostgreSQL confirmó `42601: subquery must return only one column` en la comparación de mercado/locale/policy.
La corrección usa `ROW(...)` y excluye también categorías distintas para que el canary anterior no
contamine tendencias. Regresión sobre PostgreSQL efímero: 12 pruebas PASS, incluida exclusión de otro
país, policy y categoría. Lectura contra el run real corregida; publicación `c5902e929` en curso.
Se recuperarán informes desde las observaciones ya persistidas, sin nuevas llamadas a proveedores.
CI de implementación `36406811777`: success.

### Resultado del lote corregido

`EO-GRBT-00002`: CL/CO/MX/PE succeeded, 24 observaciones válidas por país (**96/96**, cero fallos),
incluidas 6 de Google AI Mode por país (**24/24**, geo nativa correcta). Cuatro scores persistidos.
Costo estimado total USD **1,0983**; techo agregado USD 2. El lote previo consumió USD 0,2515
en su única corrida iniciada; las otras tres se detuvieron con costo cero.

Recuperación mediante `finalizeRunDelivery` canónico: cuatro informes `ready`, sin repetir proveedores.
Se respetó el gate de publicación (ready en los cuatro); los runs de operador no tienen lead para email.
Ver [canary](evidence/task-1863/canary-runtime.json), [recuperación](evidence/task-1863/delivery-recovery.json)
y [lote sustituido](evidence/task-1863/superseded-batch.json). Reader y matriz verificados por API autenticada en Vercel `c5902e929`: HTTP 200, cuatro informes ready,
ubicación por proveedor y `blendedOverall:null`. [Readback](evidence/task-1863/staging-matrix-readback.json).

### Universalidad: marcas y entradas

El caso Efeonce sólo configura datos de ese tenant. Catálogo, snapshots, country/locale, adapters,
scoring y reader de tendencias viven en componentes comunes, sin IDs ni nombres de Efeonce en runtime.
Se reforzó `buildExecuteInput`: las entradas antiguas sin `businessModel` usan el clasificador existente
sobre su categoría resuelta. Un modelo explícito, incluido unknown, tiene prioridad; nunca se infiere
agencia por el nombre de la marca. Categoría no resuelta permanece bloqueada antes del gasto.

Regresión: **71 pruebas PASS** en 8 archivos. Incluye seis tipos de marca (aerolínea/retail/SaaS/marketplace/
institución/agencia) × 23 países × 4 idiomas (**552 combinaciones**), paridad inline/async, entradas
públicas y proyección Forms, request de operador/portal, motor y matriz. No se crearon marcas cliente
ni se consumieron cuotas para esta prueba.

Rutas vigentes: operador y portal → request-run → run-batch → commands; formulario legado, API directa
y proyecciones Forms → commands; recurrencia → run-batch; worker consume prompts/snapshot persistidos.
La exposición MCP multimer­cado corresponde a TASK-1861 y debe consumir estos mismos commands; no se
declara desplegada una tool nueva en TASK-1863. Refuerzo universal publicado en staging dentro de `999492e8d`.

### Readback final y límite de publicación

Corrección de informes `c5902e929` publicada: Vercel staging READY (`dpl_mcxg5ELouDWDTXT3eExSPkR5nGmL`),
API matriz/lote HTTP 200; worker `ops-worker-00731-75p` Ready=True, 100% del tráfico, mismo GIT_SHA.
Main sigue en `92002873ced9508433e9c6d56000417a9193886b`.

El operador autorizó publicar el checkout compartido manteniendo main en espera. El refuerzo universal
está desplegado en `999492e8d`: Vercel `dpl_5tqcpZ6yCfAi2Rc97rBmWCi4Rwqu` READY y worker
`ops-worker-00732-86r` Ready=True con tráfico 100%. Producción Vercel conserva `92002873ced9`.
El control documental de 999 falló por 12.127 tokens de Handoff y 61 entradas de changelog;
la corrección `7f137d62d` pasa sobre el índice exacto (11.970 tokens, 60 entradas, 0 errores/0 warnings).
Se preservó el historial y se dejaron fuera del commit las compactaciones paralelas de Handoff.

### Sky, Brasil y comportamiento degradado

- `EO-GRBT-00003`: Sky CL/AR/BR/CO/PE/UY, modo light, techo USD 3, costo estimado **USD 1,8482**.
  144 observaciones: **143 succeeded**, una `rate_limited` de Perplexity en PE; **Google 36/36** con
  ubicación nativa por país. Cinco runs succeeded y PE partial. Seis informes disponibles; el informe
  PE declara gate partial. Matriz por API staging HTTP 200, `blendedOverall:null`, sin señales de error.
- Base de competidores confirmada en la task: LATAM, JetSMART, Avianca, Gol; no se inventaron aerolíneas
  locales. Canal operator: no consume cuota de portal ni modifica mercados comerciales incluidos.
  Los aliases Sky Airline/Sky Airlines/SKY se configuraron después del enqueue: el primer lote conserva
  el nombre canónico legacy y su snapshot original; los siguientes usarán los aliases. No se re-scorea
  el histórico para simular que ya existían. Este cambio motivó la protección de comparabilidad de abajo.
- `EO-GRUN-00071`: API admin directa con `AIRLINES_AVIATION`, **sin businessModel**, BR/pt-BR.
  Resolvió `archetype-consumer_b2c.v1.market-v1.pt-BR`; 24/24 observaciones válidas, Google 6/6,
  informe ready, costo estimado **USD 0,3072**. Perfil smoke sin organización, sin consumo de cuota cliente.
- Se usó el drain canónico desplegado para las corridas ya encoladas, con claim atómico y batchSize 1;
  antes de cada invocación se comprobó que la cola pendiente sólo contenía IDs del canary.
  Una invocación perdió la respuesta HTTP; el readback posterior verificó sus runs terminales e informes,
  sin reintentar ni duplicar gasto.

Evidencia: [Sky](evidence/task-1863/sky-runtime.json), [matriz Sky](evidence/task-1863/sky-staging-matrix-readback.json),
[Brasil](evidence/task-1863/brazil-runtime.json), [worker](evidence/task-1863/worker-universal-readback.json),
[producción sin promover](evidence/task-1863/production-deployment-readback.json).

### Comparabilidad de identidad de marca

Se reprodujo en PostgreSQL real que un cambio de nombre, aliases o dominio podía elegirse como
comparación histórica de una identidad distinta (tres regresiones fallaban antes del cambio). El reader
ahora compara el objeto `brand` completo del snapshot, incluida la categoría, conservando el contrato
legacy cuando ambos snapshots son null. Prueba de la corrección: **15/15 PASS** en PG efímero;
ningún dato histórico se modifica. El cambio sólo afecta la selección de referencia de la tendencia.

### Coordinación del checkout compartido

El cierre pasó por el pre-push completo (lint sin errores y TypeScript PASS). Se preservó WIP ajeno;
el operador autorizó únicamente cinco saltos de línea de DataForSEO y la conversión de fixtures
inválidas `as unknown as SurfaceIntent` en una prueba de Brand Surfaces. Esos archivos no forman
parte de los commits de TASK-1863. `d86edb784` ya está en develop remoto; main no se promovió.


### Última publicación y bloqueo externo (28-09)

`d86edb78419dad324943804e8d003dd18ffbea31` está READY en Vercel staging, deployment
`dpl_3cjJrNALDj8QSK6awzGfG7sqTjkU`. Agent Context Governance, Task Contract y Playwright smoke
terminaron success. El despliegue de ops-worker `36413423962` falló en Cloud Build
`88689e49-8cc0-4f90-a979-561f40f3e383`, antes de crear una revisión nueva: GitHub Packages devuelve
HTTP 403 para `axis-graphic-line@0.7.0` con **Account has reached its billing limit**.
La descarga directa autenticada confirmó el mismo diagnóstico; no se rotó ni sustituyó la credencial.
El worker conserva `ops-worker-00732-86r`, GIT_SHA `999492e8d`, Ready=True y 100% de tráfico.
La última protección de comparabilidad todavía requiere publicar el worker cuando se habilite cuota.
No se presenta este bloqueo como cierre completo ni se reintenta el build sin resolver su causa.

Main y Vercel Production permanecen en `92002873ced9508433e9c6d56000417a9193886b`.
[Deployment final](evidence/task-1863/final-staging-deployment.json) ·
[bloqueo del worker](evidence/task-1863/final-worker-blocker.json).

El checkout adicional `aeo-staging-rollout` quedó archivado por la herramienta de la app, con snapshot
recuperable. No tenía WIP ni procesos activos; su único commit documental `8d4815d7f` fue superado
por la corrección de contexto `7f137d62d` del checkout original. Se retiró temporalmente la fijación
de esta tarea para liberar la protección y se restauró al terminar. El checkout original
`/Users/jreye/Documents/greenhouse-eo` se conserva y concentra el trabajo; otros checkouts no se tocaron.

Readback posterior a Vercel READY: matrices Efeonce (cuatro) y Sky (seis) HTTP 200;
Sky PE conserva gate partial, el resto ready, sin blendedOverall.
[Evidencia final](evidence/task-1863/final-matrix-readback.json). El CI general `36413423815`
seguía en ejecución al registrar este cierre; no se declara verde sin su resultado.


### Recuperación final de cuota y cierre de staging (28-09, 11:31 UTC)

El operador actualizó el límite de GitHub Packages. La descarga real de AXIS con la credencial
canónica devolvió HTTP 200; no se rotaron credenciales. Se reintentó únicamente el job fallido de
ops-worker, mismo SHA `d86edb78419dad324943804e8d003dd18ffbea31`, sin publicar commits paralelos.
Cloud Build `4299bcee-6366-4fbc-a257-4c2ed7bad626` terminó SUCCESS. Revisión
`ops-worker-00733-5s6`: Ready/ConfigurationsReady/RoutesReady True, GIT_SHA esperado y 100% del
tráfico; spec.traffic y status.traffic concordantes. `/health` autenticado respondió HTTP 200, status ok.
El bloqueo anterior queda resuelto; la protección de identidad ya está en Vercel y worker.

CI general `36413423815` terminó **success**, incluidos tests y build. Los informes existentes siguen
accesibles por matrices staging: cuatro Efeonce y seis Sky, con PE partial de Perplexity explícito.
No se encolaron nuevas corridas ni se repitieron consultas pagadas a proveedores para este redeploy.
Main y el deployment Production permanecen en `92002873ced9508433e9c6d56000417a9193886b`.
El worker conserva multimer­cado OFF para recurrencia secundaria mientras main siga en espera;
Vercel staging mantiene multimer­cado ON. La task conserva lifecycle in-progress por ese límite de release.

Evidencia: [cuota recuperada](evidence/task-1863/packages-quota-recovery.json),
[CI](evidence/task-1863/final-ci-success.json),
[revisión](evidence/task-1863/worker-quota-recovery-readback.json),
[tráfico](evidence/task-1863/worker-quota-recovery-traffic.json),
[salud](evidence/task-1863/worker-quota-recovery-health.json).
