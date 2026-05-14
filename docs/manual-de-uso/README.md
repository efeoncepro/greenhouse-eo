# Greenhouse EO — Manual de Uso

Esta carpeta guarda guias practicas para usar capacidades concretas del portal Greenhouse.

La diferencia con otras capas de documentacion:

- `docs/architecture/` explica contratos tecnicos, schemas, APIs y decisiones para agentes/desarrolladores.
- `docs/documentation/` explica como funciona un modulo y sus reglas de negocio.
- `docs/manual-de-uso/` explica como usar una capacidad paso a paso en el portal, que permisos necesitas, que no debes tocar y como resolver problemas comunes.

## Indice por categoria

### Finanzas

- [Distribucion de costos para P&L operativo](finance/distribucion-costos-pnl.md) — como revisar, materializar y cerrar períodos sin inflar overhead de clientes con payroll, regulatorio, financiero o treasury transit.
- [Sugerencias asistidas de conciliacion](finance/sugerencias-asistidas-conciliacion.md) — como generar, revisar, aceptar o descartar sugerencias AI sin alterar saldos automaticamente.
- [Saldos bancarios FX drift](finance/saldos-bancarios-fx-drift-remediation.md) — como diagnosticar, auditar y remediar drift FX de saldos bancarios usando el control plane canonico sin SQL/backfills ad hoc.
- [Finance Movement Feed](../documentation/finance/finance-movement-feed.md) — contrato reusable para mostrar movimientos financieros sin duplicar tablas, hardcodes de logos ni calculos de saldo en UI.

### Comercial

- [Pipeline comercial](comercial/pipeline-comercial.md) — como usar la lane dedicada de forecast comercial sin confundirla con revenue reconocido ni cierre financiero.
- [Sample Sprints](comercial/sample-sprints.md) — como declarar, aprobar, registrar progreso y cerrar outcomes de pilotos/trials/POCs/discovery.

### Identidad y acceso

- [SCIM con Microsoft Entra](identity/scim-entra-provisioning.md) — como verificar provisioning, usar `provisionOnDemand`, interpretar `countEscrowed` y evitar fixes manuales inseguros sobre usuarios o mappings.
- [Organization Workspace Projection — operación](identity/organization-workspace-projection.md) — como supervisar las 2 nuevas reliability signals (`facet_view_drift`, `unresolved_relations`), interpretar las 5 relaciones canónicas subject↔organización, las 11 capabilities `organization.*` y la disciplina TS↔DB para agregar capabilities nuevas.

### Portal Cliente

- [Menu dinamico y empty states — operacion](client-portal/menu-dinamico-y-empty-states.md) — como activar/pausar/dar de baja modulos para clientes, verificar que esta viendo cada cliente, diagnosticar empty states reportados, atender warnings Sentry `role_view_fallback_used` (regla canonica view registry governance), validar visualmente con mockup `/cliente-portal-mockup`, troubleshooting de los 5 estados canonicos del 5-state contract.

### Admin Center

_Pendiente._

### HR y Nomina

- [Completar ficha laboral de un colaborador](hr/completar-ficha-laboral.md) — como cerrar el workflow workforce intake desde la UI (badge "Ficha pendiente" en People + boton en /people/[memberId] + cola `/admin/workforce/activation` admin governance) sin recurrir a curl. V1.0 confia en validacion manual del operador; la validacion automatica readiness llega en TASK-874.
- [Offboarding](hr/offboarding.md) — como abrir, revisar y avanzar casos canonicos de salida sin confundirlos con desactivacion de acceso ni finiquito.
- [Checklists de Onboarding y Offboarding](hr/onboarding-offboarding-checklists.md) — como crear checklists operativos, completar tareas y no confundirlos con el caso formal de salida.
- [Usar Lifecycle / Onboarding y Offboarding](hr/onboarding-y-offboarding.md) — overview HR, editor de plantillas, tareas propias y card lifecycle en People 360.
- [Finiquitos Chile](hr/finiquitos.md) — como calcular, revisar, aprobar y cancelar un final settlement Chile dependiente desde un caso de offboarding aprobado.
- [Periodos de nomina](hr/periodos-de-nomina.md) — como crear, editar y calcular periodos sin adivinar la version tributaria Chile; cuando Greenhouse la resuelve solo y cuando un override manual si aplica.
- [Descargar y reconciliar la nomina mensual](hr/descargar-y-reconciliar-nomina.md) — paso a paso para descargar recibos individuales, PDF reporte mensual y Excel; donde leer los totales para reconciliar contra Previred (cotizaciones) y F29 (retencion SII honorarios) sin manipular el archivo.
- [Exportar Previred y LRE](hr/payroll-compliance-exports-chile.md) — como descargar los artefactos compliance Chile desde periodos cerrados, permisos requeridos y cuidados de upload externo manual.

