# EPIC-045 — Efeonce Insights: inteligencia de clientes multiformato

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform|growth|delivery|ui|cross-domain`
- Owner: `Platform / Client Experience; Julio Reyes (producto)`
- Branch: `Greenhouse develop; sin branch dedicada ni worktrees`
- GitHub Issue: `none`

## Summary

Construir Efeonce Insights dentro de Greenhouse: un encargo por cliente y ventana produce deck ejecutivo
horizontal, informe editorial A4 vertical y vista web responsive con acceso por token. Reutiliza Artifact
Composer/Worker, datos SEO/AEO/ICO, marca Efeonce con cliente opcional, historial y correo canónico. Las tres
superficies UI/API/MCP operan los mismos commands y fuentes.
Incluye autogestión del cliente autenticado y gestión de colaboradores internos autorizados, con
biblioteca/ediciones comunes y permisos distintos. EPIC-046 integra estos recorridos en Berel y Sky.
Insights por email, avisos in-app y Teamsbot con deep links acompañan el uso del portal; contrato de
activación/retorno en arquitectura §9.1. La app móvil queda para después.

## Why This Epic Exists

El motor visual existe, pero los jobs pertenecen a Proposal y el reporting está fragmentado por módulo.
Compartir un PDF manual no resuelve evidencia temporal, revisión, versiones, permisos ni recuperación de
entregas. Este programa coordina esas fronteras sin crear otro producto desplegable ni duplicar métricas.

## Outcome

- Una edición identificada y reproducible reúne web, deck e informe vertical, con datos y narrativa consistentes.
- SEO, AEO y RpA/OTD se integran por adapters versionados extensibles sin cambiar el Composer.
- Clientes consultan biblioteca propia, solicitan/generan informes permitidos y descargan salidas; colaboradores autorizados organizan, revisan y distribuyen desde Greenhouse. El enlace revocable conserva un acceso compartido separado.
- Correo con resumen útil y deep link a la edición, in-app y Teamsbot habilitado motivan consulta/acción; recurrencia respeta autorización, preferencias, aislamiento y estado real por canal.
- QA cuantitativo/visual, observabilidad, recuperación y rollout están incluidos en cada unidad.

## Architecture Alignment

- [EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md](../../architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md).
- [EFEONCE_INSIGHTS_ARCHITECTURE_V1.md](../../architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md).
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md`.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.
- `docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md`.

## Ejecución con Claude y Codex

