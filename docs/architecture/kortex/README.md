# Kortex — capas de integracion y operacion desde Greenhouse

> **Tipo:** Arquitectura / governance de integracion (agent-facing)
> **Creado:** 2026-06-17 (TASK-1164/TASK-1165)
> **Contrato principal:** `greenhouse-kortex-command-adapter.v1`
> **Source of truth runtime:** Kortex control-plane + command registry Greenhouse

## Que es esto

Esta carpeta organiza las capacidades que quedaron disponibles para operar Kortex desde Greenhouse. Es la vista por capas, equivalente al modelo de documentacion de Nexa, pero enfocada en integracion, comandos, seguridad y runtime.

No reemplaza los ADRs existentes:

- [`GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`](../GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md)
- [`GREENHOUSE_KORTEX_CONTROL_PLANE_READER_V1.md`](../GREENHOUSE_KORTEX_CONTROL_PLANE_READER_V1.md)
- [`GREENHOUSE_KORTEX_COMMAND_ADAPTER_V1.md`](../GREENHOUSE_KORTEX_COMMAND_ADAPTER_V1.md)

Esta carpeta es el mapa navegable que explica como usar esas piezas juntas.

## Capas

### [`connection/`](connection/README.md) — como Greenhouse ve y alcanza Kortex

- [`greenhouse-kortex-connection.md`](connection/greenhouse-kortex-connection.md): binding, control-plane reader, OAuth/HubSpot portal conectado y ruta de comunicacion Greenhouse -> Kortex.

### [`capabilities/`](capabilities/README.md) — que podemos hacer ya

- [`capabilities-achieved-20260617.md`](capabilities/capabilities-achieved-20260617.md): resumen humano de las capacidades logradas en esta sesion.

### [`commands/`](commands/README.md) — catalogo gobernado de comandos

- [`command-catalog.md`](commands/command-catalog.md): lista completa de comandos, tiers y superficies Kortex cubiertas.

### [`governance/`](governance/README.md) — guardrails de seguridad

- [`guardrails-and-boundaries.md`](governance/guardrails-and-boundaries.md): flags, confirmaciones, idempotencia, no-proxy, no-HubSpot-direct.

### [`operations/`](operations/README.md) — como operarlo

- [`runbook.md`](operations/runbook.md): smokes, rollout, errores esperados y que hacer antes de habilitar live/admin.

## Estado operativo vigente

- Greenhouse staging actual: `https://greenhouse-s63g4vzwt-efeonce-7670142f.vercel.app`
- Alias staging: `https://dev-greenhouse.efeoncepro.com`
- Kortex control-plane usado por Greenhouse: `https://kortex-control-plane-758246035804.us-central1.run.app`
- HubSpot portal conectado para Kortex runtime: `48713323`
- Binding Greenhouse/Kortex: `EO-SPB-0002`
- Production live/admin: deshabilitado hasta aprobacion explicita.

## Regla de mantenimiento

Si cambia una capacidad Kortex que Greenhouse pueda leer o ejecutar, actualizar esta carpeta en el mismo cambio:

- nuevos readers o bindings -> `connection/`
- nuevos comandos o cambios de payload -> `commands/`
- nuevos permisos, flags o secretos -> `governance/`
- nuevos pasos de rollout/smoke -> `operations/`
- nueva capacidad de negocio -> `capabilities/`
