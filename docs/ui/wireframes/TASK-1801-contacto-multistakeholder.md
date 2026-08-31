# TASK-1801 — Wireframe Contacto multistakeholder

Visual source: `docs/ui/visual-directions/TASK-1801-contacto-multistakeholder.md`
Product brief: `docs/public-site/CONTACT_PAGE_REBUILD_BRIEF_V1.md`
Status: planificación; `UI ready` permanece `no` hasta cerrar owners, SLA, form destination y binding Meetings.

## Desktop composition

```text
┌──────────────────── Ohio header existente ────────────────────┐
│ CONTACTO                                                       │
│ ¿En qué podemos ayudarte?                [Agendar reunión]     │
│ Cuéntanos qué necesitas.                                      │
├──────────────── superficie editorial dominante ───────────────┤
│ ¿Para qué quieres contactarnos?                               │
│ [Contratar] [Alianza] [Cliente] [Sugerencia] [Reclamo] [...]  │
│ Paso 1/2 · motivo             → campos condicionales           │
│ Paso 2/2 · mensaje y datos    → consentimiento separado        │
│                                      [Enviar mensaje]          │
├──────────────── banda institucional verificable ───────────────┤
│ Dirección Chile │ +56… │ +1… │ CL · US · CO · MX · PE         │
├──────────────── FAQ práctica + Ohio footer existente ──────────┤
└────────────────────────────────────────────────────────────────┘
```

La agenda abre la experiencia portable gobernada o navega a la superficie aprobada según el binding; el formulario
no desaparece y conserva el borrador cuando el usuario vuelve.

## Mobile 390 px

```text
[Ohio header]
CONTACTO
¿En qué podemos ayudarte?
[Enviar un mensaje]
[Agendar una reunión]

¿Para qué quieres contactarnos?
[selector accesible, valor completo]
Paso 1 de 2
[campo]
...
[Continuar / Enviar]

Dirección y canales
Países donde operamos
FAQ
[Ohio footer]
```

No hay tabs horizontales ni controles truncados. El orden de DOM coincide con la lectura visual.

## Content inventory

| Bloque | Copy/valor | Fuente |
| --- | --- | --- |
| H1 | ¿En qué podemos ayudarte? | brief V1 |
| Intro | Cuéntanos qué necesitas: conversar sobre un proyecto, explorar una alianza o compartir tu experiencia con Efeonce. | brief V1 |
| Motivos | contratar, alianza, cliente, sugerencia, reclamo, empleo, otra consulta | Growth Form versionado |
| Agenda | Agendar una reunión | CTA/Meetings canónico |
| Dirección | Dr. Manuel Barros Borgoño 71, oficina 1105, Providencia, Chile | `EFEONCE_LEGAL_ADDRESS_FALLBACK` + deck back cover |
| Teléfonos | +56 9 3732 3064 · +1 (239) 235-2073 | deck back cover |
| Mercados | Chile, Estados Unidos, Colombia, México y Perú | `EFEONCE_OPERATING_MARKETS` |
| SLA | No publicar hasta aprobación operativa | brief V1 |

## State inventory

- Default: motivo sin escoger; CTA Continuar deshabilitado con explicación accesible.
- Conditional: sólo campos del motivo activo; los ocultos no se validan ni envían.
- Loading: skeleton/estado contenido dentro del host sin mover el primer fold.
- Validation: resumen en live region y error enlazado a cada campo; foco al primer error.
- Submitting: CTA pending e idempotente; se evita doble envío.
- Success: confirmación del canal y expectativa aprobada; reclamo muestra referencia de seguimiento.
- Error: conserva borrador, permite reintentar y no expone errores técnicos.
- Degraded: si Meetings falla, formulario sigue operativo; si el form no carga, se muestran canales verificados.
- Long content: mensaje extenso conserva contador/límite explícito y no rompe layout.
- Permission denied: no aplica; superficie pública. Rate limit/captcha se explican sin culpar al usuario.
- Mobile: controles ≥44 px, valor completo y sin scroll horizontal.
- Keyboard: orden DOM, fieldsets/legends, foco visible, Escape sólo cierra diálogo de Meetings y restaura foco.
- Reduced motion: aparición instantánea de campos/pasos; nunca depende de animación.