Asignación del 2026-09-09 documentada por pedido del operador. Aplican las
[reglas compartidas de ejecución y revisión](EPIC-046-client-services-visibility-and-self-service.md#reglas-compartidas-de-ejecución-y-revisión):
un editor por archivos, review cruzada, esfuerzo proporcional, continuidad del owner y sin ejecución
implícita. Es una recomendación de reparto, no una certificación comparativa de modelos ni estado runtime.

| Task | Ejecutor recomendado | Esfuerzo | Responsabilidad y motivo |
|---|---|---|---|
| TASK-1845 | Codex · GPT-6 Astra | xhigh | Dominio/evidencia: ediciones, autoridad, aislamiento y contratos compartidos |
| TASK-1846 | Codex · GPT-6 Astra | xhigh | Render durable/Artifact Worker: concurrencia, recovery, idempotencia y compatibilidad |
| TASK-1847 | Claude · Opus 5 | xhigh | Gráficos/catálogos: composición editorial, geometría y calidad del archivo final |
| TASK-1848 | Codex · GPT-6 Astra | xhigh | Sharing, revocación, correo/recurrencia y prevención de duplicados |
| TASK-1849 | Claude · Opus 5 | xhigh | Biblioteca/builder/visor: recorridos cliente/interno, responsive y GVC |

**Orden:** TASK-1845 → TASK-1846/1847 → TASK-1848 → TASK-1849, respetando las dependencias de la tabla
Child Tasks. TASK-1847 prepara catálogos tras 1845; su export final depende de 1846. Preparar 1845 durante
el carril de datos del portal no obliga a esperar la implementación de Inicio ni habilita edición incompleta.

Revisión: Claude Opus 5 revisa el comportamiento de producto de las foundations de Codex; Codex revisa
contratos/datos de 1847 y autoridad/paridad de 1849, usando Astra `xhigh` en las fronteras críticas.
Revisar PDFs finales completos y GVC desktop/390; aprobar el modelo o los docs no aprueba su resultado visual.

**Integración SEO:** TASK-1672 (Claude · Opus 5 `high`) adapta la auditoría al catálogo; TASK-1673
(Codex · GPT-5.6 Sol `high`) integra compartir/enviar sobre TASK-1848. Ambas conservan EPIC-022 y sus
gates de findings/rollout; no otro motor ni sender. La matriz dueña está en
[SEO](../in-progress/EPIC-022-growth-seo-search-visibility-360-module.md#ejecución-con-claude-y-codex).
Las dependencias de Hub/transporte/preferencias están asignadas en
[EPIC-046](EPIC-046-client-services-visibility-and-self-service.md#matriz-de-comunicación-y-retorno-al-portal).

## Child Tasks

**Cinco tasks nuevas de implementación.** Son unidades de ownership con varios slices, no cinco cambios
pequeños. No agregar una task por módulo, gráfico, formato, endpoint ni otra para QA/rollout.

| Unidad | Task | Resultado | Blocked by |
|---|---|---|---|
| U01 | [TASK-1845](../../tasks/to-do/TASK-1845-efeonce-insights-domain-evidence-and-module-adapters.md) | dominio, evidencia y adaptadores SEO/AEO/ICO | none |
| U02 | [TASK-1846](../../tasks/to-do/TASK-1846-efeonce-insights-durable-artifact-rendering.md) | render durable y Artifact Worker multiconsumidor | TASK-1845 |
| U03 | [TASK-1847](../../tasks/to-do/TASK-1847-efeonce-insights-analytical-charts-and-editorial-catalogs.md) | gráficos y catálogos premium para deck e informe vertical | TASK-1845 |
| U04 | [TASK-1848](../../tasks/to-do/TASK-1848-efeonce-insights-sharing-delivery-and-schedules.md) | acceso compartido, correo y recurrencia gobernados | TASK-1845, TASK-1846 |
| U05 | [TASK-1849](../../tasks/to-do/TASK-1849-efeonce-insights-library-builder-and-shared-web.md) | biblioteca, creación y experiencia web compartida | TASK-1845, TASK-1846, TASK-1847, TASK-1848 |

TASK-1847 puede preparar catálogos tras TASK-1845; integración/export final requiere TASK-1846.
TASK-1849 es consumer UI, backend none; si encuentra un gap de command vuelve a la dueña backend.

## Existing Related Work

- [EPIC-046](EPIC-046-client-services-visibility-and-self-service.md): consumidor obligatorio del portal,
  Berel SEO/marketing de contenidos y Sky diseño digital. P01 coordina entitlement/fuentes; P02 aporta
  contexto desde productores; P04 enlaza desde Inicio/Mis servicios. TASK-1849 conserva toda la UI Insights
  y TASK-1845/1848 sus permisos. El dashboard inicial no bloquea el dominio Insights ni viceversa; la
  integración E2E es criterio compartido de cierre. No reparentar ni duplicar tasks.
- [TASK-1672](../../tasks/to-do/TASK-1672-growth-seo-audit-report-artifact.md): artefacto especializado de auditoría técnica SEO. Conserva findings/frescura y gates; consume el nuevo catálogo y snapshot. No otro motor.
- [TASK-1673](../../tasks/to-do/TASK-1673-growth-seo-audit-report-share-send.md): entrypoint de compartir/enviar esa auditoría; consume TASK-1848 sin segundo token store/sender.
- [TASK-1644](../../tasks/to-do/TASK-1644-artifact-composer-visual-profiles-proposal-studio.md): única dueña de VisualProfile; co-branding simple no la reimplementa ni depende de construir skins.
- EPIC-018: dashboards de desempeño y primitives; Insights es edición congelada, no rediseño de esas pantallas.
- TASK-1235/1239/1248/1330 y componentes actuales: Grader/snapshots/links como productores y patrones, sin migración general.
- TASK-1844: dependencia condicional de MCP interno multiorganización por conexión; base uniorganización no depende de ese rollout.
- EPIC-042: transporte/presentación de correo y contexto centralizado; se consume sin reconstruir el sistema de notificaciones.
- TASK-690–693 / TASK-303/387/694: Hub, preferencias, audiencia, digest y medición avanzada; coordinación
  en P09 de EPIC-046. TASK-1759 conserva transporte reactivo y TASK-1774 la baja de correo opcional.

Las dos tasks SEO ya existentes **no son dos nuevas foundations ni se retiran**: conservan su epic EPIC-022.
Si se ofrece auditoría técnica en Insights, sus gates/integración se exigen. El SEO de desempeño inicial no
necesita esperar esa sección; la biblioteca debe mostrar disponibilidad honesta.

## Delivery Plan

1. TASK-1845 fija la fuente, permisos y comandos; no emite nada incompleto.
2. TASK-1846 habilita ejecución durable; TASK-1847 produce catálogos y gráficos sobre ese contrato.
3. TASK-1848 añade compartir/correo/recurrencia con gates independientes.
4. TASK-1849 completa el recorrido y verifica paridad entre las tres entradas y salidas.
5. Cada dueña certifica su rollout; el cierre del epic integra esa evidencia, sin task de QA artificial.

Registrar plan por task sólo al tomarla: /goal explícito + codex:task-hook y checkpoint aplicable. Este registro
no ejecuta tasks ni autoriza multiagente, datos de clientes para pruebas, envíos, migraciones o deploy.

## Exit Criteria

- [ ] Edición emitida produce email con resumen útil y deep link al portal autenticado, aviso in-app y Teamsbot para destinos habilitados, con resultado por canal; token compartido sigue siendo un carril explícito separado.
- [ ] Preferencias/cadencia, dedupe, supresión de pendientes resueltos y medición entrega → consulta/acción cumplen arquitectura §9.1; ninguna apertura de correo se presenta como adopción humana.
- [ ] Cliente autenticado completa catálogo elegible → generación → estado/revisión según policy → lectura/descarga; interno autorizado gestiona la misma edición, con negativos de cuentas, audiencia y acciones en UI/API/MCP.
- [ ] EPIC-046 integra biblioteca y generación desde Inicio/Mis servicios de Berel/Sky, con contexto permitido, fuentes/cortes declarados y sin builder paralelo. La entrada shared no abre biblioteca ni generación.
- [ ] Skill efeonce-insights publicada sobre capacidades verificadas, discoverable por MCP y harness; fuente común, mirrors/routing y versiones coherentes. Un agente sin historial completa recetas y negativos con evidencia de llamadas reales (arquitectura §13; TASK-1845/1848/1849).

- [ ] Las cinco hijas cerraron con evidencia y estado runtime honesto; ningún checkbox sólo por código local.
- [ ] SEO, AEO e ICO/RpA/OTD generan una edición por ventana y comparación válida desde UI/API/MCP.
- [ ] Web, deck PDF horizontal e informe PDF A4 vertical comparten identidad y hechos sin perder narrativa/legibilidad.
- [ ] Gráficos de barras, líneas, circular/donut y dispersión pasan validación de geometría, etiquetas y fuentes.
- [ ] Versiones, errores parciales, replay, cancelación y recuperación no duplican ni mutan ediciones emitidas.
- [ ] Grants múltiples por edición, expiración/revocación, descarga y aislamiento entre dos organizaciones verificados.
- [ ] Correo autorizado y recurrencia prueban dedupe, reconciliación, pausa/revocación, accepted/delivered/bounced y cleanup.
- [ ] Marca, ID/período, co-branding opcional, PDF final completo y GVC desktop/390px pasan review.
- [ ] Worker Proposal mantiene compatibilidad; benchmarks, límites, señales, costos observados y rollback documentados.
- [ ] Integración TASK-1672/1673 se verifica antes de ofrecer auditoría técnica; cualquier sección no habilitada permanece explícita.
- [ ] Piloto cliente consentido posterior a certificación sintética y release autorizado, sin usar clientes como testers técnicos.
- [ ] Arquitectura, manual funcional, runbook, manifest y docs de disponibilidad coinciden con el runtime.

## Non-goals

PPTX/DOCX, BI libre, scoring nuevo, llamadas facturables al generar, migración de Grader/Proposal, sender nuevo,
producto independiente, diseñador visual libre y generación de tareas por cada variante. No se hacen commits
ni pushes como parte automática del registro documental.

## Planning Evidence

2026-09-08: usuario aprobó ubicación, tres formatos, nombre y creación de epic/ADR/arquitectura/tasks.
Inspección de código verificó worker ligado a Proposal, ChartSplit limitado y un enlace activo por reporte
Grader. Sólo planificación local en checkout compartido; runtime de Insights aún no construido.

## Verification of Planning

Las cinco tasks pasan `pnpm task:lint --task TASK-1845` … `TASK-1849` con template=1, legacy=0,
errors=0 y warnings=0 (2026-09-08). `pnpm ops:lint --changed` no reporta errores; sus advertencias
de child-parity pertenecen a otros epics históricos. Esto valida el registro, no los exit criteria del producto.
