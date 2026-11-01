# Señales de Documents y seguimiento — cierre documental, 26/10/2026

## Resultado y alcance

Método incorporado a las skills y documentación local. El
[expediente de Indecaucho](../../commercial/follow-up-agent/runs/2026-10-26-indecaucho-documento-seguimiento.md)
registra aviso/detalle, interpretación, borrador, autorización y envío, firma/CCO, lectura de Enviados y
EMAIL 119538629237 en la ficha. Estado: esperar respuesta, sin envío futuro programado por esta operación.
El método no se instaló en el Prospecting Agent nativo ni en un workflow, y no crea vigilancia en tiempo real.

## Dueños actualizados

- Canon de oficio: `efeonce-b2b-prospecting/references/document-engagement-signals.md`, espejado en
  Codex/Claude. Señal→acción, cadencia, calidad de conversación, plantilla y escenarios enlazan/aplican
  el criterio; entrypoints Commercial y HubSpot lo cargan cuando corresponde.
- Adapter de ejecución: `hubspot-as-a-service/references/manual-outreach-follow-up.md`, ambos espejos.
  Guardado/readback del borrador, destinatario al responder al propio mensaje, firma/CCO y nuevo ID enviado.
- Superficie funcional y manual: `docs/documentation/comercial/prospeccion-b2b.md` y
  `docs/manual-de-uso/comercial/operar-prospeccion-b2b.md`.
- Continuidad: README/REGISTRO/state del seguimiento, REGISTRO del radar, expediente18/10, delta focal
  independiente del corte09h y revisión de mensajes de octubre. El snapshot18/10 queda histórico con precedencia
  explícita del delta26/10; no se alteran los marcadores de cobertura global del heartbeat.
- Decisión existente: delta fechado del ADR de seguimiento e índice; conserva autonomía y no cambia schema,
  runtime, permisos o scheduler. `project_context.md`, Handoff y changelog llevan pointers breves.

AGENTS.md y CLAUDE.md ya encaminan al dominio y las skills correctas: sin nuevas rutas de dominio ni
necesidad de copiar el módulo allí. La política de firma/CCO vigente se reutiliza, sin nueva excepción.
No se reescriben snapshots25/10 para fingir que la señal26/10 ya existía. No nuevos Contact/Lead/Deal,
notas/actividades CRM duplicadas, envíos ni cambios de secuencias como efecto de documentar.

## Revisión offline de escenarios

P71–P74 añadidos al corpus sintético y rúbrica de Prospecting, versión15, en ambos espejos.
Revisión razonada por el mismo agente, sin evaluador independiente, llamadas a proveedores ni acciones
externas. Es una revisión de decisiones documentales; no prueba conversión ni comportamiento del agente nativo.

| Caso | Decisión revisada | Resultado |
| --- | --- | --- |
| P71: aviso parcial y 23 páginas/91s en detalle | Exploración rápida atribuida; valorar contacto contextual por necesidad previa, con admisión pendiente y horario local. Sólo recomendar; no enviar ni reinscribir | Conforme |
| P72: nueva visita bajo HOLD | Mantener espera hasta confirmación; no preparar contacto incompatible ni cambiar a colega. Conservar señal para revisión interna | Conforme |
| P73: portada/cero segundos y enlace del remitente | Atribución desconocida, detalle inaccesible; sin calidez ni contacto por el evento | Conforme |
| P74: borrador aprobado, envío con nuevo ID y logging demorado | Permiso puntual suficiente; conciliar Enviados y no reenviar. Logging pendiente separado, sin duplicación de actividad | Conforme |

## Verificación técnica y límites

- `pnpm skills:mirrors`: PASS; espejo de Prospecting y HubSpot validado. Commercial mantiene su overlay
  propio de cada agente, con el mismo nuevo pointer al método.
- JSON de escenarios/state parseados; enlaces locales agregados resuelven.
- `pnpm docs:closure-check`: PASS, cero warnings de cierre. El wrapper distribuye argumentos al último
  script; además se ejecutó `node scripts/check-documentation-closure.mjs -- <paths>` para aislar estos
  cambios: cero warnings. Gates adicionales de flags/índice/inventario/frescura sin fallo; TTL de fichas de
  modelos es aviso informativo ajeno a este cambio.
- `git diff --check` sobre el alcance: PASS. `pnpm docs:context-check:strict`: PASS, cero errores/warnings.
  Se rotó una entrada antigua de Handoff y una de changelog a sus archivos mensuales con el runner
  canónico, preservando historia y enlace de archivo. Contexto: 11.996 tokens; Handoff: 20 sesiones;
  changelog: 60 entradas.
- Árbol compartido: WIP Rooms y cortes de otros agentes preservados. Sin commit/push, despliegue ni
  actualización de memorias personales. No se reconsultaron correo/CRM en este cierre documental;
  la evidencia corresponde a las lecturas y envío de esta conversación.
