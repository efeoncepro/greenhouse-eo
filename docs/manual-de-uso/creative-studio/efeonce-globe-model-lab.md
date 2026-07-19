# Manual — Correr un experimento en el Model Lab de Efeonce Globe

> **Tipo de documento:** Manual de uso / runbook (orientado al operador)
> **Version:** 1.0
> **Creado:** 2026-07-19 por Claude (TASK-1457)
> **Ultima actualizacion:** 2026-07-19 por Claude

## Para qué sirve

El **Model Lab** de Efeonce Globe (`TASK-1457`) es un banco de pruebas gobernado: permite **preparar → ejecutar → ver evidencia** de una capacidad creativa por una ruta, bajo un tope de gasto duro e ingesta privada. Este manual es el **puente desde Greenhouse**: te dice quién opera qué y dónde está el runbook detallado. Como Globe es una **plataforma hermana** (repo `efeonce-globe`), el runbook operativo paso a paso — con el flujo real por SDK y los guardrails en acción — vive en ese repo. Acá queda el mapa y el gobierno.

## Antes de empezar

- **Dónde vive el código:** repo hermano `efeonce-globe` (por convención local `../efeonce-globe`). NO es parte del build de `greenhouse-eo`; tiene su propio toolchain (Node 24 nativo, `pnpm check` / `pnpm build`).
- **Quién gobierna:** Greenhouse. El trabajo se hace bajo la `TASK-1457` de Greenhouse (control plane), gobernada por `EPIC-028`. No se crea un registry de tareas paralelo en Globe.
- **Skill obligatoria:** invoca **`greenhouse-globe`** antes de tocar el repo de Globe. Encapsula el boundary, el flujo de extensión de capabilities y las reglas duras.
- **Estado hoy:** el Model Lab corre con un **proveedor de ensayo** (simulador) que no toca la red ni gasta. El canary con proveedor real queda `rollout pendiente` (depende de la infra de `TASK-1464`, ya viva, y de la política de proveedores).

## Paso a paso (resumen — el detalle está en el runbook de Globe)

1. **Habilita el Lab (nace apagado).** El interruptor de apagado está OFF por defecto: mientras esté OFF, cualquier comando de experimento responde `policy_blocked`. Para el piloto interno se enciende con la variable de entorno `GLOBE_LAB_ENABLED=true`; el tope diario por espacio de trabajo se fija con `GLOBE_LAB_DAILY_CAP_CREDITS` (default 500). El caller interno ya tiene la capability `globe.lab.experiment.run`.
2. **Preparar.** Declara la **capacidad semántica** (por ejemplo, "generar imagen"), la **ruta de referencia**, los **insumos autorizados** (solo `inputId` + huella `sha256` + tipo + derechos — nunca el archivo crudo) y el **tope de gasto duro** (`hardCapCredits`). Opcionalmente un `prompt`.
3. **Ejecutar.** El sistema **estima → compara contra el tope → reserva → corre → salda**. Si la estimación supera el tope, aborta **antes de gastar** (`run_cap_exceeded`); si el espacio superó su tope diario, `day_cap_exceeded`; si el proveedor falla, libera la reserva y queda `failed`.
4. **Ver evidencia.** Lee los **manifiestos por intento**: ruta propuesta vs real, costo estimado y real, huellas de insumos y de resultado, línea de origen.
5. **Cierra en Greenhouse:** lifecycle de la task, docs, handoff (el cierre documental es de Greenhouse).

El **runbook operativo completo** (habilitación con el flag, el flujo real por SDK `prepareExperiment` / `executeExperiment` / `getExperimentEvidence`, los guardrails en acción y cómo agregar una ruta de proveedor real) está en el repo hermano: [`efeonce-globe/docs/operations/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md`](../../../../efeonce-globe/docs/operations/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md) **§7-bis (Model Lab)**. La infraestructura que lo sostiene (bucket privado, despliegue sin llaves, presupuesto) está en [`EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`](../../../../efeonce-globe/docs/operations/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md).

## Qué significan los estados

- **prepared → estimated → reserved → running → candidate_ready:** la secuencia feliz de un experimento. Solo se permiten transiciones válidas; no se salta de cualquier estado a cualquiera.
- **candidate_ready:** hay un resultado técnico. **No es una aprobación** — falta juicio humano.
- **failed:** se detuvo con un motivo anotado (`run_cap_exceeded`, `day_cap_exceeded` o falla del proveedor). **cancelled:** se canceló a propósito, con razón.
- **policy_blocked:** el Lab (o la surface) está apagado; el comando ni siquiera corre. Se ve, no es un hueco. Distinto de `access_denied` (sin permiso / workspace no bindeado) y de `not_found` (experimento ajeno o inexistente — no se revela si existe en otra parte).

## Qué no hacer

- **NUNCA** subas el **archivo crudo** de un insumo por el contrato: solo su huella (`sha256`) + derechos. La ingesta del contenido es privada, server-side.
- **NUNCA** trates `candidate_ready` como aprobación: la autorización de una pieza es un paso humano aparte.
- **NUNCA** llames a un SDK de proveedor directo (ni por script/CLI/UI/MCP): todo pasa por command → adapter → runner. El proveedor real se inyecta en el runner, nunca se invoca por fuera.
- **NUNCA** prendas el proveedor real sin credenciales federadas (WIF/ADC), bucket privado y alertas de presupuesto vivas (los deja la infra de `TASK-1464`).
- **NUNCA** confundas el **spend fence** (freno de seguridad en memoria) con el registro contable de créditos comerciales (durable, capacidad aparte, aún pendiente).
- **NUNCA** compartas base de datos, sesión, bucket, secreto ni rol admin entre Globe y Greenhouse; **NUNCA** crees un registry/namespace de tareas paralelo en Globe.

## Problemas comunes

- **Todo experimento responde `policy_blocked`:** el Lab está apagado. Enciéndelo con `GLOBE_LAB_ENABLED=true` (piloto interno) o confirma que la surface que usas no está `policy-blocked` (hoy la UI y el MCP lo están a propósito, hasta la promoción de ruta).
- **`day_cap_exceeded` aunque tu corrida es chica:** el freno diario del espacio de trabajo ya se consumió con corridas previas del día. Espera al reinicio del día (UTC) o ajusta `GLOBE_LAB_DAILY_CAP_CREDITS` para el piloto.
- **El tope diario "se reinició solo":** esperado — el spend fence de hoy vive en memoria del proceso y se reinicia al reiniciar el servicio. Es un freno de seguridad, no el ledger durable.
- **No valida Globe con `pnpm local:check` de Greenhouse:** correcto, son toolchains distintos. Valida Globe con `pnpm check` / `pnpm build` dentro de `efeonce-globe`.

## Referencias técnicas

- Runbook operativo — correr un experimento paso a paso: [`efeonce-globe/docs/operations/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md`](../../../../efeonce-globe/docs/operations/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md) §7-bis.
- Spec técnica canónica (nombre previsto): [`efeonce-globe/docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md`](../../../../efeonce-globe/docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md).
- Documentación funcional (Greenhouse): [`docs/documentation/creative-studio/efeonce-globe-model-lab.md`](../../documentation/creative-studio/efeonce-globe-model-lab.md).
- Infraestructura que lo sostiene: [`docs/documentation/creative-studio/efeonce-globe-infra-keyless.md`](../../documentation/creative-studio/efeonce-globe-infra-keyless.md).
- Programa: [`EPIC-028`](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md). Skill: `greenhouse-globe`.
