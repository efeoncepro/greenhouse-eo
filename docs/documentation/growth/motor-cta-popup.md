# Motor de CTAs y Popups — Foundation `growth.cta`

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-07-17 por Claude (TASK-1339)
> **Ultima actualizacion:** 2026-07-18 por Claude (TASK-1340 — renderer portable + gobernanza en Growth + capa GTM)
> **Documentacion tecnica:** [GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md)

## Qué es

El motor de CTAs es el sistema que decide **qué invitación a la acción (prompt de conversión) se muestra en cada página pública** de Efeonce (sitio WordPress, Think y futuras superficies), con gobernanza central en Greenhouse. En vez de pegar botones o banners a mano en cada página, un operador define el CTA una vez, lo publica, y todas las superficies muestran **el mismo contrato publicado**.

TASK-1339 entregó la **fundación server-side** (definir, publicar, arbitrar, medir). TASK-1340 sumó: el **renderer portable** `<greenhouse-cta>` (Web Component sin frameworks, 3 variantes visuales gobernadas por dato + tokens re-tematizables por host), la **superficie de gobernanza en el menú Growth** (`/growth/ctas`: inventario, estado, pausar/publicar, preview) y la **capa de eventos hacia Google Tag Manager** (familia `greenhouse_cta_*` al dataLayer del host, con allowlist dura sin PII, registrada en el TRACKING-PLAN; los tags GA4 se publican gobernados en el flip).

## Cómo funciona (en simple)

1. **Un CTA se define y se versiona.** Cada versión tiene su texto, su ubicación (embebido, banner, popup…), su acción y sus reglas de dónde aparece. Una versión publicada **no se puede editar**: cualquier cambio crea una versión nueva. Así siempre se sabe exactamente qué vio el visitante.
2. **El servidor decide qué se muestra.** Cuando una página pregunta "¿qué CTA va aquí?", Greenhouse evalúa las reglas y responde con el resultado ya resuelto: **a lo sumo un prompt interruptivo** (popup/banner pegajoso) más los no-interruptivos que apliquen. El navegador nunca ve las reglas ni los candidatos descartados.
3. **La acción abre un Growth Form.** En esta primera versión la única acción soportada es abrir un formulario del motor Growth Forms (por ejemplo, el del AI Visibility Grader). El CTA solo guarda la referencia al form — nunca copia sus campos, validación ni consentimiento.
4. **La evidencia de conversión se guarda con desconfianza sana.** Los clics y conversiones que reporta el navegador quedan marcados como `browser_reported` (direccionales); solo lo confirmado por el servidor (`server_confirmed`) cuenta como conversión real en reportes. Los intentos forjados (superficie o versión falsa) se rechazan y quedan registrados sin datos personales.

> Detalle técnico: primitive en `src/lib/growth/ctas/` (contracts, store, arbiter, action-router, ingest, commands, readers); API pública `GET /api/public/growth/ctas/render` + `POST /api/public/growth/ctas/events`; API admin `/api/admin/growth/ctas/**`.

## Estado de despliegue

- Flag `GROWTH_CTA_ENGINE_ENABLED` **apagado en todos los ambientes** (las rutas responden "no disponible"). El encendido se coordina con TASK-1340: sin renderer, la fundación queda en shadow.
- El primer CTA real (`ai-visibility-report-followup`, invita al diagnóstico del AI Visibility Grader) ya está publicado en la base de datos con superficies registradas para WordPress y Think.

## Quién puede operarlo

| Acción | Capability |
| --- | --- |
| Ver CTAs, versiones y reportes | `growth.cta.read` |
| Crear/editar borradores | `growth.cta.author` |
| Publicar, deprecar, archivar y gestionar superficies | `growth.cta.publish` |
| Pausar/reanudar (freno de emergencia) | `growth.cta.pause` |

Los cuatro se otorgan hoy a roles internos (admin, account, operations); los roles de cliente no ven el motor. `pause` es una capability separada a propósito: frenar un CTA problemático no exige autoridad de publicación.

## Señales de salud

Visibles en `/admin/operations` (módulo Growth): errores de render, errores de ingest, intentos no autorizados/forjados y handoffs rotos hacia formularios (CTA publicado apuntando a un form que ya no existe — se excluye del render y se alerta). Todas en steady 0.

> Detalle técnico: [src/lib/reliability/queries/growth-cta-signals.ts](../../../src/lib/reliability/queries/growth-cta-signals.ts).
