# QA Release Audit — EPIC-045, reconciliación y cierre (2026-10-04)

## Verdict

**PASS** para la reconciliación documental del alcance Insights; gates focales registrados abajo.
**CONDITIONAL PASS** para el cierre técnico de TASK-1962; **BLOCK** para cerrar las otras cinco hijas en curso.

Closure state: contratos desplegados, cierre de tasks pendiente. Ninguna hija pasó a `complete` en esta auditoría.
EPIC-045 pasa de `to-do` a `in-progress` para reflejar ejecución material, según el modelo operativo de epics.

## Scope

- Estado activo de EPIC-045, [arquitectura Insights](../../architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md), tasks 1848/1957/1962/1975/1990/1996, índices, documentación funcional, manual API/MCP, Handoff y skill viva con espejo Codex.
- Contratos bajo `src/lib/efeonce-insights`, reader SEO de causas y versiones publicadas de Greenhouse/Think; sólo lectura de runtime.
- Sin modificar código, flags, IAM, migraciones, ediciones, grants, correo, schedules o servicios. Sin commit/push/release.
- WIP preexistente de landing AI Visibility Report, línea gráfica y assets creativos preservado. Durante la auditoría apareció WIP concurrente en figuras/glyphs y contratos del Composer/Insights, también preservado y no atribuido a este cambio. Historia fechada y shards con hash no se reescriben.

## Risk Classification

- Riesgo documental medio: confundir despliegue, activación, verificación conductual y aprobación de cliente puede producir falsos cierres.
- Skills: `efeonce-insights`, `greenhouse-documentation-governor`, `greenhouse-qa-release-auditor`; `greenhouse-secret-hygiene` para la lectura privada de configuración.
- ADRs existentes: plataforma Insights y agent-context-router. No cambia ninguna decisión de arquitectura ni política de autorización.

## Evidence

| Comprobación | Resultado y alcance |
|---|---|
| GitHub PR #248 | `MERGED`, 2026-10-03T01:14:37Z; describe TASK-1962 y GA4. El merge `23a768997b7d` precede al release registrado `fe261ca2745f`. |
| Release run `37093141725` | `completed/success`, head `fe261ca2745f71a4bc37dc15cb5eb78ab4c9d020`, consultado 04/10. |
| GitHub PR #250 | `MERGED`, 2026-10-03T22:09:17Z, merge `36a73e7b7e195c04082a388efd52c28d5d983667`. |
| Release run `37158679961` | `completed/success`, mismo SHA de #250, consultado 04/10. No prueba por sí solo una edición nueva. |
| Código publicado | Los archivos `presentation/client-fit-gate.ts`, `presentation/content-contract.ts`, `commands/lifecycle.ts`, `sharing/web-model.ts`, `adapters/seo-adapter.ts`, `adapters/ico-adapter.ts` y `growth/seo/overview/read-window-movers.ts` existen en ambos releases. Sus blobs en `36a73e7b7e19` eran idénticos al árbol en el momento de esa comprobación; el WIP concurrente posterior se excluye de esta evidencia. |
| AXIS tag | `refs/tags/v0.3.42` existe, objeto tag `800cce1d497e9d28ce1bc1aa54c76ea278a03ac2`, leído 04/10. La inexistencia de un GitHub Release no implica ausencia de tag o publicación. |
| Think remoto | `main=0c5701aa1f2845be56556644e27f4dce727f7fa4`, leído 04/10. Es el consumer que el release registra; no se generó otro deploy. |
| Vercel Production | Alias `greenhouse.efeoncepro.com` resuelve a `dpl_7Qb82GFi4Vkz3oDSyTN5M6aoy7Gh`, `READY`, target `production`. `vercel inspect --json` no devolvió el SHA; no se deduce desde la fecha. |
| Flags Vercel Production | Readback 2026-10-04T09:38:08Z: los ocho `INSIGHTS_*_ENABLED` de generación, render, autoría IA, editorial v2, sharing, emisión, delivery y schedules son `true` exacto. Archivo temporal privado destruido; sin registrar secretos. |
| PG canónico, sólo lectura | 2026-10-04T09:37:38Z: perfil `runtime`, pool canónico, máximo una conexión; 0 filas de ediciones creadas desde 2026-10-03T01:14:37Z que tengan snapshot y plan. Consulta acotada a ocho resultados recientes. No afirma ausencia de borradores sin snapshot/plan ni distingue staging de producción: la instancia es compartida. |
| Pruebas focales actuales | `pnpm vitest run` sobre `presentation/content-contract.test.ts`, `presentation/presentation.test.ts`, `sharing/sharing.test.ts`, `adapters/adapters.test.ts`, `editorial/editorial-v2-producers.test.ts` y `commands/commands.test.ts`: 6 archivos, **116/116 PASS**. |
| Cloud Run actual | No revalidado: gcloud no pudo renovar su autenticación y exige reautenticación interactiva. Los runs exitosos son evidencia de los releases, no un readback nuevo de salud/env del worker. |

