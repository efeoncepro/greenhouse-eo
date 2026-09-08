# Efeonce Insights — dominio de inteligencia editorial multiformato

- Status: **Accepted for planning** — dirección de producto y ubicación aprobadas por el operador en esta conversación; implementación, migraciones y rollout requieren las tasks y sus gates.
- Date: 2026-09-08
- Owner: Platform / Architecture + Client Experience; Julio Reyes como autoridad de producto.
- Scope: Greenhouse, Artifact Composer/Worker, SEO/AEO/ICO, entrega web/PDF/email y API/MCP.
- Reversibility: two-way-but-slow; los snapshots emitidos y archivos ya distribuidos no se reescriben.
- Confidence: alta en ownership y reuso; media en capacidad y costo hasta benchmark.
- Validated as of: 2026-09-08, inspección del checkout `develop`; sin verificación live en este trabajo documental.
- Program: [EPIC-045](../epics/to-do/EPIC-045-efeonce-insights-multiformat-intelligence.md).
- Technical contract: [arquitectura](EFEONCE_INSIGHTS_ARCHITECTURE_V1.md).

## Context

El operador solicita una capacidad que convierta métricas de clientes de SEO, AEO, RpA, OTD y futuros módulos
en entregas premium por ventana temporal, invocable por UI, API y MCP. Aprobó el nombre **Efeonce Insights**,
deck horizontal, informe vertical y vista web compartible por token, identidad/versiones, marca Efeonce con
co-branding opcional, envío por correo y generación asíncrona dentro del contexto Greenhouse.

El Composer ya separa motor y catálogos. La ejecución productiva en código sigue atada a
`proposal_render_jobs` y `attachProposalAsset` en `services/artifact-worker/main.ts`. `ChartSplit` sólo
admite 2–4 barras porcentuales. El Grader tiene snapshots por token y un único enlace activo por reporte;
no satisface el contrato de varios enlaces independientes de Insights. Existen tareas dueñas de auditoría
SEO (`TASK-1672/1673`) y perfiles visuales (`TASK-1644`), que no se duplican.

## Decision

1. **Producto dentro de Greenhouse, ejecución pesada fuera del proceso web.** Insights posee su dominio,
   historial, permisos y experiencia en Greenhouse. Reutiliza/extiende el `artifact-worker` existente.
   No crea otro repositorio, aplicación, identidad, servicio, motor creativo ni warehouse.
2. **Una versión de evidencia, tres composiciones.** Deck PDF horizontal, informe PDF A4 vertical y vista
   web responsive son salidas iniciales de primera clase. Comparten hechos y referencias; tienen narrativa,
   densidad, paginación e interacción apropiadas a cada formato. El informe vertical no es un deck rotado.
3. **Insights es consumidor del Composer.** Un reporte nunca se registra como Proposal para obtener un
   PDF. El worker despacha por consumer tipado y devuelve resultados al command del dominio propietario.
   El motor continúa sin conocimiento de SEO, AEO, ICO, organizaciones o reglas de correo.
4. **Métricas en su dueño.** Adaptadores versionados consumen readers canónicos y congelan evidencia
   permitida, cobertura, grano, período y metodología. No recalculan fórmulas del módulo ni compran datos
   al generar; un refresh costoso es otra acción autorizada.
5. **IA acotada a autoría.** Puede organizar y redactar desde evidencia permitida. No calcula KPIs, inventa
   causalidad, modifica fuentes, crea promesas ni decide permisos/publicación. Plan y narrativa final quedan
   congelados; un replay no vuelve a llamar al modelo.
6. **Acceso y entrega separados del documento.** Links con token opaco, expiración y revocación individual
   apuntan a una versión emitida. El correo se entrega por la plataforma centralizada; aprobación y dedupe
   están ligados a versión, destinatarios y modalidad. Una vista web no es permiso para enviar.
7. **Full API parity desde nacimiento.** UI/API/MCP operan los mismos commands/readers. El gateway federado
   sólo adapta: no lee PG, compone informes ni incorpora business logic. Ningún token compartido es OAuth.
8. **Cinco tasks nuevas.** Foundation; render durable; catálogo visual; acceso/distribución/recurrencia;
   experiencia portal/web. QA y rollout se incluyen en sus dueñas. Dos tasks SEO existentes mantienen su
   integración específica, sin otra fundación de reporting.

## Alternatives Considered

| Alternativa | Resultado |
|---|---|
| Mantener exportaciones manuales por módulo | No cubre reproducibilidad, paridad de acceso ni continuidad entre formatos. |
| Todo síncrono dentro de Next.js | Rechazada: mezcla render pesado con requests y no resuelve recuperación durable. |
| Producto/servicio separado desde el inicio | Diferido: duplica operación e integración de contexto sin evidencia de beneficio. |
| Comprar una plataforma de reporting como source of truth | Diferido: requiere evaluar transferencia de datos, autoría y contratos; no sustituye el Composer solicitado. |
| Dominio Greenhouse + worker compartido | Elegida: conserva autoridad y datos, aísla cómputo y permite extracción posterior. |

## Consequences

- Hay un único historial de entregas y una extensión por módulo, no un exportador nuevo por pantalla.
- Snapshot, plan, brand pack y catálogo versionados permiten reconstrucción y correcciones auditables.
- El worker adquiere un segundo consumidor: requiere compatibilidad con jobs Proposal existentes,
  priorización y pruebas de recuperación antes de activar Insights.
- El costo de congelar evidencia exige límites, retención y política de assets explícitos.
- El token es una credencial transferible; no identifica a la persona que lo abrió ni evita capturas o
  copias descargadas. Revocar corta nuevos accesos, no recupera adjuntos ya entregados.
- Cinco tasks compactan ownership y cierre; no significan cinco cambios pequeños ni autorizan reducir QA.

## Runtime Contract

El namespace lógico será `insights`; rutas, tablas y capabilities nuevas se declaran como propuestas en la
arquitectura hasta materializarse. Los stores utilizan el tooling PostgreSQL canónico. Enqueue y outbox son
atómicos; el worker reclama leases y finaliza idempotentemente. Una salida fallida no duplica salidas exitosas.

Datos y biblioteca requieren identidad/capability/entitlement por organización; el acceso por token sólo
sirve una proyección client-facing congelada, con descarga autorizada. Generación, emisión, sharing, correo
y recurrencia tienen gates separados, default OFF, revalidados en todos los runtimes participantes.

Los contratos de API, assets, logs y errores no exponen secretos ni evidencia interna. Sin nuevo sender,
pool PG, bucket público, perfil visual paralelo a `TASK-1644` o ampliación del cliente MCP base-only.

## Revisit When

- Una plataforma hermana necesita operar Insights con lifecycle independiente de Greenhouse.
- El benchmark prueba que la cola/worker compartidos no cumplen la equidad o los límites acordados.
- La operación multicliente requiere aislamiento contractual de cómputo o almacenamiento adicional.
- Aparece demanda concreta de PPTX/DOCX editable; se evalúa como output target, sin prometerlo como existente.

## Evidence and related decisions

- `src/lib/artifact-composer/contracts.ts`, `catalogs/deck-axis/chart-split.slots.json` y `services/artifact-worker/main.ts`.
- `src/lib/growth/ai-visibility/report/{snapshot,short-link}.ts` y `src/components/growth/seo/report-artifact/model.ts`.
- `GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`, `GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md`.
- `GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`, `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.
- `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`, `EFEONCE_MCP_AGENT_SKILL_ROUTER_V1.md`.
- `docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md` y `EFEONCE_EXECUTIVE_REPORT_DECK_METHOD_V1.md`.