## Interaction details

1. `Enviar un mensaje` enfoca el selector; `Agendar una reunión` activa Meetings sin submit previo.
2. Elegir motivo revela el conjunto correspondiente y limpia valores no comunes de un motivo abandonado.
3. Volver conserva nombre, email, país y mensaje cuando siguen siendo válidos.
4. Reclamo y sugerencia nunca exigen empresa, teléfono, presupuesto ni reunión.
5. Consentimiento operacional/legal y marketing son controles separados; marketing no viene preseleccionado.
6. Éxito sólo ocurre tras receipt del submit. Booking sólo confirma con receipt server-side.

## Implementation Mapping

- Surface: WordPress `/contacto/`, page/post id a verificar en discovery autenticado.
- Host: Elementor modular/Ohio, sin header/footer paralelos y con CSS page-scoped.
- Form: widget `greenhouse_growth_form` → `<greenhouse-form form-key="…" surface="…" locale="es-CL">`.
- Contract: `src/lib/growth/forms/contracts.ts`, commands/readers y APIs públicas existentes.
- Conditions: renderer `conditional_simple`; evaluar `multi_step_light` sin modificar el motor si el contrato existente
  cubre el flujo.
- Scheduler: `open_meeting_scheduler` + `meetingSurfaceId`/`schedulerKey`; binding específico de Contacto.
- Copy: definición de formulario versionada + copy editorial del documento Elementor; valores institucionales desde
  `src/config/efeonce-brand.ts` y back cover canónico.
- Tracking: convención `gh_*`, sin PII; evento de booking confirmado sólo desde receipt.
- Access: público; CORS/origin, Turnstile, rate limit y policy server-side existentes.
- Repo/runtime: Greenhouse gobierna Forms/Meetings; WordPress es host, no writer de destinos o secretos.

## GVC Scenario Plan

- Scenario: `scripts/frontend/scenarios/public-site-contacto-task-1801.json` a crear durante implementación.
- Route: `https://efeoncepro.com/contacto/` en staging/candidato y live tras aprobación.
- Viewports: 1440×1100, 890×1100, 390×844; incluir altura corta en 1280×720.
- Quality profile: `premium`.
- Captures: first fold; cada motivo; validación; reclamo; sugerencia; submit pending/success/error; Meetings abierto,
  unavailable y confirmed; banda institucional; FAQ.
- Markers: hero, reason selector, form host, agenda CTA/dialog, institutional strip, success receipt.
- Assertions: valor de selector completo; campos ocultos ausentes de validación/payload; foco; live regions; CTA state;
  teléfonos/dirección/mercados exactos; no PII en dataLayer.
- Overflow: `scrollWidth === clientWidth` en todos los viewports y con select/listbox abierto.
- Reduced motion/focus: emulación `prefers-reduced-motion`, recorrido sólo teclado y restauración al cerrar agenda.
- Dossier: `docs/ui/reviews/TASK-1801-contacto-multistakeholder/`.
- Baseline: capturar página actual como baseline negativo factual; no copiar su composición o datos obsoletos.

## Design Decision Log

- Selección: recepción editorial con formulario dominante y agenda secundaria visible.
- Alternativas: directorio por stakeholder y split 50/50, rechazadas por card soup y sesgo comercial.
- Primitive: `reuse`; Growth Forms y Meetings poseen interacción y estado. Elementor sólo compone el host.
- Motion: `none` como requisito nuevo; se acepta feedback mínimo ya provisto por primitives con reduced motion.
- Nav placement: `none`; reemplaza un destino existente.
- Riesgos: owners/SLA, destino HubSpot, tratamiento de reclamos, binding de Meetings y publicación de claims.