Fuentes externas: [PR #248](https://github.com/efeoncepro/greenhouse-eo/pull/248), [run de contenido](https://github.com/efeoncepro/greenhouse-eo/actions/runs/37093141725), [PR #250](https://github.com/efeoncepro/greenhouse-eo/pull/250), [run de figuras](https://github.com/efeoncepro/greenhouse-eo/actions/runs/37158679961).

## Closure Review

| Task | Veredicto | Siguiente evidencia o trabajo concreto |
|---|---|---|
| TASK-1962 | Candidata más próxima; `in-progress` | Contrato y siete criterios funcionales implementados, publicados y pruebas focales verdes. Falta una edición nueva en el runtime publicado, leer sus campos de contenido del modelo 1.4 y registrar la revisión prevista. La prueba de un preview local sobre evidencia anterior no sustituye ese paso. No falta otro release del contrato. |
| TASK-1957 | Mantener `in-progress` | Canary productivo del contenido/gate de 1.2 sobre el modelo vigente 1.4, aceptación pendiente del criterio AEO y copy de límites. No exigir volver a emitir `modelVersion=1.2`. |
| TASK-1975 | Mantener `in-progress` | Revisión del operador de Berel/Sky; promover/verificar fixes posteriores (`8e4fbac7b`, `c782449f0`, porcentaje menor que 1 y encaje de unidad). Color por rol de parte en dona/waffle sigue como decisión abierta. |
| TASK-1990 | Mantener `in-progress` | Slice 1 de 19 plataformas, `channelForDomain` y pruebas de mezclas ya hecho en `03e19f3ee`, posterior al release. Falta promoción, `metricIcon` y decisión de visitas por asistente. El canal se deriva del hecho; no falta un campo de canal autorado en el plan. |
| TASK-1996 | Mantener `in-progress` | Cifra única adaptable ya hecha en `03e19f3ee`, pendiente de promover; glifos Trazo de clics/impresiones/CTR/posición y 10 isotipos sin productores de TASK-1991/1992; cierre visual pendiente. |
| TASK-1848 | Mantener `in-progress` | Flags ON no prueban canary App humano/MCP ni entrega. Portal link (1849), Hub/in-app/Teams/preferencias (690–693), correo aprobado/baja (1944/1774) y guard público (1876) tienen dueños propios. |

Las once hijas `to-do` —1849, 1901, 1902, 1903, 1958, 1960, 1961, 1991, 1992, 1994, 1995— conservan trabajo funcional pendiente. Las siete `complete` —1845, 1846, 1847, 1875, 1888, 1889, 1974— conservan su cierre histórico. Censo directo del campo `Epic`: **24 hijas, 7 complete, 6 in-progress, 11 to-do**.

## What Can Still Break

- Una edición sellada antes del release conserva su plan: leerla o renderizarla de nuevo no prueba la generación nueva.
- El flag de schedules sólo habilita borrador y render; no prueba emisión ni envío automático.
- Los ajustes posteriores al release no están incluidos en el SHA publicado por el mero hecho de estar en `develop`.
- Un diseño aprobado en AXIS no demuestra adopción de todos sus glifos/isotipos en cada consumidor.
- Los merges son squash: se contrastan blobs, no se exige ancestry de commits de `develop`.

## Not Validated

- Nuevo canary autenticado de contenido, gate client-fit, emisión, entrega o recurrencia.
- Revisión humana de Berel/Sky; no se sustituye ni se declara aprobada.
- Salud/configuración actual de Cloud Run y nueva prueba visual del archivo producido por ese runtime.

## Gates

- Preflight `pnpm ops:lint --changed`: 0 errores; 14 warnings de paridad de otros epics, fuera de alcance.
- `pnpm qa:gates --agent codex --docs -- <paths>`: revisión documental; sin requerimiento de cambios de código.
- `pnpm task:lint --task` para las seis hijas en curso y `pnpm epic:lint --item EPIC-045`: 0 errores / 0 warnings.
- Cierre documental estricto con paths propios (`node scripts/check-documentation-closure.mjs --strict -- <paths>`): 0 warnings. Wrapper `pnpm docs:closure-check` también pasó sus gates transversales; los argumentos de scope del wrapper no se propagan al primer comando.
- Espejo focal Insights: ocho archivos idénticos byte por byte. `pnpm skills:mirrors` global detectó cinco diferencias del trabajo concurrente en motion/social/Marketing Studio; fuera de este alcance, preservadas.
- `git diff --check` PASS. `pnpm docs:context-check:strict`: 0 errores / 0 warnings. Se rotaron dos entradas antiguas del changelog (la segunda tras un commit concurrente) con la herramienta canónica; contenido previo del shard intacto y entrada archivada verbatim.

## Required Next Step

Primero verificar una edición interna nueva de TASK-1962 con el código publicado, sin emitir ni enviar al cliente durante la verificación. Luego completar el canary/decisión de TASK-1957 y la revisión de TASK-1975. La creación en runtime y cualquier promoción de fixes requieren su carril operativo; no se ejecutan por corregir documentación.
