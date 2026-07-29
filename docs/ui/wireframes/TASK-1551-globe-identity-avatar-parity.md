# TASK-1551 — Globe Identity Avatar Parity Wireframe

## Meta

- Owner task: `TASK-1551`.
- Visual direction mode: `repo-native-benchmark` — extensión del trigger/panel de cuenta existente de Globe.
- Intended consumers: usuarios autenticados de Globe internal-only.
- Primitive decision: `extend` el avatar circular existente; no nace un perfil ni una primitive nueva.

## Desktop Target — 1440×1000

```text
┌ Globe. Producer ─────────────────────────────────────────────── [ foto | Nombre ▾ ] ┐
│                                                                  abre panel de cuenta │
└───────────────────────────────────────────────────────────────────────────────────────┘

Cuenta abierta
┌────────────────────────────┐
│ [ foto o iniciales ] Nombre │
│                   email     │
│ Cambiar espacio             │
└────────────────────────────┘
```

La foto ocupa siempre el mismo círculo. Si la media no existe, carga mal o la sesión deja de ser válida, el
círculo contiene iniciales; nunca muestra un icono roto ni desplaza nombre, email o el trigger.

## Mobile Target — 390×844

El header mantiene el mismo círculo y nombre accesible. El panel existente conserva su manejo de foco y no supera
el ancho del viewport; la foto es decorativa cuando el nombre está a su lado.

## State Matrix

| Estado | Trigger/panel | Regla |
|---|---|---|
| avatar presente | foto canónica | URL sólo same-origin Globe |
| cargando | iniciales dimensionadas | no shimmer ni layout shift |
| ausente | iniciales | estado normal, no error |
| media fallida | iniciales | sin detalle técnico ni reintento browser-side |
| sesión expirada/revocada | flujo existente + iniciales | nunca conservar foto como prueba de acceso |

## Accessibility Contract

- El trigger conserva `aria-label` con el nombre del usuario.
- La imagen es decorativa cuando hay nombre adyacente; las iniciales complementan el nombre cuando no lo hay.
- La foto no añade target de foco, acción, tooltip ni dependencia de color.
- A 390 px, trigger y panel conservan foco, touch target y `scrollWidth <= clientWidth`.

## Implementation Mapping

| Región | Decisión | Contrato de datos |
|---|---|---|
| trigger de cuenta | extender avatar actual con `img` opcional + iniciales | `GlobeUiIdentity.avatar` server-derived |
| panel de cuenta | reutilizar mismo descriptor y fallback | BFF same-origin, sin URL Greenhouse |
| sesión/BFF | resolver y servir bytes server-side | OAuth userinfo + reader self-only |

## GVC Scenario Plan

- Scenario: extender escenario Producer/cuenta de Globe.
- Viewports: `1440×1000`, `390×844`.
- Captures: avatar presente, ausente/media fallida y sesión expirada con panel abierto.
- Assertions: nombre accesible, diámetro estable, sin imagen rota, sin token/`gs://`/URL privada en DOM y sin overflow.
- Baseline: no aplica baseline nuevo; compara la cuenta actual con su extensión compatible.

## Design Decision Log

- Decisión: foto canónica por BFF same-origin y fallback de iniciales.
- Alternativas rechazadas: hardcode, Graph/GCS browser-side, URL privada/signed URL persistente y copia de avatar en Globe.
- Rationale: una fuente de identidad, authz server-side y degradación silenciosa sin romper la cuenta existente.
