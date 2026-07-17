> **Tipo de documento:** Manual de uso (runbook operador)
> **Version:** 1.0
> **Creado:** 2026-07-17 por Claude (TASK-1276)
> **Ultima actualizacion:** 2026-07-17 por Claude (TASK-1276)
> **Documentacion tecnica:** [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md)

# Vista operador AEO — cockpit, plan y cross-sell

## Para qué sirve

Gestionar el programa AEO como operador interno: ver el score y el informe de cada cliente, registrar
el avance del Plan AEO foco por foco, correr diagnósticos sobre clientes o prospectos, y enviar el
informe abriendo una oportunidad comercial (Lead de HubSpot).

## Antes de empezar

- Necesitas un rol interno del set operador (admin, account, operations o ai tooling). Los roles de
  portal cliente no ven estas rutas.
- La sección vive en el menú **Growth → AEO** (`/growth/aeo`). No está en Admin Center.
- Para enviar informes se necesita además: un informe **publicado** del cliente y el flag de envío
  encendido en el ambiente (si está apagado, el botón lo indica).

## Paso a paso

1. **Cockpit** (`/growth/aeo`): revisa los clientes del programa con su score, tier y último run.
   Usa los filtros (Con AEO / Expansión / Prospecto) o la búsqueda para encontrar targets sin AEO.
2. **Abrir un cliente**: haz clic en su fila (o Enter con el teclado) para ir al detalle.
3. **Registrar avance del Plan AEO**: en el detalle, abre un foco del plan en el navegador izquierdo
   y usa "Estado de ejecución": Sin empezar / En curso / Bloqueado / Hecho / Descartado.
   - Bloquear o descartar exige escribir un **motivo** (queda en la bitácora, auditable).
   - El cambio se guarda al instante y se anuncia; si falla, reintenta.
4. **Correr AEO**: desde el cockpit, botón "Correr AEO" → elige el target en el selector (agrupado
   por motion comercial) → "Correr AEO". Desde el detalle, el botón re-corre el cliente actual.
   El run tarda unos minutos; la página se actualiza sola.
5. **Enviar informe + abrir oportunidad**: en el detalle, botón "Enviar informe + abrir oportunidad".
   Completa el correo del destinatario; si el target es un **prospecto**, registra el consentimiento
   y su referencia (nunca envío en frío). Revisa la confirmación (base legal y tipo de Lead se
   derivan solos) y confirma. El email y el Lead se procesan en minutos.
6. **Desde Account 360**: el workspace de la organización tiene un facet "AEO" con acceso directo
   al mismo detalle.

## Qué significan los estados

| Estado | Significado |
|---|---|
| Sin medición | El cliente tiene módulo AEO pero ningún run con score (no es un 0). |
| Sin seguimiento aún | El foco del plan no tiene estado registrado todavía. |
| Bloqueado | El foco espera un insumo (motivo obligatorio). |
| Descartado | El foco se sacó del plan (motivo obligatorio). |
| El envío está apagado en este ambiente | Flag de envío OFF; no es un error. |
| Sin informe publicado | El run existe pero no tiene snapshot público; publica antes de enviar. |

## Qué no hacer

- No enviar informes a prospectos sin consentimiento registrado (el sistema lo bloquea igual).
- No interpretar "Sin medición" como score 0: significa que falta un run con score.
- No usar la vista para re-scorear a mano: el score lo produce el motor, no el operador.

## Problemas comunes

- **"No tienes acceso a este cliente"**: tu rol no tiene la capability operadora; pídela a un admin.
- **El run no aparece**: el motor drena runs cada pocos minutos; espera y actualiza.
- **El botón de envío está deshabilitado**: revisa el hint (flag apagado o informe sin publicar).

## Referencias técnicas

- TASK-1276 (spec + slices), TASK-1287 (readers), TASK-1275 (estado del plan), TASK-1277 (puerta de
  run), TASK-1279 (envío + Lead). Manual del envío: `enviar-informe-aeo-crear-lead.md`.
