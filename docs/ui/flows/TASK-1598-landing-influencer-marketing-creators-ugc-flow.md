# TASK-1598 — Landing Influencer Marketing — Flow Contract

## Meta

- Status: `implemented`
- Owner task: `TASK-1598`
- Surface: `/servicios/agencia-de-influencers/`
- Flow type: `multi-surface`: landing → brief form o meeting scheduler.

## Flow map

1. Usuario llega por orgánico, paid, referral o enlace interno.
2. Lee problema, mecanismo, oferta, derechos y prueba.
3. Elige `Agenda una reunión` o `Cuéntanos tu campaña`.
4. Meeting abre surface gobernada; el brief hace scroll/focus al form inline.
5. Submit produce success/error gobernado; reunión produce evento server-confirmed.
6. Commercial recibe una oportunidad calificada; el sistema conserva fuente y consentimiento.

## State and recovery

| Estado | Requisito |
|---|---|
| Ready | CTA dual visible y form con copy mínimo |
| Form loading | Skeleton/estado del renderer; no blank |
| Form partial/error | Mensaje honesto + retry + meeting como alternativa |
| Meeting unavailable | Scheduler mantiene recuperación propia; no mostrar link raw del proveedor |
| Success | Success card gobernada, sin promesa de plazo no pactada |
| Reduced motion | Ancla instantánea; contenido equivalente sin animación |

## Boundaries

- Landing no crea negocio ni copia la lógica de Growth Forms.
- No mandar nombres de creators, presupuesto o brief completo al dataLayer.
- No crear booking real durante QA visual.
- Registrar micro-events sólo después de revisar Tracking Plan.

## GVC

Capturar click de ambos CTAs, focus del form, error de submit, success card, meeting surface, FAQ y reduced motion en
1440/390, sin scroll horizontal ni errores de consola.
