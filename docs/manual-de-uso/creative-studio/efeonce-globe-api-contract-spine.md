# Manual — Operar y extender el Contract Spine de Efeonce Globe

> **Tipo de documento:** Manual de uso / runbook (orientado al operador)
> **Version:** 1.0
> **Creado:** 2026-07-19 por Claude (TASK-1481)
> **Ultima actualizacion:** 2026-07-19 por Claude

## Para qué sirve

El "Contract Spine" de Efeonce Globe (`TASK-1481`) es el contrato central por el que pasa toda acción de Globe
(API, SDK, agente, futuro MCP/CLI). Este manual es el **puente desde Greenhouse**: te dice quién opera qué y
dónde está el runbook detallado. Como Globe es una **plataforma hermana** (repo `efeonce-globe`), el manual
operativo paso a paso — con snippets reales de código — vive en ese repo. Acá queda el mapa y el gobierno.

## Antes de empezar

- **Dónde vive el código:** repo hermano `efeonce-globe` (por convención local `../efeonce-globe`). NO es parte
  del build de `greenhouse-eo`; tiene su propio toolchain (Node 24 nativo, `pnpm check` / `pnpm build`).
- **Quién gobierna:** Greenhouse. Toda extensión se hace bajo una `TASK-###` de Greenhouse (control plane),
  gobernada por `EPIC-028`. No se crea un registry de tareas paralelo en Globe.
- **Skill obligatoria:** invocá **`greenhouse-globe`** antes de tocar el repo de Globe. Encapsula el boundary,
  el build system, el flujo de extensión de capabilities y las reglas duras.

## Paso a paso (resumen — el detalle está en el runbook de Globe)

1. **Tomá la `TASK-###`** de Greenhouse que gobierna el trabajo (por ejemplo `TASK-1457` para el primer provider
   canary). Ejecutá su hook / Plan Mode.
2. **Agregá la capability al spine** en `efeonce-globe`: schemas en `packages/contracts` → registrá el
   command/reader en el `CapabilityRegistry` (`packages/domain`) → volteá su coverage de `policy-blocked` a
   `available` en las superficies que shippeás → el handler llama al `provider-contract` / `creative-runner`
   (nunca a un SDK de proveedor directo) → método SDK tipado → granteá la capability al principal.
3. **Verificá** con `cd ../efeonce-globe && pnpm check && pnpm build` y los tests de conformance.
4. **Cerrá** en Greenhouse: lifecycle de la task, docs, handoff (el cierre documental es de Greenhouse).

El **runbook operativo completo** (con el envelope JSON real para llamar por HTTP, el snippet del `GlobeClient`,
la semántica de estados/errores, el troubleshooting y la lista de NUNCA) está en el repo hermano:
[`efeonce-globe/docs/operations/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md`](../../../../efeonce-globe/docs/operations/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md).

## Qué significan los estados

- **available / policy-blocked / not-applicable:** el estado de cada capability por canal. "Falta" no existe:
  una capability no lista se declara `policy-blocked` (visible), nunca un hueco.
- **Errores canónicos:** `policy_blocked` (bloqueado por política) ≠ `access_denied` (sin permiso / workspace no
  bindeado) ≠ `not_found`. Un error con `retryable: false` no se resuelve reintentando.

## Qué no hacer

- **NUNCA** llames a un SDK de proveedor directo desde Globe (UI/MCP/CLI/scripts/tests); todo pasa por
  command → adapter → runner.
- **NUNCA** metas actor/workspace/capabilities de autoridad en el cuerpo, query o headers del request; solo se
  acepta un `workspaceSelection` no confiable, validado server-side.
- **NUNCA** compartas base de datos, sesión, bucket, secreto ni rol admin entre Globe y Greenhouse.
- **NUNCA** crees un registry/namespace de tareas paralelo en Globe: el control plane es Greenhouse.

## Problemas comunes

- **"No valida Globe con `pnpm local:check` de Greenhouse":** correcto — son toolchains distintos. Validá Globe
  con `pnpm check` / `pnpm build` dentro de `efeonce-globe`.
- **Dependencia de workspace nueva no resuelve:** corré `pnpm install` en `efeonce-globe` para relinkear.
- **En modo `api` una capability `available` responde 403:** el service principal interno del piloto tiene un
  grant acotado; extendé el grant o esperá el mapeo por-identidad de `TASK-1457` (ver runbook).

## Referencias técnicas

- Spec técnica canónica: [`efeonce-globe/docs/architecture/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`](../../../../efeonce-globe/docs/architecture/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md) (SPEC-001).
- Documentación funcional (Greenhouse): [`docs/documentation/creative-studio/efeonce-globe-api-contract-spine.md`](../../documentation/creative-studio/efeonce-globe-api-contract-spine.md).
- Programa: [`EPIC-028`](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md). Skill: `greenhouse-globe`.