### Agencia y Operaciones

- [Monitorear Costos Cloud con FinOps](operations/monitorear-costos-cloud-finops.md) — como revisar gasto GCP, interpretar proyecciones y drivers, usar alertas tempranas y ejecutar diagnosticos seguros sin depender solo de la consola de Google Cloud.

### Plataforma

- [MCP Greenhouse Read-Only](plataforma/mcp-greenhouse-read-only.md) — cómo levantar el MCP local `stdio` o conectarse al gateway remoto HTTP privado, qué variables necesita, qué tools read-only existen hoy, qué límites de scope respeta y qué follow-ups siguen fuera de alcance.
- [Validar el contrato visual DESIGN.md](plataforma/validar-contrato-visual-design-md.md) — paso a paso para validar localmente con `pnpm design:lint`, comparar versiones con `pnpm design:diff`, agregar tokens nuevos siguiendo el patrón canónico (sin atajos prohibidos), resolver warnings comunes, y verificar que el CI gate aprobó tu PR.
- [Usar microcopy shared](plataforma/microcopy-shared-dictionary.md) — como usar `getMicrocopy` y `buildStatusMap` para botones, estados, meses, empty states y aria-labels sin duplicar strings ni romper el futuro i18n.
- [Verificar idioma del portal](plataforma/i18n-runtime.md) — como forzar `gh_locale=en-US`/`es-CL` para QA del runtime i18n sin cambiar URLs privadas ni APIs.
- [Formatear fechas, montos y numeros](plataforma/formateo-locale-aware.md) — como usar `@/lib/format` para UI, PDFs, Excel y emails sin reintroducir `Intl.*` o `toLocale*` directo; incluye caso Brasil.
- [Organization Workspace — rollout y operación](plataforma/organizaciones-workspace-rollout.md) — cómo activar progresivamente el nuevo workspace de organizaciones (TASK-612) en `/agency/organizations/[id]` por usuario → rol → global, supervisar las 2 reliability signals, revertir instantáneo per-user, y diagnosticar issues comunes.
- [Skills de Product Design](plataforma/skills-product-design.md) — qué cambió cuando se incorporó la suite de 17 skills (a11y, motion, performance, forms, state, dataviz, IA, frontend-architect, design-system-governance), cuándo se invoca cada una, cómo se componen, cuándo correr `greenhouse-ui-review` antes de commit y cómo extender el sistema sin romperlo.
- [Captura visual con Playwright](plataforma/captura-visual-playwright.md) — `pnpm fe:capture` para grabar `.webm` + frames PNG marker-based + GIF opcional de cualquier ruta del portal. Reemplaza el patrón de `_cap.mjs` ad-hoc. Scenario DSL declarativo, agent auth canónico, 5 capas defense-in-depth Safety, GC de artifacts.

## Plantilla recomendada

```md
# [Nombre de la capacidad]

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** YYYY-MM-DD por [agente/persona]
> **Ultima actualizacion:** YYYY-MM-DD por [agente/persona]
> **Modulo:** [dominio/modulo]
> **Ruta en portal:** `/ruta`
> **Documentacion relacionada:** [links]

## Para que sirve

## Antes de empezar

## Paso a paso

## Que significan los estados

## Que no hacer

## Problemas comunes

## Referencias tecnicas
```

## Regla para agentes

Cuando una implementacion agrega o cambia una capacidad visible, el agente debe revisar si existe un manual de uso para esa capacidad.

- Si existe, actualizarlo.
- Si no existe y la capacidad requiere pasos, permisos, decisiones o cuidado operativo para usarla bien, crearlo.
- Si la feature es pequena pero cambia una pantalla ya documentada, agregar un delta corto en el manual existente.

El manual debe quedar orientado al usuario-operador: claro, accionable y sin depender de leer codigo.
