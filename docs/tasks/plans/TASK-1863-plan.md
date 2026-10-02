# TASK-1863 — Plan de ejecución

## Autorización y objetivo

28-09-2026: Julio confirmó el goal y pidió resolver la capacidad multidioma completa, incluido EE. UU.
La implementación inicial se ejecutó en develop compartido, sin subagentes ni checkouts aislados. El operador autorizó después
push y despliegue a staging, DDL/backfill y canary; `main` permanece en espera. Vercel y ops-worker
publicados, backfill de 27 perfiles aplicado. Conservar históricos y cuatro perfiles Efeonce activos.

## Audit

- Correcto: cuatro mapas divergentes, strings libres en admin, fallback Google a US, idioma en fijo,
  país literal en prompts, normalización desde perfil mutable. Caso PE/Perú reproducido en auditoría.
- Drift: AI Mode ya documenta `es`, `en`, `pt-BR`; portugués usa código específico, no `pt`.
  La spec propone re-enlazar todos los runs históricos: se conserva una asociación administrativa
  opcional con procedencia legacy, sin inventar snapshot/geo efectivo ni modificar observaciones/score.
- Reuso: `commands.ts`/`run-engine.ts`/`store.ts`, DB/withTransaction, adapters web-search y clientes
  canónicos AI; policy, presupuesto/entitlements, outbox, category guard, report view-facts.
- Arquitectura: dominio `growth/ai-visibility`, catálogo puro `growth/markets`, API thin, worker existente.
  Nueva decisión de contrato en arquitectura; no packages ni servicios nuevos.
- Runtime: `pnpm pg:doctor` PASS 28-09; base compartida. Preflight de esquema read-only y DDL en
  transacción revertida cuando sea viable; no aplicar mutaciones históricas como smoke.
- Access: capabilities del dominio, scope organización resuelto por sesión; configuración sólo interna.
- Riesgos: gasto N veces, enqueue parcial, idioma distinto al solicitado, comparación histórica inválida,
  países ambiguos, backfill en base compartida, adopción simultánea Vercel/worker.
- Skills: DataForSEO, SEO/AEO, software-architect-2026, task-execution-hook, documentación y QA.

## Open questions resueltas para implementación

- No ampliar derechos comerciales de Sky ni inventar competidores locales. El código permite configurar
  sets/tiers; el rollout usa la base confirmada y requiere readback de derechos vigentes.
- Conservar el perfil libre Sky como histórico separado, sin fusionarlo por similitud de nombre.
- Alias admiten `word_ci`/`word_cs`; nombre canónico y aliases van en el snapshot de cada run nuevo.
- País e idioma son independientes. Cada mercado admite las familias implementadas es/en/pt-BR/fr;
  locale explícito se valida, no se sustituye silenciosamente por el idioma del país.

## Subagent strategy

Implementación inicial secuencial: el goal confirmado excluía subagentes; slices compartían store, run-engine y contratos.
El operador autorizó después tres subagentes para la revisión documental final: skills, docs y auditoría
de completitud, todos en el checkout original y sin ownership solapado.
La autorización cubre el plan de la task y su delta multidioma. Checkpoints adicionales sólo ante
mutación externa no autorizada o conflicto real con trabajo ajeno.

## Slices y evidencia

1. Catálogo, resolución de geo/locale, provider policy versionada, catálogo gratuito verificado y
   error previo al gasto. Matriz de tests los 23 mercados de LATAM + PR + ES + US, aliases y locales inválidos.
2. Packs es/en/pt-BR/fr completos y geo por provider usando clientes existentes; payload tests y cero
   traducción generativa en runtime. Google sólo location_code; no country fallback.
3. Migraciones aditivas de mercados/sets/lotes/snapshots/geo/capability, invariantes y backfill dry-run.
4. Commands de configuración + autorización, concurrencia, audit/outbox y rutas thin; contracts tests.
5. Enqueue atómico, snapshots, matching de aliases, budget agregado e idempotencia; consumo worker.
6. Autoría por mercado, readers/matriz/tendencias, regrade y matching con target SEO.
7. Facts de cobertura honestos para reporte/PDF, docs funcionales/manual/canon/flags y QA proporcional.
8. Tests, typecheck, lint/build y gates; dejar manifiesto de rollout y evidencia no ejecutada.

## Estado

- [x] Hook, scope y lectura de task.
- [x] Auditoría de raíz y documentación oficial AI Mode.
- [x] Slices 1–8 implementados y verificados localmente; ver auditoría para evidencia local y runtime.
- [x] DDL/backfill, publicación Vercel staging + worker y flags verificados.
- [x] Canary Efeonce CL/CO/PE/MX: 96/96 respuestas, cuatro scores e informes ready; matriz staging HTTP 200.
- [x] Refuerzo universal f7d2578a5 publicado en staging dentro de 999492e8d; API sin businessModel verificada, 71 pruebas/552 combinaciones.
- [x] Sky seis mercados y BR por API directa verificados en staging; informes y matriz disponibles, un rate limit Perplexity declarado como parcial.
- [x] Protección adicional de tendencias por identidad d86edb784 publicada: Vercel staging READY; worker ops-worker-00733-5s6 Ready, salud HTTP 200 y tráfico 100%; 15 pruebas PG PASS y CI general success. El operador resolvió la cuota Packages; descarga real HTTP 200 y Cloud Build success.
- Main explícitamente en espera; recurrencia secundaria y contract destructivo no se activan en esta fase.

## Evidencia de implementación

[Auditoría QA](../../audits/platform/2026-09-28-task-1863-verification.md): catálogo y canary vivos,
PG efímero con atomicidad/concurrencia y Up→Down→Up, suites y build. Las rutas finales están en el
manual. La asociación administrativa de runs legacy propuesta arriba NO se implementa: no hay
backfill de geografía inferida. La configuración de prompts sí queda enlazada al principal original.

## Checkout

El checkout adicional `aeo-staging-rollout` quedó archivado con respaldo recuperable el 28-09.
No tenía WIP ni procesos activos; su compactación documental aislada fue superada por `7f137d62d`.
Todo el trabajo funcional y la evidencia están consolidados en el checkout original de develop.
